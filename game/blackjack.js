/**
 * Logika gry w Blackjacka
 * Obsługa talii, rozdawania, punktów i zasad gry
 */

class BlackjackGame {
  constructor(numDecks = 6) {
    this.numDecks = numDecks;
    this.deck = [];
    this.playerHands = [];
    this.dealerHand = [];
    this.currentHandIndex = 0;
    this.gameState = 'betting'; // betting, playing, dealer, finished
    this.initializeDeck();
  }

  // Inicjalizacja talii kart
  initializeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    this.deck = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (let suit of suits) {
        for (let rank of ranks) {
          this.deck.push({ rank, suit, value: this.getCardValue(rank) });
        }
      }
    }
    this.shuffleDeck();
  }

  // Tasowanie talii
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // Wartość karty (dla Hi-Lo counting)
  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
  }

  // Zwraca wartość dla systemu liczenia Hi-Lo
  getCountValue(rank) {
    if (['2', '3', '4', '5', '6'].includes(rank)) return 1;
    if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) return -1;
    return 0; // 7, 8, 9
  }

  // Dobieranie karty
  drawCard() {
    if (this.deck.length < 20) {
      this.initializeDeck(); // Przetasuj gdy zostaje mało kart
    }
    return this.deck.pop();
  }

  // Obliczanie wartości ręki
  calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (let card of hand) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    // Dostosowanie wartości asów
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  // Rozpoczęcie nowej gry
  startNewGame(numHands = 1) {
    if (numHands < 1 || numHands > 4) {
      throw new Error('Liczba rąk musi być od 1 do 4');
    }

    this.playerHands = [];
    for (let i = 0; i < numHands; i++) {
      const cards = [this.drawCard(), this.drawCard()];
      this.playerHands.push({
        cards: cards,
        bet: 0, // Będzie ustawione przez routes/game.js
        standing: false,
        busted: false,
        doubled: false,
        surrendered: false
      });
    }

    this.dealerHand = [this.drawCard(), this.drawCard()];
    this.currentHandIndex = 0;
    this.gameState = 'playing';

    // Automatyczne przejście przy blackjacku
    this.checkAndHandleBlackjacks();

    return {
      playerHands: this.playerHands,
      dealerHand: this.dealerHand,
      dealerUpCard: this.dealerHand[0],
      currentHandIndex: this.currentHandIndex
    };
  }

  // Sprawdź i obsłuż blackjacki po rozdaniu
  checkAndHandleBlackjacks() {
    // Sprawdź każdą rękę gracza
    for (let i = 0; i < this.playerHands.length; i++) {
      const hand = this.playerHands[i];
      if (this.isBlackjack(hand.cards)) {
        hand.standing = true; // Automatycznie stand na blackjacku
      }
    }

    // Znajdź pierwszą rękę która nie jest standing
    while (this.currentHandIndex < this.playerHands.length) {
      const hand = this.playerHands[this.currentHandIndex];
      if (!hand.standing && !hand.busted && !hand.surrendered) {
        return; // Znaleziono aktywną rękę
      }
      this.currentHandIndex++;
    }

    // Jeśli wszystkie ręce mają blackjacka, przejdź do dealera
    if (this.currentHandIndex >= this.playerHands.length) {
      this.gameState = 'dealer';
      this.playDealerHand();
    }
  }

  // Akcja: Hit
  hit(handIndex = this.currentHandIndex) {
    if (this.gameState !== 'playing') {
      throw new Error('Nie można dobierać kart w tym momencie');
    }

    const hand = this.playerHands[handIndex];
    if (hand.standing || hand.busted || hand.surrendered) {
      throw new Error('Ta ręka nie może już dobierać kart');
    }

    hand.cards.push(this.drawCard());
    const value = this.calculateHandValue(hand.cards);

    if (value > 21) {
      hand.busted = true;
      this.moveToNextHand();
    } else if (value === 21) {
      // Automatyczny stand przy 21
      hand.standing = true;
      this.moveToNextHand();
    }

    return {
      hand,
      value,
      busted: hand.busted
    };
  }

  // Akcja: Stand
  stand(handIndex = this.currentHandIndex) {
    if (this.gameState !== 'playing') {
      throw new Error('Nie można stanąć w tym momencie');
    }

    const hand = this.playerHands[handIndex];
    hand.standing = true;
    this.moveToNextHand();

    return { success: true };
  }

  // Akcja: Double Down
  double(handIndex = this.currentHandIndex) {
    const hand = this.playerHands[handIndex];
    
    if (hand.cards.length !== 2) {
      throw new Error('Double możliwe tylko na pierwszych dwóch kartach');
    }

    hand.cards.push(this.drawCard());
    hand.doubled = true;
    hand.standing = true;
    hand.bet *= 2;

    const value = this.calculateHandValue(hand.cards);
    if (value > 21) {
      hand.busted = true;
    }

    this.moveToNextHand();

    return {
      hand,
      value,
      busted: hand.busted
    };
  }

  // Akcja: Split
  split(handIndex = this.currentHandIndex) {
    const hand = this.playerHands[handIndex];
    
    if (hand.cards.length !== 2) {
      throw new Error('Split możliwy tylko na dwóch kartach');
    }

    if (hand.cards[0].rank !== hand.cards[1].rank) {
      throw new Error('Split możliwy tylko na parze');
    }

    // Utworzenie nowej ręki
    const newHand = {
      cards: [hand.cards.pop(), this.drawCard()],
      bet: hand.bet,
      standing: false,
      busted: false,
      doubled: false,
      surrendered: false
    };

    hand.cards.push(this.drawCard());

    // Wstawiamy nową rękę za aktualną
    this.playerHands.splice(handIndex + 1, 0, newHand);

    return {
      originalHand: hand,
      newHand,
      success: true
    };
  }

  // Akcja: Surrender
  surrender(handIndex = this.currentHandIndex) {
    const hand = this.playerHands[handIndex];
    
    if (hand.cards.length !== 2) {
      throw new Error('Surrender możliwy tylko na pierwszych dwóch kartach');
    }

    hand.surrendered = true;
    hand.standing = true;
    this.moveToNextHand();

    return { success: true };
  }

  // Przejście do następnej ręki
  moveToNextHand() {
    this.currentHandIndex++;
    
    // Sprawdź czy są kolejne ręce do zagrania
    while (this.currentHandIndex < this.playerHands.length) {
      const hand = this.playerHands[this.currentHandIndex];
      if (!hand.standing && !hand.busted && !hand.surrendered) {
        return;
      }
      this.currentHandIndex++;
    }

    // Wszystkie ręce zagrane - czas na dealera
    this.gameState = 'dealer';
    this.playDealerHand();
  }

  // Dealer gra swoją rękę
  playDealerHand() {
    // Dealer dobiera do 17
    while (this.calculateHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.drawCard());
    }

    this.gameState = 'finished';
  }

  // Sprawdzenie czy można wykonać akcję
  canDouble(handIndex = this.currentHandIndex) {
    if (handIndex >= this.playerHands.length || this.gameState !== 'playing') return false;
    const hand = this.playerHands[handIndex];
    return hand && hand.cards.length === 2 && !hand.standing;
  }

  canSplit(handIndex = this.currentHandIndex) {
    if (handIndex >= this.playerHands.length || this.gameState !== 'playing') return false;
    const hand = this.playerHands[handIndex];
    return hand && hand.cards.length === 2 && 
           hand.cards[0].rank === hand.cards[1].rank &&
           this.playerHands.length < 4;
  }

  canSurrender(handIndex = this.currentHandIndex) {
    if (handIndex >= this.playerHands.length || this.gameState !== 'playing') return false;
    const hand = this.playerHands[handIndex];
    return hand && hand.cards.length === 2 && !hand.standing;
  }

  // Sprawdź czy to blackjack
  isBlackjack(hand) {
    return hand.length === 2 && this.calculateHandValue(hand) === 21;
  }

  // Obliczenie wyników
  getResults() {
    const dealerValue = this.calculateHandValue(this.dealerHand);
    const dealerBusted = dealerValue > 21;
    const dealerBlackjack = this.isBlackjack(this.dealerHand);
    const results = [];

    for (let hand of this.playerHands) {
      if (hand.surrendered) {
        results.push({
          result: 'surrender',
          payout: -hand.bet / 2,
          playerValue: this.calculateHandValue(hand.cards),
          dealerValue
        });
        continue;
      }

      const playerValue = this.calculateHandValue(hand.cards);
      const playerBlackjack = this.isBlackjack(hand.cards);

      if (hand.busted) {
        // Bust - tracisz zakład (już odjęty przez frontend)
        results.push({
          result: 'lose',
          payout: 0,
          playerValue,
          dealerValue
        });
      } else if (playerBlackjack && !dealerBlackjack) {
        // Blackjack gracza - zwrot zakładu + wypłata 3:2
        results.push({
          result: 'blackjack',
          payout: hand.bet + (hand.bet * 1.5),
          playerValue,
          dealerValue
        });
      } else if (dealerBlackjack && !playerBlackjack) {
        // Dealer ma blackjacka - tracisz zakład
        results.push({
          result: 'lose',
          payout: 0,
          playerValue,
          dealerValue
        });
      } else if (playerBlackjack && dealerBlackjack) {
        // Oba blackjacki - zwrot zakładu
        results.push({
          result: 'push',
          payout: hand.bet,
          playerValue,
          dealerValue
        });
      } else if (dealerBusted) {
        // Dealer bust - zwrot zakładu + wygrana 1:1
        results.push({
          result: 'win',
          payout: hand.bet * 2,
          playerValue,
          dealerValue
        });
      } else if (playerValue > dealerValue) {
        // Wygrywasz - zwrot zakładu + wygrana 1:1
        results.push({
          result: 'win',
          payout: hand.bet * 2,
          playerValue,
          dealerValue
        });
      } else if (playerValue < dealerValue) {
        // Przegrywasz - tracisz zakład
        results.push({
          result: 'lose',
          payout: 0,
          playerValue,
          dealerValue
        });
      } else {
        // Remis - zwrot zakładu
        results.push({
          result: 'push',
          payout: hand.bet,
          playerValue,
          dealerValue
        });
      }
    }

    return results;
  }

  // Zwrócenie aktualnego stanu gry
  getGameState() {
    return {
      playerHands: this.playerHands,
      dealerHand: this.dealerHand,
      dealerUpCard: this.dealerHand[0],
      currentHandIndex: this.currentHandIndex,
      gameState: this.gameState,
      canDouble: this.canDouble(),
      canSplit: this.canSplit(),
      canSurrender: this.canSurrender()
    };
  }
}

module.exports = BlackjackGame;
