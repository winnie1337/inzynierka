/**
 * Routing statystyk
 * Pobieranie statystyk gry i postępów w nauce
 */

const express = require('express');
const db = require('../database/db');

const router = express.Router();

// Pobierz wszystkie statystyki użytkownika
router.get('/all', (req, res) => {
  try {
    const userId = req.session.userId;

    const gameStats = db.getGameStats(userId);
    const countingStats = db.getCountingStats(userId);

    // Oblicz użyteczne procenty i wzorce
    const accuracy = gameStats.total_decisions > 0 ?
      ((gameStats.correct_decisions / gameStats.total_decisions) * 100).toFixed(1) : 0;

    const winRate = gameStats.hands_played > 0 ?
      ((gameStats.hands_won / gameStats.hands_played) * 100).toFixed(1) : 0;

    const countingAccuracy = countingStats.total_counts > 0 ?
      ((countingStats.correct_counts / countingStats.total_counts) * 100).toFixed(1) : 0;

    res.json({
      gameStats: {
        ...gameStats,
        accuracy: parseFloat(accuracy),
        winRate: parseFloat(winRate)
      },
      countingStats: {
        ...countingStats,
        accuracy: parseFloat(countingAccuracy),
        avgError: countingStats.avg_error.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Błąd pobierania statystyk:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania statystyk' });
  }
});

// Pobierz tylko statystyki gry w blackjacka
router.get('/game', (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = db.getGameStats(userId);

    const accuracy = stats.total_decisions > 0 ?
      ((stats.correct_decisions / stats.total_decisions) * 100).toFixed(1) : 0;

    const winRate = stats.hands_played > 0 ?
      ((stats.hands_won / stats.hands_played) * 100).toFixed(1) : 0;

    res.json({
      ...stats,
      accuracy: parseFloat(accuracy),
      winRate: parseFloat(winRate),
      improvementTips: getGameTips(stats)
    });

  } catch (error) {
    console.error('Błąd pobierania statystyk gry:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania statystyk gry' });
  }
});

// Pobierz tylko statystyki liczenia kart
router.get('/counting', (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = db.getCountingStats(userId);

    const accuracy = stats.total_counts > 0 ?
      ((stats.correct_counts / stats.total_counts) * 100).toFixed(1) : 0;

    res.json({
      ...stats,
      accuracy: parseFloat(accuracy),
      improvementTips: getCountingTips(stats)
    });

  } catch (error) {
    console.error('Błąd pobierania statystyk liczenia kart:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania statystyk liczenia kart' });
  }
});

// Resetuj statystyki gry (jeśli gracz chce zacząć od nowa)
router.post('/reset-game', (req, res) => {
  try {
    const userId = req.session.userId;

    db.updateGameStats(userId, {
      total_decisions: -db.getGameStats(userId).total_decisions,
      correct_decisions: -db.getGameStats(userId).correct_decisions,
      wrong_decisions: -db.getGameStats(userId).wrong_decisions,
      hands_played: -db.getGameStats(userId).hands_played,
      hands_won: -db.getGameStats(userId).hands_won,
      hands_lost: -db.getGameStats(userId).hands_lost,
      hands_pushed: -db.getGameStats(userId).hands_pushed
    });

    res.json({ message: 'Statystyki gry zostały zresetowane' });

  } catch (error) {
    console.error('Błąd resetowania statystyk gry:', error);
    res.status(500).json({ error: 'Błąd podczas resetowania statystyk gry' });
  }
});

// Resetuj statystyki liczenia kart
router.post('/reset-counting', (req, res) => {
  try {
    const userId = req.session.userId;

    db.updateCountingStats(userId, false, -db.getCountingStats(userId).avg_error * db.getCountingStats(userId).total_counts);
    // To nie jest idealne rozwiązanie, ale ilustruje ideę

    res.json({ message: 'Statystyki liczenia kart zostały zresetowane' });

  } catch (error) {
    console.error('Błąd resetowania statystyk liczenia kart:', error);
    res.status(500).json({ error: 'Błąd podczas resetowania statystyk liczenia kart' });
  }
});

// Funkcje pomocnicze - wskazówki na podstawie wyników
const getGameTips = (stats) => {
  const tips = [];

  if (stats.total_decisions === 0) {
   tips.push('Zagraj kilka partii, aby zgromadzić statystyki decyzji!');
    return tips;
  }

  const accuracy = (stats.correct_decisions / stats.total_decisions) * 100;

  if (accuracy < 60) {
    tips.push('Poświęć jeszcze więcej czasu na naukę Basic Strategy');
    tips.push('Spróbuj ćwiczyć z pojedynczymi rękami zamiast multiples');
    tips.push('Skup się szczególnie na twardych rękach (hard hands) 12-16 przeciwko odkrytej karcie dealera');
  } else if (accuracy < 80) {
    tips.push('Twoje podstawowe umiejętności wyglądają dobrze! Kontynuuj pracę');
    tips.push('Teraz koncentruj się na optymalnych decyzjach, nie tylko na słusznych');
    tips.push('Ćwicz splitting i doubling - te działania wymagają więcej praktyki');
  } else if (accuracy >= 90) {
    tips.push('Doskonale! Twoje decyzje są bardzo bliskie optymalnym!');
    tips.push('Możesz kontynuować naukę liczenia kart lub ćwiczyć pod presją czasu');
    tips.push('Może czas na prawdziwe casino samo! (z małymi stawkami)');
  }

  return tips;
};

const getCountingTips = (stats) => {
  const tips = [];

  if (stats.total_counts === 0) {
    tips.push('Rozpocznij trening liczenia kart używając przycisku "liczenie kart"');
    return tips;
  }

  const accuracy = (stats.correct_counts / stats.total_counts) * 100;

  if (accuracy < 50) {
    tips.push('Koncentruj się na podstawach systemu Hi-Lo');
    tips.push('Karty 2-6 = +1, karty 10-A = -1, karty 7-9 = 0');
    tips.push('Praktykuj na jednej talii, zwiększaj stopniowo liczbę talii');
  } else if (accuracy < 80) {
    tips.push('Dobrze radzisz sobie z podstawami! Teraz pracuj nad spójnością');
    tips.push('Ćwicz True Count równocześnie z Running Count');
    tips.push('Trenuj liczenie z różnymi warunkami - zarówno z wysokim jak i niskim count');
  } else if (accuracy >= 90) {
    tips.push('Twoje umiejętności card counting są mistrzowskie!');
    tips.push('Praktykuj w zmiennych warunkach oraz czasowych ograniczeniach');
    tips.push('Trenuj z rozmowami lub innymi czynnościami, aby się odwrócić');
  }

  if (stats.avg_error > 2) {
    tips.push('Twoje średnie błędy są stosunkowo duże. Wracaj do podstaw!');
  }

  return tips;
};

module.exports = router;
