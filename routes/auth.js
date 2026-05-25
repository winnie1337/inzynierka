/**
 * Routing autentykacji
 * Obsługa rejestracji, logowania i wylogowania
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// Rejestracja nowego użytkownika
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Walidacja
    if (!email || !password) {
      return res.status(400).json({ error: 'Email i hasło są wymagane' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć minimum 6 znaków' });
    }
    
    // Sprawdzenie czy użytkownik już istnieje
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
    }
    
    // Hashowanie hasła
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Utworzenie użytkownika
    const userId = db.createUser(email, hashedPassword);
    
    // Utworzenie sesji
    req.session.userId = userId;
    req.session.email = email;
    
    // Zapisz sesję przed odpowiedzią
    req.session.save((err) => {
      if (err) {
        console.error('Błąd zapisu sesji:', err);
        return res.status(500).json({ error: 'Błąd zapisu sesji' });
      }
      
      res.json({ 
        success: true, 
        message: 'Rejestracja zakończona sukcesem',
        user: { id: userId, email }
      });
    });
    
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ error: 'Błąd serwera podczas rejestracji' });
  }
});

// Logowanie użytkownika
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Walidacja
    if (!email || !password) {
      return res.status(400).json({ error: 'Email i hasło są wymagane' });
    }
    
    // Pobranie użytkownika
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }
    
    // Sprawdzenie hasła
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }
    
    // Utworzenie sesji
    req.session.userId = user.id;
    req.session.email = user.email;
    
    // Zapisz sesję przed odpowiedzią
    req.session.save((err) => {
      if (err) {
        console.error('Błąd zapisu sesji:', err);
        return res.status(500).json({ error: 'Błąd zapisu sesji' });
      }
      
      res.json({ 
        success: true, 
        message: 'Logowanie zakończone sukcesem',
        user: { id: user.id, email: user.email }
      });
    });
    
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Błąd serwera podczas logowania' });
  }
});

// Wylogowanie użytkownika
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Błąd podczas wylogowania' });
    }
    res.json({ success: true, message: 'Wylogowano pomyślnie' });
  });
});

// Sprawdzenie statusu sesji
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    const user = db.getUserById(req.session.userId);
    res.json({ 
      authenticated: true, 
      user: { id: user.id, email: user.email }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
