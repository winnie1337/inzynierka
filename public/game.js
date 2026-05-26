/**
 * Blackjack Trainer - Frontend JavaScript
 * Obsługa interfejsu użytkownika i komunikacji z serwerem
 */

// Stałe konfiguracji wizualnej
const CARD_OFFSET_PX = 80;       // przesunięcie kolejnej karty w poziomie
const CARD_WIDTH_PX = 80;        // szerokość karty
const DEAL_DELAY_MS = 400;       // opóźnienie między kolejnymi kartami przy rozdawaniu

class BlackjackTrainer {
  constructor() {
    this.gameId = null;
    this.currentHandIndex = 0;
    this.gameState = null;

    // Śledzenie liczby kart aby animować tylko nowo dodane karty
    this.prevDealerCount = 0;
    this.prevPlayerCounts = [];

    // Flaga blokująca akcje gracza podczas animacji rozdawania
    this.isDealing = false;

    // Stan panelu licznika kart (Hi-Lo)
    this.runningCount = 0;          // aktualny RC pobrany z serwera (zawsze świeży)
    this.countRevealed = false;     // czy panel pokazuje licznik gdy odsłonięty

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
    document.getElementById('start-game-btn').addEventListener('click', () => this.startNewGame());
    document.getElementById('new-game-btn').addEventListener('click', () => this.showBettingScreen());

    document.getElementById('hit-btn').addEventListener('click', () => this.playerAction('hit'));
    document.getElementById('stand-btn').addEventListener('click', () => this.playerAction('stand'));
    document.getElementById('double-btn').addEventListener('click', () => this.playerAction('double'));
    document.getElementById('split-btn').addEventListener('click', () => this.playerAction('split'));
    document.getElementById('surrender-btn').addEventListener('click', () => this.playerAction('surrender'));

    document.getElementById('get-tip-btn').addEventListener('click', () => this.getTip());

    document.getElementById('send-chat-btn').addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Panel licznika kart (Running Count)
    document.getElementById('reveal-count-btn').addEventListener('click', () => this.revealCount());
    document.getElementById('hide-count-btn').addEventListener('click', () => this.hideCount());
    document.getElementById('guess-count-btn').addEventListener('click', () => this.openGuessForm());
    document.getElementById('cancel-guess-btn').addEventListener('click', () => this.closeGuessForm());
    document.getElementById('submit-guess-btn').addEventListener('click', () => this.submitGuess());
    document.getElementById('guess-count-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.submitGuess();
    });
  }

  // Wyślij wiadomość do AI (Gemini przez /api/chat)
  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat-btn');
    const message = input.value.trim();
    if (!message) return;

    // Wyświetl wiadomość użytkownika (po prawej, niebieskie tło)
    this.addAIMessage(`<strong>Ty:</strong> ${this.escapeHtml(message)}`, 'user-message');
    input.value = '';

    // Zablokuj UI i pokaż animację "AI myśli..."
    input.disabled = true;
    sendBtn.disabled = true;
    const thinkingEl = this.showThinkingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();

      // Usuń animację "AI myśli..."
      if (thinkingEl && thinkingEl.parentNode) {
        thinkingEl.parentNode.removeChild(thinkingEl);
      }

      if (response.ok) {
        const safe = this.escapeHtml(data.answer || '');
        // Odpowiedź bota (po lewej, złociste tło)
        this.addAIMessage(`<strong>🤖 AI:</strong><br>${safe.replace(/\n/g, '<br>')}`, 'bot-message');
      } else {
        this.addAIMessage(`❌ ${data.error || 'Nie mogę odpowiedzieć na to pytanie.'}`, 'bot-message incorrect');
      }
    } catch (error) {
      console.error('Błąd komunikacji z AI:', error);
      if (thinkingEl && thinkingEl.parentNode) {
        thinkingEl.parentNode.removeChild(thinkingEl);
      }
      this.addAIMessage('❌ Błąd połączenia z AI.', 'bot-message incorrect');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Pokaż animowany wskaźnik "AI myśli..."
  showThinkingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = 'message info thinking-indicator';
    el.innerHTML = `
      <strong>🤖 AI myśli</strong>
      <span class="thinking-dot"></span>
      <span class="thinking-dot"></span>
      <span class="thinking-dot"></span>
    `;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
  }

  // Escape HTML aby uniknąć wstrzykiwania znaczników z odpowiedzi AI
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Pokaż ekran zakładów
  showBettingScreen() {
    document.getElementById('betting-section').style.display = 'block';
    document.querySelector('.game-controls').style.display = 'none';
    document.querySelector('.actions').style.display = 'none';

    // Wyczyść kontenery kart
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('player-hands').innerHTML = '';
    this.prevDealerCount = 0;
    this.prevPlayerCounts = [];
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
        this.currentHandIndex = data.gameState.currentHandIndex || 0;

        // Ukryj sekcję zakładów, pokaż akcje
        document.getElementById('betting-section').style.display = 'none';
        document.querySelector('.actions').style.display = 'flex';

        this.addAIMessage('🎮 Nowa gra rozpoczęta! Rozdaję karty...', 'info');

        // Animowane rozdawanie początkowych kart
        await this.dealInitialCardsAnimated();

        this.updateCountDisplay();
      } else {
        this.showError(data.error || 'Błąd rozpoczęcia gry');
      }
    } catch (error) {
      console.error('Błąd rozpoczęcia gry:', error);
      this.showError('Błąd połączenia z serwerem');
    }
  }

  /**
   * Rozdanie początkowych kart z animacją:
   * Kolejność (jak w prawdziwym blackjacku):
   *   1. Każda ręka gracza – pierwsza karta
   *   2. Dealer – pierwsza karta
   *   3. Każda ręka gracza – druga karta
   *   4. Dealer – druga karta (zakryta)
   * Każda karta pojawia się z opóźnieniem DEAL_DELAY_MS względem poprzedniej.
   */
  async dealInitialCardsAnimated() {
    this.isDealing = true;

    // Wyczyść stare karty
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('player-hands').innerHTML = '';
    this.prevDealerCount = 0;
    this.prevPlayerCounts = this.gameState.playerHands.map(() => 0);

    // Zbuduj puste szkielety rąk (label + pusty kontener kart)
    this.buildEmptyHandSkeletons();

    // Wyzeruj wyświetlane wartości
    document.getElementById('player-value').textContent = '-';
    document.getElementById('dealer-value').textContent = '?';

    // Zbierz sekwencję rozdań: [{target: 'player', handIdx, cardIdx}, {target: 'dealer', cardIdx}, ...]
    const sequence = [];
    const playerHands = this.gameState.playerHands;
    // Pierwsza karta każdej ręki
    for (let h = 0; h < playerHands.length; h++) {
      sequence.push({ target: 'player', handIdx: h, cardIdx: 0 });
    }
    // Pierwsza karta dealera
    sequence.push({ target: 'dealer', cardIdx: 0 });
    // Druga karta każdej ręki
    for (let h = 0; h < playerHands.length; h++) {
      sequence.push({ target: 'player', handIdx: h, cardIdx: 1 });
    }
    // Druga karta dealera (zakryta)
    sequence.push({ target: 'dealer', cardIdx: 1 });

    // Rozdaj kolejno z opóźnieniem
    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      await this.delay(DEAL_DELAY_MS);
      this.dealOneCard(step);
    }

    // Po zakończeniu animacji odczekaj na ostatnią animację karty
    await this.delay(600);

    this.isDealing = false;
    // Pełny render aktualizujący wartości, przyciski i ewentualne blackjacki
    this.renderGame({ animateNew: false });
  }

  // Buduje puste sekcje rąk (bez kart) dla obecnego gameState
  buildEmptyHandSkeletons() {
    // Dealer
    const dealerHandEl = document.getElementById('dealer-hand');
    dealerHandEl.innerHTML = '';
    const dealerLabel = document.createElement('div');
    dealerLabel.className = 'hand-label';
    dealerLabel.textContent = 'Dealer:';
    dealerHandEl.appendChild(dealerLabel);
    const dealerCards = document.createElement('div');
    dealerCards.className = 'cards-container';
    dealerCards.id = 'dealer-cards-container';
    dealerCards.style.width = `${CARD_WIDTH_PX}px`;
    dealerHandEl.appendChild(dealerCards);

    // Gracz – każda ręka
    const playerHandsEl = document.getElementById('player-hands');
    playerHandsEl.innerHTML = '';
    this.gameState.playerHands.forEach((hand, index) => {
      const handEl = document.createElement('div');
      handEl.className = 'hand';
      handEl.dataset.handIndex = index;
      if (index === this.currentHandIndex) handEl.classList.add('active-hand');

      const labelEl = document.createElement('div');
      labelEl.className = 'hand-label';
      labelEl.textContent = `Ręka ${index + 1}`;
      handEl.appendChild(labelEl);

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'cards-container';
      cardsContainer.id = `player-cards-container-${index}`;
      cardsContainer.style.width = `${CARD_WIDTH_PX}px`;
      handEl.appendChild(cardsContainer);

      const valueEl = document.createElement('div');
      valueEl.className = 'hand-value';
      valueEl.id = `player-hand-value-${index}`;
      valueEl.textContent = '-';
      valueEl.style.color = '#ffd700';
      handEl.appendChild(valueEl);

      playerHandsEl.appendChild(handEl);
    });
  }

  // Dodaje pojedynczą kartę z animacją lotu z talii do celu
  dealOneCard(step) {
    if (step.target === 'dealer') {
      const card = this.gameState.dealerHand[step.cardIdx];
      const container = document.getElementById('dealer-cards-container');
      // Druga karta dealera jest zakryta podczas rozgrywki
      const hidden = (step.cardIdx === 1 && this.gameState.gameState === 'playing');
      const cardEl = this.createCardElement(card, hidden, {
        leftPx: step.cardIdx * CARD_OFFSET_PX,
        animateClass: 'dealing-dealer'
      });
      container.appendChild(cardEl);
      container.style.width = `${(step.cardIdx + 1) * CARD_OFFSET_PX}px`;
      this.prevDealerCount = step.cardIdx + 1;
    } else {
      const hand = this.gameState.playerHands[step.handIdx];
      const card = hand.cards[step.cardIdx];
      const container = document.getElementById(`player-cards-container-${step.handIdx}`);
      const cardEl = this.createCardElement(card, false, {
        leftPx: step.cardIdx * CARD_OFFSET_PX,
        animateClass: 'dealing-player'
      });
      container.appendChild(cardEl);
      container.style.width = `${(step.cardIdx + 1) * CARD_OFFSET_PX}px`;
      this.prevPlayerCounts[step.handIdx] = step.cardIdx + 1;

      // Zaktualizuj wartość ręki na bieżąco
      const valueEl = document.getElementById(`player-hand-value-${step.handIdx}`);
      if (valueEl) {
        const partialCards = hand.cards.slice(0, step.cardIdx + 1);
        valueEl.textContent = this.calculateHandValue(partialCards);
      }
    }
  }

  // Pomocnik: opóźnienie (Promise)
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Akcja gracza
  async playerAction(action) {
    if (!this.gameId) {
      this.showError('Rozpocznij nową grę!');
      return;
    }
    if (this.isDealing) {
      return; // Ignoruj akcje podczas animacji rozdawania
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

        // Wyrenderuj grę animując tylko nowo dodane karty
        this.renderGame({ animateNew: true });

        if (data.evaluation) {
          const messageClass = data.evaluation.isCorrect ? 'correct' : 'incorrect';
          this.addAIMessage(data.evaluation.feedback, 'feedback ' + messageClass);
        }

        if (data.counting) {
          this.updateCountDisplay(data.counting);
        }

        if (data.gameState.gameState === 'finished' && data.results) {
          setTimeout(() => {
            this.showResults(data.results);
            this.loadStats();
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

  // Pełny render aktualnego gameState (po akcji)
  renderGame(options = { animateNew: true }) {
    if (!this.gameState) return;
    const animateNew = options.animateNew !== false;

    this.renderDealerHand(animateNew);
    this.renderPlayerHands(animateNew);
    this.updateActionButtons();
    this.updateGameInfo();
  }

  // Renderuj rękę dealera
  renderDealerHand(animateNew = true) {
    const dealerHandEl = document.getElementById('dealer-hand');
    dealerHandEl.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hand-label';
    label.textContent = 'Dealer:';
    dealerHandEl.appendChild(label);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    cardsContainer.id = 'dealer-cards-container';
    const cards = this.gameState.dealerHand;
    cardsContainer.style.width = `${Math.max(cards.length, 1) * CARD_OFFSET_PX}px`;

    const isPlaying = this.gameState.gameState === 'playing';
    cards.forEach((card, index) => {
      const hidden = isPlaying && index === 1;
      const isNew = animateNew && index >= this.prevDealerCount;
      const cardEl = this.createCardElement(card, hidden, {
        leftPx: index * CARD_OFFSET_PX,
        animateClass: isNew ? 'dealing-dealer' : null
      });
      cardsContainer.appendChild(cardEl);
    });
    dealerHandEl.appendChild(cardsContainer);
    this.prevDealerCount = cards.length;

    if (this.gameState.gameState === 'finished') {
      const value = this.calculateHandValue(cards);
      const valueEl = document.createElement('div');
      valueEl.className = 'hand-value';
      valueEl.textContent = `(${value})`;
      valueEl.style.color = '#ffd700';
      valueEl.style.marginTop = '8px';
      dealerHandEl.appendChild(valueEl);
    }
  }

  // Renderuj ręce gracza
  renderPlayerHands(animateNew = true) {
    const playerHandsEl = document.getElementById('player-hands');
    playerHandsEl.innerHTML = '';

    // Dopasuj długość prevPlayerCounts do liczby rąk (split może dodać rękę)
    while (this.prevPlayerCounts.length < this.gameState.playerHands.length) {
      this.prevPlayerCounts.push(0);
    }

    this.gameState.playerHands.forEach((hand, index) => {
      const handEl = document.createElement('div');
      handEl.className = 'hand';
      handEl.dataset.handIndex = index;

      if (index === this.currentHandIndex && this.gameState.gameState === 'playing') {
        handEl.classList.add('active-hand');
      }

      // Możliwość kliknięcia na rękę aby ją wybrać (multi-hand)
      if (this.gameState.gameState === 'playing' && this.gameState.playerHands.length > 1) {
        handEl.style.cursor = 'pointer';
        handEl.addEventListener('click', () => {
          if (!hand.standing && !hand.busted && !hand.surrendered) {
            this.currentHandIndex = index;
            this.renderGame({ animateNew: false });
          }
        });
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'hand-label';
      labelEl.textContent = `Ręka ${index + 1}`;
      handEl.appendChild(labelEl);

      // Kontener kart (pozycjonowanie absolutne, każda karta o 80px w prawo)
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'cards-container';
      cardsContainer.style.width = `${Math.max(hand.cards.length, 1) * CARD_OFFSET_PX}px`;

      const prevCount = this.prevPlayerCounts[index] || 0;
      hand.cards.forEach((card, cardIdx) => {
        const isNew = animateNew && cardIdx >= prevCount;
        const cardEl = this.createCardElement(card, false, {
          leftPx: cardIdx * CARD_OFFSET_PX,
          animateClass: isNew ? 'dealing-player' : null
        });
        cardsContainer.appendChild(cardEl);
      });
      handEl.appendChild(cardsContainer);
      this.prevPlayerCounts[index] = hand.cards.length;

      // Wartość ręki
      const value = this.calculateHandValue(hand.cards);
      const valueEl = document.createElement('div');
      valueEl.className = 'hand-value';
      valueEl.textContent = `${value}`;
      valueEl.style.color = hand.busted ? '#dc3545' : '#ffd700';
      valueEl.style.marginTop = '8px';
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

  /**
   * Utwórz element karty
   * @param {Object} card  - {rank, suit}
   * @param {boolean} hidden - czy zakryta
   * @param {Object} opts - { leftPx: number, animateClass: 'dealing-player'|'dealing-dealer'|null }
   */
  createCardElement(card, hidden = false, opts = {}) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    if (typeof opts.leftPx === 'number') {
      cardEl.style.left = `${opts.leftPx}px`;
    }
    if (opts.animateClass) {
      cardEl.classList.add(opts.animateClass);
    }

    if (hidden) {
      cardEl.classList.add('hidden');
      return cardEl;
    }

    // Kolor wg koloru karty
    if (card && (card.suit === '♥' || card.suit === '♦')) {
      cardEl.classList.add('suit-hearts');
    } else {
      cardEl.classList.add('suit-spades');
    }

    if (card) {
      cardEl.innerHTML = `<div>${card.rank}${card.suit}</div>`;
    }

    return cardEl;
  }

  // Oblicz wartość ręki – zwraca string z opcjami dla asa lub liczbę
  calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (let card of cards) {
      if (!card) continue;
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    }

    if (aces > 0 && value <= 21) {
      const softValue = value;
      const hardValue = value - 10;
      if (softValue !== hardValue && softValue !== 21) {
        return `${hardValue}/${softValue}`;
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  updateActionButtons() {
    const isPlaying = this.gameState && this.gameState.gameState === 'playing';

    document.getElementById('hit-btn').disabled = !isPlaying;
    document.getElementById('stand-btn').disabled = !isPlaying;
    document.getElementById('double-btn').disabled = !isPlaying || !this.gameState.canDouble;
    document.getElementById('split-btn').disabled = !isPlaying || !this.gameState.canSplit;
    document.getElementById('surrender-btn').disabled = !isPlaying || !this.gameState.canSurrender;
  }

  updateGameInfo() {
    if (!this.gameState) return;

    const playerHand = this.gameState.playerHands[this.currentHandIndex];
    const playerValue = playerHand ? this.calculateHandValue(playerHand.cards) : '-';
    const dealerValue = this.gameState.gameState === 'finished'
      ? this.calculateHandValue(this.gameState.dealerHand)
      : '?';

    document.getElementById('player-value').textContent = playerValue;
    document.getElementById('dealer-value').textContent = dealerValue;
  }

  // Pokaż wyniki
  showResults(results) {
    let message = '🎲 <strong>Wyniki gry:</strong><br><br>';
    results.forEach((result, index) => {
      let icon, resultText;
      switch (result.result) {
        case 'blackjack': icon = '🎰'; resultText = 'BLACKJACK!'; break;
        case 'win': icon = '✅'; resultText = 'WYGRANA'; break;
        case 'lose': icon = '❌'; resultText = 'PRZEGRANA'; break;
        case 'push': icon = '🤝'; resultText = 'REMIS'; break;
        case 'surrender': icon = '🏳️'; resultText = 'SURRENDER'; break;
        default: icon = '❓'; resultText = result.result.toUpperCase();
      }
      message += `${icon} Ręka ${index + 1}: <strong>${resultText}</strong><br>`;
      message += `Ty: ${result.playerValue}, Dealer: ${result.dealerValue}<br><br>`;
    });

    this.addAIMessage(message, 'info');
    document.querySelector('.game-controls').style.display = 'block';
    document.getElementById('new-game-btn').textContent = '🎲 NOWA GRA';
    this.gameId = null;
  }

  addAIMessage(message, type = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = message;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async getTip() {
    try {
      const response = await fetch('/api/game/strategy-tip');
      const data = await response.json();
      this.addAIMessage(`<strong>💡 Porada:</strong><br>${data.strategyTip}`, 'info');
    } catch (error) {
      console.error('Błąd pobierania porady:', error);
    }
  }

  // === Panel licznika kart (Running Count) ===

  /**
   * Pobierz aktualny running count z serwera i zapisz w stanie.
   * Jeśli countData został przekazany (np. z odpowiedzi po akcji), użyj go bezpośrednio.
   * Następnie odśwież widok panelu zgodnie ze stanem `countRevealed`.
   */
  async updateCountDisplay(countData = null) {
    try {
      if (!countData) {
        const response = await fetch('/api/game/count');
        const data = await response.json();
        countData = data.countInfo;
      }
      this.runningCount = countData?.runningCount ?? 0;
    } catch (error) {
      console.error('Błąd aktualizacji licznika:', error);
    }
    this.renderCounterPanel();
  }

  // Odświeża wyświetlaną wartość w panelu licznika (??? / liczba) i kolor.
  renderCounterPanel() {
    const valueEl = document.getElementById('card-counter-value');
    const hintEl = document.getElementById('card-counter-hint');
    if (!valueEl) return;

    // Reset klas kolorystycznych
    valueEl.classList.remove('hidden-value', 'positive', 'negative', 'zero');

    if (this.countRevealed) {
      valueEl.textContent = (this.runningCount > 0 ? '+' : '') + this.runningCount;
      if (this.runningCount > 0) valueEl.classList.add('positive');
      else if (this.runningCount < 0) valueEl.classList.add('negative');
      else valueEl.classList.add('zero');
      if (hintEl) hintEl.textContent = 'Licznik odkryty — aktualizuje się po każdej rozdanej karcie';
    } else {
      valueEl.textContent = '???';
      valueEl.classList.add('hidden-value');
      if (hintEl) hintEl.textContent = 'Licznik ukryty — możesz spróbować zgadnąć lub odkryć';
    }
  }

  // Odkrywa licznik (Pokaż licznik)
  revealCount() {
    this.countRevealed = true;
    document.getElementById('reveal-count-btn').style.display = 'none';
    document.getElementById('hide-count-btn').style.display = '';
    // Pobierz świeży RC z serwera (na wypadek gdyby coś się zmieniło)
    this.updateCountDisplay();
  }

  // Ukrywa licznik (z powrotem ???)
  hideCount() {
    this.countRevealed = false;
    document.getElementById('hide-count-btn').style.display = 'none';
    document.getElementById('reveal-count-btn').style.display = '';
    this.renderCounterPanel();
  }

  // Otwiera formularz "Zgadnij Running Count"
  openGuessForm() {
    const form = document.getElementById('guess-count-form');
    const input = document.getElementById('guess-count-input');
    const resultEl = document.getElementById('guess-result');
    form.style.display = 'flex';
    resultEl.style.display = 'none';
    input.value = '';
    input.focus();
  }

  // Zamyka formularz "Zgadnij Running Count"
  closeGuessForm() {
    document.getElementById('guess-count-form').style.display = 'none';
  }

  // Sprawdza zgadywanie gracza wobec aktualnego runningCount
  async submitGuess() {
    const input = document.getElementById('guess-count-input');
    const resultEl = document.getElementById('guess-result');
    const raw = input.value.trim();
    if (raw === '' || isNaN(parseInt(raw, 10))) {
      resultEl.style.display = 'block';
      resultEl.className = 'guess-result incorrect';
      resultEl.textContent = 'Wpisz liczbę całkowitą (np. -2, 0, 3).';
      return;
    }

    // Upewnij się że mamy aktualny RC z serwera
    try {
      const response = await fetch('/api/game/count');
      const data = await response.json();
      this.runningCount = data?.countInfo?.runningCount ?? 0;
    } catch (e) {
      console.error('Nie udało się pobrać aktualnego RC:', e);
    }

    const guess = parseInt(raw, 10);
    const actual = this.runningCount;
    const sign = (n) => (n > 0 ? '+' + n : String(n));

    resultEl.style.display = 'block';
    if (guess === actual) {
      resultEl.className = 'guess-result correct';
      resultEl.innerHTML = `✅ <strong>Poprawnie!</strong> Running Count = <strong>${sign(actual)}</strong>`;
    } else {
      resultEl.className = 'guess-result incorrect';
      resultEl.innerHTML = `❌ <strong>Niepoprawnie.</strong> Twoja odpowiedź: <strong>${sign(guess)}</strong>, prawdziwy Running Count: <strong>${sign(actual)}</strong>`;
    }

    this.closeGuessForm();
  }

  async loadStats() {
    try {
      const response = await fetch('/api/stats/all');
      if (!response.ok) {
        console.error('Błąd pobierania statystyk:', response.status);
        return;
      }
      const data = await response.json();

      document.getElementById('accuracy-stat').textContent = `${data.gameStats.accuracy || 0}%`;
      document.getElementById('accuracy-stat-big').textContent = `${data.gameStats.accuracy || 0}%`;
      document.getElementById('decisions-stat').textContent = data.gameStats.correct_decisions || 0;
      document.getElementById('wrong-decisions-stat').textContent = data.gameStats.wrong_decisions || 0;
      document.getElementById('total-decisions-stat').textContent = data.gameStats.total_decisions || 0;
      document.getElementById('hands-stat').textContent = data.gameStats.hands_played || 0;
      document.getElementById('winrate-stat').textContent = `${data.gameStats.winRate || 0}%`;

      if (document.getElementById('counting-accuracy-stat')) {
        document.getElementById('counting-accuracy-stat').textContent = `${data.countingStats.accuracy || 0}%`;
      }
    } catch (error) {
      console.error('Błąd ładowania statystyk:', error);
      document.getElementById('accuracy-stat').textContent = '0%';
      document.getElementById('accuracy-stat-big').textContent = '0%';
      document.getElementById('decisions-stat').textContent = '0';
      document.getElementById('wrong-decisions-stat').textContent = '0';
      document.getElementById('total-decisions-stat').textContent = '0';
      document.getElementById('hands-stat').textContent = '0';
      document.getElementById('winrate-stat').textContent = '0%';
    }
  }

  showError(message) {
    this.addAIMessage(`❌ <strong>Błąd:</strong> ${message}`, 'incorrect');
  }
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
  new BlackjackTrainer();
});
