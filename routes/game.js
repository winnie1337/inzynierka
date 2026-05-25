/**
 * Routing gry
 * Obsługa rozpoczęcia gry, decyzji gracza, systemu liczenia kart
 */

const express = require('express');
const BlackjackGame = require('../game/blackjack');
const BasicStrategyAI = require('../game/basicStrategy');
const CardCountingTrainer = require('../game/cardCounting');
const db = require('../database/db');
const OpenAI = require('openai');

const router = express.Router();

// Inicjalizacja OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Przykład aktywnej gry - w produkcji użyj w pamięci lub redis
let activeGames = {};
let ai = new BasicStrategyAI();
let countingTrainer = new CardCountingTrainer();

// Inicjalizacja nowej gry
router.post('/new-game', (req, res) => {
  try {
    const { numHands = 1, bet, bets, numDecks = 6 } = req.body;
    const userId = req.session.userId;

    console.log('📥 Otrzymano request /new-game:');
    console.log('   numHands:', numHands);
    console.log('   bet:', bet);
    console.log('   bets:', bets);
    console.log('   numDecks:', numDecks);

    const gameId = `game_${userId}_${Date.now()}`;
    const game = new BlackjackGame(numDecks);

    game.startNewGame(numHands);
    
    // Ustaw zakład dla każdej ręki
    if (bets && Array.isArray(bets)) {
      // Nowy system - tablica zakładów
      console.log('🎰 Ustawianie zakładów z tablicy:', bets);
      game.playerHands.forEach((hand, index) => {
        hand.bet = bets[index] || 10;
        console.log(`   Ręka ${index + 1}: zakład = $${hand.bet}`);
      });
    } else {
      // Stary system - jeden zakład dla wszystkich
      console.log('🎰 Ustawianie pojedynczego zakładu:', bet);
      game.playerHands.forEach((hand, index) => {
        hand.bet = bet || 10;
        console.log(`   Ręka ${index + 1}: zakład = $${hand.bet}`);
      });
    }
    
    const gameState = game.getGameState();

    // Zachowaj grę w pamięci
    activeGames[gameId] = {
      game,
      userId,
      createdAt: Date.now()
    };

    // Reset licznika dla nowej gry
    countingTrainer.reset();

    res.json({
      gameId,
      gameState,
      message: 'Nowa gra została rozpoczęta!'
    });

  } catch (error) {
    console.error('Błąd rozpoczynania gry:', error);
    res.status(500).json({ error: 'Błąd podczas rozpoczynania gry' });
  }
});

// Wykonanie akcji gracza
router.post('/action/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const { action, handIndex = 0 } = req.body;
    const userId = req.session.userId;

    const gameData = activeGames[gameId];
    if (!gameData || gameData.userId !== userId) {
      return res.status(404).json({ error: 'Gra nie została odnaleziona' });
    }

    const game = gameData.game;
    let result;
    let evaluation;
    let newCards = [];

    // OCENA PRZED AKCJĄ - zapisz stan przed wykonaniem
    const hand = game.playerHands[handIndex];
    const cardsBefore = [...hand.cards]; // kopia kart przed akcją
    
    // Ocena decyzji przez AI PRZED wykonaniem akcji
    evaluation = ai.evaluateDecision(
      action,
      cardsBefore, // karty PRZED akcją
      game.dealerHand[0],
      game.canDouble(handIndex),
      game.canSplit(handIndex),
      game.canSurrender(handIndex)
    );

    // Zapisz statystyki
    if (evaluation.isCorrect) {
      db.updateGameStats(userId, { total_decisions: 1, correct_decisions: 1 });
    } else {
      db.updateGameStats(userId, { total_decisions: 1, wrong_decisions: 1 });
    }

    // Wykonaj akcję
    switch (action.toLowerCase()) {
      case 'hit':
        result = game.hit(handIndex);
        newCards = result.hand.cards.slice(-1);
        break;
      case 'stand':
        result = game.stand(handIndex);
        break;
      case 'double':
        result = game.double(handIndex);
        newCards = result.hand.cards.slice(-1);
        break;
      case 'split':
        result = game.split(handIndex);
        newCards = result.newHand.cards.slice(1);
        break;
      case 'surrender':
        result = game.surrender(handIndex);
        break;
      default:
        return res.status(400).json({ error: 'Nieprawidłowa akcja' });
    }

    // Zaktualizuj licznik jeśli dodano nowe karty
    if (newCards.length > 0) {
      countingTrainer.updateCount(newCards);
    }

    // Pobierz aktualny stan gry
    const currentState = game.getGameState();

    // Dodaj informacje o liczeniu kart
    const countInfo = countingTrainer.getCount();

    // Jeśli gra się zakończyła, zapisz wyniki
    if (currentState.gameState === 'finished') {
      const results = game.getResults();
      let totalHands = 0, totalWins = 0, totalLosses = 0, totalPushes = 0;

      results.forEach(result => {
        totalHands++;
        if (result.result === 'win' || result.result === 'blackjack') totalWins++;
        else if (result.result === 'lose') totalLosses++;
        else if (result.result === 'push') totalPushes++;
      });

      db.updateGameStats(userId, {
        hands_played: totalHands,
        hands_won: totalWins,
        hands_lost: totalLosses,
        hands_pushed: totalPushes
      });

      // Usuń zakończoną grę
      delete activeGames[gameId];
    }

    res.json({
      gameState: currentState,
      evaluation,
      counting: countInfo,
      results: currentState.gameState === 'finished' ? game.getResults() : null
    });

  } catch (error) {
    console.error('Błąd wykonania akcji:', error);
    res.status(500).json({ error: 'Błąd podczas wykonania akcji' });
  }
});

