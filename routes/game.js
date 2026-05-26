/**
 * Routing gry
 * Obsługa rozpoczęcia gry, decyzji gracza, systemu liczenia kart
 */

const express = require('express');
const BlackjackGame = require('../game/blackjack');
const BasicStrategyAI = require('../game/basicStrategy');
const CardCountingTrainer = require('../game/cardCounting');
const db = require('../database/db');

const router = express.Router();

// Uwaga: czat AI obsługiwany jest przez routes/chat.js (Groq, model llama-3.3-70b-versatile).
// Dawny endpoint /api/game/ask-ai (OpenAI) został usunięty.

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
    // Reset licznika na początku gry - ustawi też prawidłową liczbę talii
    countingTrainer.reset();

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

    // Zachowaj grę w pamięci (zapisujemy też numDecks aby licznik znał liczbę talii)
    activeGames[gameId] = {
      game,
      userId,
      numDecks,
      createdAt: Date.now()
    };

    // Przelicz licznik na podstawie widocznych kart początkowego rozdania.
    // Liczy karty wszystkich rąk gracza + tylko upcard dealera (druga karta jest zakryta).
    countingTrainer.recomputeFromGameState(gameState, numDecks);

    res.json({
      gameId,
      gameState,
      counting: countingTrainer.getCount(),
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
    const numDecks = gameData.numDecks || 6;
    let result;
    let evaluation;

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
        break;
      case 'stand':
        result = game.stand(handIndex);
        break;
      case 'double':
        result = game.double(handIndex);
        break;
      case 'split':
        result = game.split(handIndex);
        break;
      case 'surrender':
        result = game.surrender(handIndex);
        break;
      default:
        return res.status(400).json({ error: 'Nieprawidłowa akcja' });
    }

    // Pobierz aktualny stan gry
    const currentState = game.getGameState();

    // Przelicz licznik na podstawie wszystkich widocznych kart w obecnym stanie gry.
    // To gwarantuje, że żadna karta nie zostanie pominięta - również karty dealera odsłonięte
    // po zakończeniu rundy (gdy dealer dobiera) są uwzględnione w running countcie.
    countingTrainer.recomputeFromGameState(currentState, numDecks);
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

module.exports = router;
