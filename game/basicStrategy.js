/**
 * Blackjack Basic Strategy AI
 * Zawiera kompletną strategię podstawową i ocenę decyzji gracza
 */

class BasicStrategyAI {
  constructor() {
    // Strategia dla twardych rąk (bez asa lub as liczony jako 1)
    this.hardStrategy = {
      // [suma gracza][karta dealera 2-11 (A)]
      '5': ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
      '6': ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
      '7': ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
      '8': ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
      '9': ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      '10': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
      '11': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
      '12': ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
      '13': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
      '14': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
      '15': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'R', 'H'],
      '16': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'R', 'R', 'R'],
      '17': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
      '18': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
      '19': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
      '20': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
      '21': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
    };

    // Strategia dla miękkich rąk (as liczony jako 11)
    this.softStrategy = {
      'A,2': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      'A,3': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      'A,4': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      'A,5': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      'A,6': ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
      'A,7': ['S', 'D', 'D', 'D', 'D', 'S', 'S', 'H', 'H', 'H'],
      'A,8': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
      'A,9': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
    };

    // Strategia dla par
    this.pairStrategy = {
      'A,A': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      '2,2': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
      '3,3': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
      '4,4': ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
      '5,5': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
      '6,6': ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
      '7,7': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
      '8,8': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      '9,9': ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
      '10,10': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
    };

    // Mapowanie akcji na pełne nazwy
    this.actionNames = {
      'H': 'Hit',
      'S': 'Stand',
      'D': 'Double',
      'P': 'Split',
      'R': 'Surrender'
    };

    // Komunikaty AI dla poprawnych decyzji
    this.correctMessages = [
      '✅ Świetnie! To była idealna decyzja według Basic Strategy!',
      '✅ Doskonale! Właśnie tak należy grać!',
      '✅ Perfekcyjnie! Doskonale znasz strategię!',
      '✅ Brawo! To był właściwy ruch!',
      '✅ Świetna gra! Trzymaj się tego!',
      '✅ Dokładnie! To jest optymalna decyzja w tej sytuacji!'
    ];
  }

  // Pobierz indeks karty dealera (0-9 dla kart 2-A)
  getDealerIndex(dealerCard) {
    const rank = dealerCard.rank;
    if (rank === 'A') return 9;
    if (['J', 'Q', 'K'].includes(rank)) return 8; // 10
    return parseInt(rank) - 2;
  }

  // Sprawdź czy ręka jest miękka (as liczony jako 11)
  isSoftHand(cards) {
    let hasAce = false;
    let value = 0;

    for (let card of cards) {
      if (card.rank === 'A') hasAce = true;
      value += card.value;
    }

    // Miękka ręka: ma asa i wartość <= 21 z asem liczonym jako 11
    return hasAce && value <= 21 && value !== 21;
  }

  // Sprawdź czy to para
  isPair(cards) {
    return cards.length === 2 && cards[0].rank === cards[1].rank;
  }

  // Oblicz wartość ręki
  getHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (let card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  // Pobierz klucz dla strategii miękkich rąk
  getSoftKey(cards) {
    let otherCard = 0;
    for (let card of cards) {
      if (card.rank !== 'A') {
        if (['J', 'Q', 'K'].includes(card.rank)) {
          otherCard = 10;
        } else {
          otherCard = parseInt(card.rank);
        }
        break;
      }
    }
    return `A,${otherCard}`;
  }

  // Pobierz klucz dla strategii par
  getPairKey(cards) {
    const rank = cards[0].rank;
    if (['J', 'Q', 'K'].includes(rank)) {
      return '10,10';
    }
    return `${rank},${rank}`;
  }

  // Główna funkcja - zwraca optymalną akcję
  getOptimalAction(playerCards, dealerCard, canDouble = true, canSplit = true, canSurrender = true) {
    const dealerIndex = this.getDealerIndex(dealerCard);
    let action;

    // 1. Sprawdź czy to para i możliwy split
    if (canSplit && this.isPair(playerCards)) {
      const pairKey = this.getPairKey(playerCards);
      action = this.pairStrategy[pairKey][dealerIndex];
      
      // Jeśli strategia mówi Split, zwróć to
      if (action === 'P') {
        return action;
      }
    }

    // 2. Sprawdź czy to miękka ręka
    if (this.isSoftHand(playerCards)) {
      const softKey = this.getSoftKey(playerCards);
      if (this.softStrategy[softKey]) {
        action = this.softStrategy[softKey][dealerIndex];
      } else {
        // Jeśli nie ma w tabeli (np. A,10 = 21), stań
        action = 'S';
      }
    } else {
      // 3. Twarda ręka
      const handValue = this.getHandValue(playerCards);
      const hardKey = handValue.toString();
      
      if (this.hardStrategy[hardKey]) {
        action = this.hardStrategy[hardKey][dealerIndex];
      } else if (handValue < 5) {
        action = 'H';
      } else {
        action = 'S';
      }
    }

    // 4. Zastąp akcje, jeśli nie są możliwe
    if (action === 'D' && !canDouble) {
      action = 'H'; // Jeśli nie można double, dobierz
    }
    
    if (action === 'R' && !canSurrender) {
      action = 'H'; // Jeśli nie można surrender, dobierz
    }

    return action;
  }

  // Ocena decyzji gracza
  evaluateDecision(playerAction, playerCards, dealerCard, canDouble, canSplit, canSurrender) {
    // Mapowanie akcji gracza na format strategii
    const actionMap = {
      'hit': 'H',
      'stand': 'S',
      'double': 'D',
      'split': 'P',
      'surrender': 'R'
    };

    const playerActionCode = actionMap[playerAction.toLowerCase()];
    const optimalAction = this.getOptimalAction(playerCards, dealerCard, canDouble, canSplit, canSurrender);

    const isCorrect = playerActionCode === optimalAction;
    
    return {
      isCorrect,
      playerAction: this.actionNames[playerActionCode] || playerAction,
      optimalAction: this.actionNames[optimalAction],
      feedback: this.generateFeedback(isCorrect, playerActionCode, optimalAction, playerCards, dealerCard)
    };
  }

  // Generowanie feedbacku dla gracza
  generateFeedback(isCorrect, playerAction, optimalAction, playerCards, dealerCard) {
    if (isCorrect) {
      return this.correctMessages[Math.floor(Math.random() * this.correctMessages.length)];
    }

    // Generuj szczegółowe wyjaśnienie błędu
    const handValue = this.getHandValue(playerCards);
    const dealerRank = dealerCard.rank === 'A' ? 'Asa' : 
                       ['J', 'Q', 'K'].includes(dealerCard.rank) ? '10' : dealerCard.rank;
    
    let explanation = `❌ Nieoptymalna decyzja. `;

    // Identyfikacja typu ręki
    let handType = '';
    if (this.isPair(playerCards) && playerCards.length === 2) {
      const rank = playerCards[0].rank;
      handType = `parę ${rank === 'A' ? 'Asów' : rank}`;
    } else if (this.isSoftHand(playerCards)) {
      handType = `miękką ${handValue}`;
    } else {
      handType = `twardą ${handValue}`;
    }

    explanation += `Masz ${handType} przeciwko ${dealerRank} dealera.\n\n`;

    // Wyjaśnienie optymalnej akcji
    const optimalName = this.actionNames[optimalAction];
    
    switch (optimalAction) {
      case 'H':
        explanation += `💡 Powinieneś **dobrać kartę (Hit)**. Ta ręka jest zbyt słaba, aby stać. Statystycznie masz większą szansę poprawy niż przegrania.`;
        break;
      case 'S':
        explanation += `💡 Powinieneś **stanąć (Stand)**. Ta ręka jest wystarczająco silna. Dobieranie kolejnej karty zwiększa ryzyko przekroczenia 21.`;
        break;
      case 'D':
        explanation += `💡 Powinieneś **podwoić (Double)**. To idealna sytuacja do podwojenia stawki - masz dobrą pozycję, a dealer jest w słabej sytuacji.`;
        break;
      case 'P':
        explanation += `💡 Powinieneś **rozdzielić (Split)**. Rozdzielenie tej pary da Ci lepsze szanse na wygraną w długim terminie.`;
        break;
      case 'R':
        explanation += `💡 Powinieneś **poddać się (Surrender)**. Ta ręka ma bardzo małe szanse na wygraną. Lepiej stracić połowę stawki niż całość.`;
        break;
    }

    return explanation;
  }

  // Losowa rada dla gracza
  getRandomTip() {
    const tips = [
      '💡 Zawsze rozdzielaj pary Asów i ósemek!',
      '💡 Nigdy nie rozdzielaj dziesiątek - masz już 20!',
      '💡 Podwajaj na 11, chyba że dealer ma Asa.',
      '💡 Jeśli dealer ma 4, 5 lub 6, jest w najsłabszej pozycji.',
      '💡 Miękkie ręki (z Asem) dają Ci więcej elastyczności - wykorzystaj to!',
      '💡 Surrender jest dobrą opcją na twardej 16 przeciwko 9, 10 lub Asowi dealera.',
      '💡 Nigdy nie bierz ubezpieczenia - matematycznie się nie opłaca.',
      '💡 Pamiętaj: Basic Strategy minimalizuje przewagę kasyna do około 0.5%!'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }
}

module.exports = BasicStrategyAI;