// Pobierz stan gry
router.get('/state/:gameId', (req, res) => {
  const { gameId } = req.params;
  const userId = req.session.userId;

  const gameData = activeGames[gameId];
  if (!gameData || gameData.userId !== userId) {
    return res.status(404).json({ error: 'Gra nie została odnaleziona' });
  }

  const gameState = gameData.game.getGameState();
  const countInfo = countingTrainer.getCount();

  res.json({
    gameState,
    counting: countInfo
  });
});

// Liczenie kart - dodaj karty do licznika
router.post('/count-cards', (req, res) => {
  try {
    const { cards } = req.body;

    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Karty muszą być tablicą' });
    }

    countingTrainer.updateCount(cards);
    const countInfo = countingTrainer.getCount();

    res.json({
      countInfo,
      message: 'Licznik został zaktualizowany'
    });

  } catch (error) {
    console.error('Błąd liczenia kart:', error);
    res.status(500).json({ error: 'Błąd podczas liczenia kart' });
  }
});

// Reset licznika
router.post('/reset-count', (req, res) => {
  countingTrainer.reset();
  res.json({ message: 'Licznik został zresetowany' });
});

// Pobierz aktualny count
router.get('/count', (req, res) => {
  const countInfo = countingTrainer.getCount();
  const bettingAdvice = countingTrainer.getBettingAdvice();

  res.json({
    countInfo,
    bettingAdvice
  });
});

// Ocena liczenia kart gracza
router.post('/evaluate-count', (req, res) => {
  try {
    const { runningCount, trueCount } = req.body;
    const userId = req.session.userId;

    if (typeof runningCount !== 'number' || typeof trueCount !== 'number') {
      return res.status(400).json({ error: 'Running Count i True Count muszą być liczbami' });
    }

    const evaluation = countingTrainer.evaluatePlayerCount(runningCount, trueCount);

    // Zapisz statystyki
    if (evaluation.isCorrect) {
      db.updateCountingStats(userId, true);
    } else {
      db.updateCountingStats(userId, false);
    }

    res.json({
      evaluation,
      message: evaluation.isCorrect ? 'Świetnie obliczony count!' : 'Sprawdź swoje obliczenia'
    });

  } catch (error) {
    console.error('Błąd oceny count:', error);
    res.status(500).json({ error: 'Błąd podczas oceny liczenia kart' });
  }
});

// Pobierz poradę dotyczącą Basic Strategy
router.get('/strategy-tip', (req, res) => {
  const tip = ai.getRandomTip();
  const countingTip = countingTrainer.getRandomCountingTip();

  res.json({
    strategyTip: tip,
    countingTip: countingTip
  });
});

// Chat z prawdziwym AI (OpenAI)
router.post('/ask-ai', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Brak pytania' });
    }

    // Wywołanie OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem od blackjacka i ekspertem od nauki gry w blackjacka. Specjalizujesz się w Basic Strategy i liczeniu kart (Hi-Lo). Odpowiadaj konkretnie, jasno i zwięźle po polsku. Pomagasz graczom poprawiać ich umiejętności w blackjacku."
        },
        {
          role: "user",
          content: question
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer });

  } catch (error) {
    console.error('Błąd OpenAI:', error);
    res.status(500).json({ 
      error: 'Błąd podczas generowania odpowiedzi',
      answer: 'Przepraszam, wystąpił błąd. Spróbuj ponownie lub zadaj inne pytanie.'
    });
  }
});

module.exports = router;
