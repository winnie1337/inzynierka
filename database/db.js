/**
 * Moduł bazy danych SQLite
 * Zarządzanie użytkownikami i statystykami
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'blackjack.db');
const db = new Database(dbPath);

// Inicjalizacja tabel
const initialize = () => {
  // Tabela użytkowników
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela statystyk gry
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_decisions INTEGER DEFAULT 0,
      correct_decisions INTEGER DEFAULT 0,
      wrong_decisions INTEGER DEFAULT 0,
      hands_played INTEGER DEFAULT 0,
      hands_won INTEGER DEFAULT 0,
      hands_lost INTEGER DEFAULT 0,
      hands_pushed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabela statystyk liczenia kart
  db.exec(`
    CREATE TABLE IF NOT EXISTS counting_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_counts INTEGER DEFAULT 0,
      correct_counts INTEGER DEFAULT 0,
      avg_error REAL DEFAULT 0,
      last_practice DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ Baza danych zainicjalizowana');
};

// CRUD operacje użytkowników
const createUser = (email, hashedPassword) => {
  const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
  const result = stmt.run(email, hashedPassword);
  
  // Utworzenie początkowych statystyk
  const statsStmt = db.prepare('INSERT INTO game_stats (user_id) VALUES (?)');
  statsStmt.run(result.lastInsertRowid);
  
  const countingStmt = db.prepare('INSERT INTO counting_stats (user_id) VALUES (?)');
  countingStmt.run(result.lastInsertRowid);
  
  return result.lastInsertRowid;
};

const getUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
};

const getUserById = (id) => {
  const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
  return stmt.get(id);
};

// Operacje na statystykach gry
const getGameStats = (userId) => {
  const stmt = db.prepare('SELECT * FROM game_stats WHERE user_id = ?');
  return stmt.get(userId);
};

const updateGameStats = (userId, updates) => {
  const stats = getGameStats(userId);
  
  const newStats = {
    total_decisions: stats.total_decisions + (updates.total_decisions || 0),
    correct_decisions: stats.correct_decisions + (updates.correct_decisions || 0),
    wrong_decisions: stats.wrong_decisions + (updates.wrong_decisions || 0),
    hands_played: stats.hands_played + (updates.hands_played || 0),
    hands_won: stats.hands_won + (updates.hands_won || 0),
    hands_lost: stats.hands_lost + (updates.hands_lost || 0),
    hands_pushed: stats.hands_pushed + (updates.hands_pushed || 0)
  };
  
  const stmt = db.prepare(`
    UPDATE game_stats 
    SET total_decisions = ?, correct_decisions = ?, wrong_decisions = ?,
        hands_played = ?, hands_won = ?, hands_lost = ?, hands_pushed = ?
    WHERE user_id = ?
  `);
  
  stmt.run(
    newStats.total_decisions,
    newStats.correct_decisions,
    newStats.wrong_decisions,
    newStats.hands_played,
    newStats.hands_won,
    newStats.hands_lost,
    newStats.hands_pushed,
    userId
  );
  
  return newStats;
};

// Operacje na statystykach liczenia kart
const getCountingStats = (userId) => {
  const stmt = db.prepare('SELECT * FROM counting_stats WHERE user_id = ?');
  return stmt.get(userId);
};

const updateCountingStats = (userId, isCorrect, error = 0) => {
  const stats = getCountingStats(userId);
  
  const newTotalCounts = stats.total_counts + 1;
  const newCorrectCounts = stats.correct_counts + (isCorrect ? 1 : 0);
  const newAvgError = ((stats.avg_error * stats.total_counts) + error) / newTotalCounts;
  
  const stmt = db.prepare(`
    UPDATE counting_stats 
    SET total_counts = ?, correct_counts = ?, avg_error = ?, last_practice = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  
  stmt.run(newTotalCounts, newCorrectCounts, newAvgError, userId);
  
  return {
    total_counts: newTotalCounts,
    correct_counts: newCorrectCounts,
    avg_error: newAvgError
  };
};

module.exports = {
  initialize,
  createUser,
  getUserByEmail,
  getUserById,
  getGameStats,
  updateGameStats,
  getCountingStats,
  updateCountingStats
};
