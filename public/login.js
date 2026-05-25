/**
 * Blackjack Trainer - Logowanie i Rejestracja
 * Frontend JavaScript dla autentykacji
 */

class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    // Sprawdź czy użytkownik jest już zalogowany
    this.checkSession();
    
    // Ustaw event listenery
    this.setupEventListeners();

    // Ustaw aktywny formularz
    this.showLoginForm();
  }

  async checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated) {
        // Użytkownik jest zalogowany - przekieruj do gry
        window.location.href = '/game.html';
      }
    } catch (error) {
      console.error('Błąd sprawdzania sesji:', error);
    }
  }

  setupEventListeners() {
    // Formularz logowania
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Formularz rejestracji
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Linki przełączania formularzy
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
      showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showRegisterForm();
      });
    }

    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showLoginForm();
      });
    }
  }

  showLoginForm() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
    this.clearMessages();
  }

  showRegisterForm() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
    this.clearMessages();
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Walidacja
    if (!email || !password) {
      this.showError('login', 'Wypełnij wszystkie pola');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('login', 'Podaj prawidłowy adres email');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('login', 'Logowanie udane! Przekierowywanie...');
        setTimeout(() => {
          window.location.href = '/game.html';
        }, 1000);
      } else {
        this.showError('login', data.error || 'Błąd logowania');
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      this.showError('login', 'Błąd połączenia z serwerem');
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // Walidacja
    if (!email || !password || !confirmPassword) {
      this.showError('register', 'Wypełnij wszystkie pola');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('register', 'Podaj prawidłowy adres email');
      return;
    }

    if (password.length < 6) {
      this.showError('register', 'Hasło musi mieć minimum 6 znaków');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('register', 'Hasła nie są identyczne');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('register', 'Rejestracja udana! Przekierowywanie...');
        setTimeout(() => {
          window.location.href = '/game.html';
        }, 1000);
      } else {
        this.showError('register', data.error || 'Błąd rejestracji');
      }
    } catch (error) {
      console.error('Błąd rejestracji:', error);
      this.showError('register', 'Błąd połączenia z serwerem');
    }
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  showError(formType, message) {
    this.clearMessages();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const formContainer = document.getElementById(`${formType}-container`);
    const form = formContainer.querySelector('form');
    form.insertBefore(errorDiv, form.firstChild);
  }

  showSuccess(formType, message) {
    this.clearMessages();
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;

    const formContainer = document.getElementById(`${formType}-container`);
    const form = formContainer.querySelector('form');
    form.insertBefore(successDiv, form.firstChild);
  }

  clearMessages() {
    const errors = document.querySelectorAll('.error-message');
    const successes = document.querySelectorAll('.success-message');
    
    errors.forEach(el => el.remove());
    successes.forEach(el => el.remove());
  }
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});
