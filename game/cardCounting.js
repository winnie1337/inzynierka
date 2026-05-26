/**
 * Moduł systemu liczenia kart (Hi-Lo)
 * Trenuje gracza w liczeniu kart i ocenia jego umiejętności
 */

class CardCountingTrainer {
  constructor() {
    this.runningCount = 0;
    this.trueCount = 0;
    this.cardsDealt = 0;
    this.numDecks = 6;
    this.totalCards = 52 * this.numDecks;
  }

  // Reset licznika
  reset() {
    this.runningCount = 0;
    this.trueCount = 0;
    this.cardsDealt = 0;
  }

  // Wartość karty w systemie Hi-Lo
  getHiLoValue(card) {
    const rank = card.rank;

    // Małe karty (2-6): +1
    if (['2', '3', '4', '5', '6'].includes(rank)) {
      return 1;
    }

    // Neutralne (7-9): 0
    if (['7', '8', '9'].includes(rank)) {
      return 0;
    }

    // Wysokie (10, J, Q, K, A): -1
    if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) {
      return -1;
    }

    return 0;
  }

  // Aktualizacja licznika po rozdaniu kart (inkrementacyjnie)
  updateCount(cards) {
    for (let card of cards) {
      const value = this.getHiLoValue(card);
      this.runningCount += value;
      this.cardsDealt++;
    }

    // Oblicz True Count (zabezpieczamy się przed dzieleniem przez 0)
    const decksRemaining = (this.totalCards - this.cardsDealt) / 52;
    this.trueCount = decksRemaining > 0
      ? Math.round(this.runningCount / decksRemaining)
      : this.runningCount;
  }

  /**
   * Przelicz licznik na podstawie bieżącego stanu gry.
   * Liczy WSZYSTKIE karty widoczne dla gracza:
   *  - wszystkie karty z każdej ręki gracza (włącznie z dobranymi po hit/double/split),
   *  - karty dealera: tylko upcard gdy `gameState === 'playing'`, w innym razie cała ręka
   *    (dealer już odkrył kartę zakrytą i dobrał ewentualne kolejne).
   *
   * Dzięki tej metodzie licznik jest zawsze spójny z tym, co widzi gracz na stole,
   * niezależnie od tego, ile akcji zostało wykonanych.
   *
   * @param {Object} gameState - obiekt z BlackjackGame.getGameState()
   * @param {number} numDecks  - liczba talii w bieżącej grze
   */
  recomputeFromGameState(gameState, numDecks) {
    if (typeof numDecks === 'number' && numDecks > 0) {
      this.numDecks = numDecks;
      this.totalCards = 52 * numDecks;
    }

    let rc = 0;
    let count = 0;

    // Karty wszystkich rąk gracza
    if (Array.isArray(gameState?.playerHands)) {
      for (const hand of gameState.playerHands) {
        if (!hand || !Array.isArray(hand.cards)) continue;
        for (const card of hand.cards) {
          rc += this.getHiLoValue(card);
          count++;
        }
      }
    }

    // Karty dealera - w trakcie gry tylko upcard, w pozostałych stanach wszystkie
    if (Array.isArray(gameState?.dealerHand)) {
      const isPlaying = gameState.gameState === 'playing';
      const visibleDealerCards = isPlaying
        ? gameState.dealerHand.slice(0, 1)  // tylko pierwsza karta dealera
        : gameState.dealerHand;              // wszystkie odkryte
      for (const card of visibleDealerCards) {
        rc += this.getHiLoValue(card);
        count++;
      }
    }

    this.runningCount = rc;
    this.cardsDealt = count;

    const decksRemaining = (this.totalCards - this.cardsDealt) / 52;
    this.trueCount = decksRemaining > 0
      ? Math.round(this.runningCount / decksRemaining)
      : this.runningCount;
  }

  // Pobierz aktualny stan licznika
  getCount() {
    return {
      runningCount: this.runningCount,
      trueCount: this.trueCount,
      cardsDealt: this.cardsDealt,
      decksRemaining: Math.round((this.totalCards - this.cardsDealt) / 52 * 10) / 10
    };
  }

  // Ocena odpowiedzi gracza
  evaluatePlayerCount(playerRunningCount, playerTrueCount) {
    const actualRunningCount = this.runningCount;
    const actualTrueCount = this.trueCount;

    const runningCountError = Math.abs(playerRunningCount - actualRunningCount);
    const trueCountError = Math.abs(playerTrueCount - actualTrueCount);

    // Tolerancja: Running Count musi być dokładny, True Count +/-1
    const runningCountCorrect = runningCountError === 0;
    const trueCountCorrect = trueCountError <= 1;

    const isCorrect = runningCountCorrect && trueCountCorrect;

    return {
      isCorrect,
      runningCountCorrect,
      trueCountCorrect,
      actualRunningCount,
      actualTrueCount,
      runningCountError,
      trueCountError,
      feedback: this.generateCountingFeedback(
        isCorrect,
        runningCountCorrect,
        trueCountCorrect,
        playerRunningCount,
        playerTrueCount,
        actualRunningCount,
        actualTrueCount
      )
    };
  }

  // Generowanie feedbacku dla liczenia kart
  generateCountingFeedback(isCorrect, runningCorrect, trueCorrect, playerRC, playerTC, actualRC, actualTC) {
    if (isCorrect) {
      const praises = [
        '🎯 Doskonale! Twoje liczenie jest perfekcyjne!',
        '🎯 Brawo! Dokładnie tak! Masz talent do liczenia kart!',
        '🎯 Świetnie! Running Count i True Count są poprawne!',
        '🎯 Perfekcyjnie! Trzymaj ten poziom koncentracji!',
        '🎯 Excellent! Liczysz jak profesjonalista!'
      ];
      return praises[Math.floor(Math.random() * praises.length)];
    }

    let feedback = '❌ Niepoprawne liczenie.\n\n';

    if (!runningCorrect) {
      feedback += `🔢 **Running Count:** Twoja odpowiedź: ${playerRC}, Prawidłowa: ${actualRC}\n`;
      feedback += `Różnica: ${Math.abs(playerRC - actualRC)}\n\n`;

      if (playerRC > actualRC) {
        feedback += '💡 Policzyłeś za dużo. Sprawdź czy przypadkiem nie dodałeś wartości karty, która jest neutralna (7, 8, 9).\n';
      } else {
        feedback += '💡 Twój wynik jest za niski. Upewnij się, że zliczasz wszystkie karty według systemu Hi-Lo.\n';
      }
    }

    if (!trueCorrect) {
      feedback += `\n🎲 **True Count:** Twoja odpowiedź: ${playerTC}, Prawidłowa: ${actualTC}\n`;
      feedback += `💡 True Count = Running Count ÷ Liczba pozostałych talii\n`;
      feedback += `Pozostało około ${this.getCount().decksRemaining} talii.\n`;
    }

    feedback += '\n📚 **Przypomnienie systemu Hi-Lo:**\n';
    feedback += '• Karty 2-6: +1\n';
    feedback += '• Karty 7-9: 0\n';
    feedback += '• Karty 10-A: -1';

    return feedback;
  }

  // Rekomendacje zakładów na podstawie True Count
  getBettingAdvice() {
    const tc = this.trueCount;

    if (tc <= 0) {
      return {
        recommendation: 'minimum',
        multiplier: 1,
        advice: '📉 Count jest neutralny lub ujemny. Graj minimalną stawką lub rozważ przerwę.'
      };
    } else if (tc === 1) {
      return {
        recommendation: 'slight_increase',
        multiplier: 2,
        advice: '📊 Lekka przewaga. Możesz nieznacznie zwiększyć stawkę (2x minimum).'
      };
    } else if (tc === 2) {
      return {
        recommendation: 'moderate_increase',
        multiplier: 3,
        advice: '📈 Dobra sytuacja! Zwiększ stawkę do 3x minimum.'
      };
    } else if (tc >= 3) {
      return {
        recommendation: 'maximum',
        multiplier: 5,
        advice: '🚀 Doskonały moment! Masz znaczącą przewagę. Czas na większe zakłady (5x minimum)!'
      };
    }
  }

  // Losowa wskazówka dotycząca liczenia kart
  getRandomCountingTip() {
    const tips = [
      '💡 W systemie Hi-Lo jedynie 2-6 (+1) i 10-A (-1) mają wartość. Karty 7-9 to zero.',
      '💡 True Count = Running Count podzielony przez liczbę pozostałych talii.',
      '💡 Im wyższy True Count, tym więcej wysokich kart pozostało w talii.',
      '💡 Przy True Count +2 lub wyższym masz przewagę nad kasynem!',
      '💡 Praktykuj liczenie w domu używając jednej talii - to podstawa.',
      '💡 Liczenie kart NIE jest nielegalne, ale kasyna mogą Cię wyprosić.',
      '💡 Najlepsi gracze potrafią liczyć karty bez zauważalnego wysiłku.',
      '💡 Unikaj dużych zmian stawek - to zdradza liczenie kart.',
      '💡 W talii zostało mniej kart? True Count będzie bardziej ekstremalny.',
      '💡 Running Count sam w sobie nie daje pełnego obrazu - liczy się True Count!'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Sprawdź czy warto zagrać w tej sytuacji
  shouldPlay() {
    return this.trueCount >= 1;
  }

  // Modyfikacja Basic Strategy na podstawie Count
  getCountBasedAdvice(playerCards, dealerCard) {
    const tc = this.trueCount;

    // Przykładowe odchylenia od Basic Strategy przy wysokim count
    const advice = [];

    if (tc >= 3) {
      advice.push('💰 Przy tak wysokim True Count, rozważ zwiększenie zakładów.');
    }

    if (tc >= 2) {
      // Przy wysokim count częściej bierz ubezpieczenie (jeśli dealer ma A)
      if (dealerCard.rank === 'A') {
        advice.push('🛡️ Przy TC +2 lub wyższym, ubezpieczenie może być opłacalne.');
      }
    }

    if (tc <= -2) {
      advice.push('⚠️ Niski count - więcej małych kart w talii. Bądź ostrożny z agresywną grą.');
    }

    return advice;
  }
}

module.exports = CardCountingTrainer;
