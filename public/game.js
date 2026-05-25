/**
 * Blackjack Trainer - Frontend JavaScript
 * Obsługa interfejsu użytkownika i komunikacji z serwerem
 */

class BlackjackTrainer {
  constructor() {
    this.gameId = null;
    this.currentHandIndex = 0;
    this.gameState = null;
    this.countingMode = false;
    
    this.init();
  }

  // Inicjalizacja aplikacji
  init() {
    this.setupEventListeners();
    this.loadStats();
    this.showBettingScreen();
  }

  // Konfiguracja event listenerów
  setupEventListeners() {
    // Przycisk rozpoczęcia gry
    document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());

    // Przycisk nowej gry
    document.getElementById('new-game-btn').addEventListener('click', () => this.showBettingScreen());

    // Przyciski akcji
    document.getElementById('hit-btn').addEventListener('click', () => this.playerAction('hit'));
    document.getElementById('stand-btn').addEventListener('click', () => this.playerAction('stand'));
    document.getElementById('double-btn').addEventListener('click', () => this.playerAction('double'));
    document.getElementById('split-btn').addEventListener('click', () => this.playerAction('split'));
    document.getElementById('surrender-btn').addEventListener('click', () => this.playerAction('surrender'));

    // Przyciski AI
    document.getElementById('get-tip-btn').addEventListener('click', () => this.getTip());
    document.getElementById('counting-mode-btn').addEventListener('click', () => this.toggleCountingMode());

    // Modal liczenia kart
    document.getElementById('close-counting-btn').addEventListener('click', () => this.closeCountingModal());
    document.getElementById('submit-count-btn').addEventListener('click', () => this.submitCount());

