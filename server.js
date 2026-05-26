/**
 * Blackjack Trainer - Główny serwer aplikacji
 * Backend: Node.js + Express
 * Obsługa logowania, sesji i gry w blackjacka
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database/db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const statsRoutes = require('./routes/stats');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Konfiguracja sesji
app.use(session({
  secret: process.env.SESSION_SECRET || 'blackjack-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // ustaw true jeśli używasz HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 godziny
  }
}));

// Middleware do tworzenia domyślnej sesji (bez logowania)
const ensureSession = (req, res, next) => {
  if (!req.session.userId) {
    // Utwórz domyślnego użytkownika jeśli nie istnieje
    let defaultUser = db.getUserByEmail('default@blackjack.local');
    if (!defaultUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('default', 10);
      const userId = db.createUser('default@blackjack.local', hashedPassword);
      req.session.userId = userId;
    } else {
      req.session.userId = defaultUser.id;
    }
  }
  next();
};

// Routing
app.use('/api/auth', authRoutes);
app.use('/api/game', ensureSession, gameRoutes);
app.use('/api/stats', ensureSession, statsRoutes);
app.use('/api/chat', chatRoutes);

// Strona główna - zawsze game
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Inicjalizacja bazy danych
db.initialize();

// Start serwera
app.listen(PORT, () => {
  console.log(`🎰 Blackjack Trainer uruchomiony na http://localhost:${PORT}`);
  console.log('📚 Gotowy do nauki gry w blackjacka!');

  // Diagnostyka klucza Groq - sprawdzamy czy jest dostępny w env
  if (process.env.GROQ_API_KEY) {
    const k = process.env.GROQ_API_KEY;
    const masked = k.length > 10 ? `${k.slice(0, 6)}...${k.slice(-4)}` : '***';
    console.log(`🤖 GROQ_API_KEY wczytany z .env (${masked}) - czat AI (llama-3.3-70b-versatile) gotowy`);
  } else {
    console.warn('⚠️  Brak GROQ_API_KEY w .env - endpoint /api/chat zwróci błąd 500');
  }
});