    // Chat z AI
    document.getElementById('send-chat-btn').addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });
  }

  // Wyślij wiadomość do AI
  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const question = input.value.trim();
    
    if (!question) return;

    // Pokaż pytanie użytkownika
    this.addAIMessage(`<strong>Ty:</strong> ${question}`, 'info');
    input.value = '';

    try {
      const response = await fetch('/api/game/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (response.ok) {
        this.addAIMessage(`<strong>🤖 AI:</strong><br>${data.answer}`, 'info');
      } else {
        this.addAIMessage('❌ Nie mogę odpowiedzieć na to pytanie.', 'incorrect');
      }
    } catch (error) {
      console.error('Błąd komunikacji z AI:', error);
      this.addAIMessage('❌ Błąd połączenia z AI.', 'incorrect');
    }
  }

  // Pokaż ekran zakładów
  showBettingScreen() {
    document.getElementById('betting-section').style.display = 'block';
    document.querySelector('.game-controls').style.display = 'none';
    document.querySelector('.actions').style.display = 'none';
  }

  // Rozpocznij nową grę
  async startNewGame() {
    try {
      const numHands = parseInt(document.getElementById('num-hands').value) || 1;
      const numDecks = parseInt(document.getElementById('num-decks').value) || 6;

      const response = await fetch('/api/game/new-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numHands, numDecks })
      });

      const data = await response.json();

      if (response.ok) {
        this.gameId = data.gameId;
        this.gameState = data.gameState;
        this.currentHandIndex = 0;

        // Ukryj sekcję zakładów, pokaż akcje
        document.getElementById('betting-section').style.display = 'none';
        document.querySelector('.actions').style.display = 'flex';

        this.renderGame();
        this.addAIMessage('🎮 Nowa gra rozpoczęta! Powodzenia!', 'info');
        
        // Pobierz aktualny count
        this.updateCountDisplay();
      } else {
        this.showError(data.error || 'Błąd rozpoczęcia gry');
      }
    } catch (error) {
      console.error('Błąd rozpoczęcia gry:', error);
      this.showError('Błąd połączenia z serwerem');
    }
  }

  // Akcja gracza
  async playerAction(action) {
    if (!this.gameId) {
      this.showError('Rozpocznij nową grę!');
      return;
    }

    try {
      const response = await fetch(`/api/game/action/${this.gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, handIndex: this.currentHandIndex })
      });

      const data = await response.json();

      if (response.ok) {
        this.gameState = data.gameState;
        this.currentHandIndex = data.gameState.currentHandIndex;

        // Wyrenderuj grę
        this.renderGame();

        // Pokaż feedback od AI
        if (data.evaluation) {
          const messageClass = data.evaluation.isCorrect ? 'correct' : 'incorrect';
          this.addAIMessage(data.evaluation.feedback, 'feedback ' + messageClass);
        }

        // Zaktualizuj licznik kart
        if (data.counting) {
          this.updateCountDisplay(data.counting);
        }

        // Jeśli gra się skończyła
        if (data.gameState.gameState === 'finished' && data.results) {
          setTimeout(() => {
            this.showResults(data.results);
            this.loadStats(); // Odśwież statystyki
          }, 1000);
        }

      } else {
        this.showError(data.error || 'Błąd wykonania akcji');
      }
    } catch (error) {
      console.error('Błąd akcji gracza:', error);
      this.showError('Błąd połączenia z serwerem');
    }
  }

  // Renderowanie gry
  renderGame() {
    if (!this.gameState) return;

    // Wyrenderuj rękę dealera
    this.renderDealerHand();

    // Wyrenderuj ręce gracza
    this.renderPlayerHands();

    // Zaktualizuj przyciski
    this.updateActionButtons();

    // Zaktualizuj informacje o grze
    this.updateGameInfo();
  }

  // Renderuj rękę dealera
  renderDealerHand() {
    const dealerHandEl = document.getElementById('dealer-hand');
    dealerHandEl.innerHTML = '<div class="hand-label">Dealer:</div>';

    const cards = this.gameState.dealerHand;
    const isPlaying = this.gameState.gameState === 'playing';

    cards.forEach((card, index) => {
      const cardEl = this.createCardElement(card, isPlaying && index === 1);
      dealerHandEl.appendChild(cardEl);
    });

    // Wyświetl wartość ręki dealera (jeśli gra się skończyła)
    if (this.gameState.gameState === 'finished') {
      const value = this.calculateHandValue(cards);
      const valueEl = document.createElement('div');
      valueEl.className = 'hand-value';
      valueEl.textContent = `(${value})`;
      dealerHandEl.appendChild(valueEl);
    }
  }

  // Renderuj ręce gracza
  renderPlayerHands() {
    const playerHandsEl = document.getElementById('player-hands');
    playerHandsEl.innerHTML = '';

    this.gameState.playerHands.forEach((hand, index) => {
      const handEl = document.createElement('div');
      handEl.className = 'hand';
      handEl.dataset.handIndex = index;
      
      // Aktywna ręka
      if (index === this.currentHandIndex && this.gameState.gameState === 'playing') {
        handEl.classList.add('active-hand');
      }

      // Możliwość kliknięcia na rękę aby ją wybrać
      if (this.gameState.gameState === 'playing' && this.gameState.playerHands.length > 1) {
        handEl.style.cursor = 'pointer';
        handEl.addEventListener('click', () => {
          if (!hand.standing && !hand.busted && !hand.surrendered) {
            this.currentHandIndex = index;
            this.renderGame();
            this.addAIMessage(`Wybrano rękę ${index + 1}`, 'info');
          }
        });
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'hand-label';
      labelEl.textContent = `Ręka ${index + 1}`;
      handEl.appendChild(labelEl);

      // Kontener na karty
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'cards-container';
      hand.cards.forEach(card => {
        const cardEl = this.createCardElement(card, false);
        cardsContainer.appendChild(cardEl);
      });
      handEl.appendChild(cardsContainer);

      const value = this.calculateHandValue(hand.cards);
      const valueEl = document.createElement('div');
      valueEl.className = 'hand-value';
      valueEl.textContent = `${value}`;
      valueEl.style.color = hand.busted ? '#dc3545' : '#ffd700';
      handEl.appendChild(valueEl);

      if (hand.busted) {
        const bustEl = document.createElement('div');
        bustEl.textContent = 'BUST!';
        bustEl.style.color = '#dc3545';
        bustEl.style.fontWeight = 'bold';
        bustEl.style.fontSize = '14px';
        handEl.appendChild(bustEl);
      }

      if (hand.surrendered) {
        const surrenderEl = document.createElement('div');
        surrenderEl.textContent = 'SURRENDER';
        surrenderEl.style.color = '#f39c12';
        surrenderEl.style.fontWeight = 'bold';
        surrenderEl.style.fontSize = '14px';
        handEl.appendChild(surrenderEl);
      }

      playerHandsEl.appendChild(handEl);
    });
  }

  // Utwórz element karty
  createCardElement(card, hidden = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    if (hidden) {
      cardEl.classList.add('hidden');
      return cardEl;
    }

    // Dodaj klasę koloru
    if (card.suit === '♥' || card.suit === '♦') {
      cardEl.classList.add('suit-hearts');
    } else {
      cardEl.classList.add('suit-spades');
    }

    cardEl.innerHTML = `
      <div>${card.rank}${card.suit}</div>
    `;

    return cardEl;
  }

  // Oblicz wartość ręki - zwraca string z opcjami dla asa
  calculateHandValue(cards) {
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

    // Jeśli mamy asa i możemy liczyć go jako 11 bez przebicia
    if (aces > 0 && value <= 21) {
      const softValue = value;
      const hardValue = value - 10;
      
      // Pokaż obie wartości jeśli są różne i soft nie jest 21
      if (softValue !== hardValue && softValue !== 21) {
        return `${hardValue}/${softValue}`;
      }
    }

    // Dostosowanie asów jeśli wartość > 21
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  // Zaktualizuj przyciski akcji
  updateActionButtons() {
    const isPlaying = this.gameState && this.gameState.gameState === 'playing';

    document.getElementById('hit-btn').disabled = !isPlaying;
    document.getElementById('stand-btn').disabled = !isPlaying;
    document.getElementById('double-btn').disabled = !isPlaying || !this.gameState.canDouble;
    document.getElementById('split-btn').disabled = !isPlaying || !this.gameState.canSplit;
    document.getElementById('surrender-btn').disabled = !isPlaying || !this.gameState.canSurrender;
  }

  // Zaktualizuj informacje o grze
  updateGameInfo() {
    if (!this.gameState) return;

    const playerValue = this.gameState.playerHands[this.currentHandIndex] ?
      this.calculateHandValue(this.gameState.playerHands[this.currentHandIndex].cards) : 0;

    const dealerValue = this.gameState.gameState === 'finished' ?
      this.calculateHandValue(this.gameState.dealerHand) : '?';

    document.getElementById('player-value').textContent = playerValue;
    document.getElementById('dealer-value').textContent = dealerValue;
  }

  // Pokaż wyniki
  showResults(results) {
    let message = '🎲 <strong>Wyniki gry:</strong><br><br>';

    results.forEach((result, index) => {
      let icon, resultText;
      
      switch(result.result) {
        case 'blackjack':
          icon = '🎰';
          resultText = 'BLACKJACK!';
          break;
        case 'win':
          icon = '✅';
          resultText = 'WYGRANA';
          break;
        case 'lose':
          icon = '❌';
          resultText = 'PRZEGRANA';
          break;
        case 'push':
          icon = '🤝';
          resultText = 'REMIS';
          break;
        case 'surrender':
          icon = '🏳️';
          resultText = 'SURRENDER';
          break;
        default:
          icon = '❓';
          resultText = result.result.toUpperCase();
      }

      message += `${icon} Ręka ${index + 1}: <strong>${resultText}</strong><br>`;
      message += `Ty: ${result.playerValue}, Dealer: ${result.dealerValue}<br><br>`;
    });

    this.addAIMessage(message, 'info');
    
    // Pokaż przycisk nowej gry
    document.querySelector('.game-controls').style.display = 'block';
    document.getElementById('new-game-btn').textContent = '🎲 NOWA GRA';
    
    this.gameId = null;
  }

  // Dodaj wiadomość AI do chatu
  addAIMessage(message, type = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = message;

    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Pobierz poradę od AI
  async getTip() {
    try {
      const response = await fetch('/api/game/strategy-tip');
      const data = await response.json();

      this.addAIMessage(`<strong>💡 Porada:</strong><br>${data.strategyTip}`, 'info');
      
      if (this.countingMode) {
        this.addAIMessage(`<strong>🎲 Liczenie kart:</strong><br>${data.countingTip}`, 'info');
      }
    } catch (error) {
      console.error('Błąd pobierania porady:', error);
    }
  }

  // Przełącz tryb liczenia kart
  toggleCountingMode() {
    this.countingMode = !this.countingMode;
    const btn = document.getElementById('counting-mode-btn');
    
    if (this.countingMode) {
      btn.textContent = '🔢 Wyłącz liczenie kart';
      btn.style.background = '#28a745';
      // Ukryj wynik - gracz musi liczyć sam
      document.getElementById('counter-section').style.display = 'none';
      this.addAIMessage('🎲 <strong>Tryb liczenia kart włączony!</strong><br><br>Licznik został ukryty - musisz liczyć sam! Po każdej rozdaniu napisz na czacie:<br><br>"RC: [twoja wartość]"<br><br>Przykład: "RC: +5"<br><br>AI sprawdzi czy poprawnie liczysz!', 'info');
    } else {
      btn.textContent = '🔢 Włącz liczenie kart';
      btn.style.background = 'var(--table-green)';
      document.getElementById('counter-section').style.display = 'none';
    }
  }

  // Zaktualizuj wyświetlanie licznika
  async updateCountDisplay(countData = null) {
    if (!this.countingMode) return;

    try {
      if (!countData) {
        const response = await fetch('/api/game/count');
        const data = await response.json();
        countData = data.countInfo;
      }

      document.getElementById('running-count').textContent = countData.runningCount || 0;
      document.getElementById('true-count').textContent = countData.trueCount || 0;
      document.getElementById('decks-remaining').textContent = countData.decksRemaining?.toFixed(1) || '6.0';
    } catch (error) {
      console.error('Błąd aktualizacji licznika:', error);
    }
  }

  // Otwórz modal testowania liczenia
  openCountingModal() {
    document.getElementById('counting-modal').classList.add('active');
  }

  // Zamknij modal liczenia
  closeCountingModal() {
    document.getElementById('counting-modal').classList.remove('active');
  }

  // Wyślij odpowiedź count
  async submitCount() {
    const runningCount = parseInt(document.getElementById('rc-input').value) || 0;
    const trueCount = parseInt(document.getElementById('tc-input').value) || 0;

    try {
      const response = await fetch('/api/game/evaluate-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runningCount, trueCount })
      });

      const data = await response.json();

      if (response.ok) {
        const messageClass = data.evaluation.isCorrect ? 'correct' : 'incorrect';
        this.addAIMessage(data.evaluation.feedback, 'feedback ' + messageClass);
        this.closeCountingModal();
        this.loadStats();
      }
    } catch (error) {
      console.error('Błąd oceny count:', error);
    }
  }

  // Załaduj statystyki użytkownika
  async loadStats() {
    try {
      const response = await fetch('/api/stats/all');
      
      if (!response.ok) {
        console.error('Błąd pobierania statystyk:', response.status);
        return;
      }
      
      const data = await response.json();

      // Statystyki gry
      document.getElementById('accuracy-stat').textContent = `${data.gameStats.accuracy || 0}%`;
      document.getElementById('accuracy-stat-big').textContent = `${data.gameStats.accuracy || 0}%`;
      document.getElementById('decisions-stat').textContent = data.gameStats.correct_decisions || 0;
      document.getElementById('wrong-decisions-stat').textContent = data.gameStats.wrong_decisions || 0;
      document.getElementById('total-decisions-stat').textContent = data.gameStats.total_decisions || 0;
      document.getElementById('hands-stat').textContent = data.gameStats.hands_played || 0;
      document.getElementById('winrate-stat').textContent = `${data.gameStats.winRate || 0}%`;

      // Statystyki liczenia
      if (document.getElementById('counting-accuracy-stat')) {
        document.getElementById('counting-accuracy-stat').textContent = `${data.countingStats.accuracy || 0}%`;
      }
      if (document.getElementById('total-counts-stat')) {
        document.getElementById('total-counts-stat').textContent = data.countingStats.total_counts || 0;
      }
    } catch (error) {
      console.error('Błąd ładowania statystyk:', error);
      // Ustaw domyślne wartości przy błędzie
      document.getElementById('accuracy-stat').textContent = '0%';
      document.getElementById('accuracy-stat-big').textContent = '0%';
      document.getElementById('decisions-stat').textContent = '0';
      document.getElementById('wrong-decisions-stat').textContent = '0';
      document.getElementById('total-decisions-stat').textContent = '0';
      document.getElementById('hands-stat').textContent = '0';
      document.getElementById('winrate-stat').textContent = '0%';
    }
  }

  // Pokaż błąd
  showError(message) {
    this.addAIMessage(`❌ <strong>Błąd:</strong> ${message}`, 'incorrect');
  }
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
  new BlackjackTrainer();
});
