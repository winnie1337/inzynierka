# 🎰 Blackjack Trainer - Aplikacja do nauki gry w Blackjacka

Kompletna aplikacja webowa do nauki gry w blackjacka z AI, które ocenia Twoje decyzje według **Basic Strategy** oraz trenuje **liczenie kart** (system Hi-Lo).

## 📋 Spis treści

- [Funkcje](#-funkcje)
- [Technologie](#-technologie)
- [Instalacja](#-instalacja)
- [Uruchomienie](#-uruchomienie)
- [Struktura projektu](#-struktura-projektu)
- [Używanie aplikacji](#-używanie-aplikacji)
- [API](#-api)
- [Wdrożenie online](#-wdrożenie-online)

## ✨ Funkcje

### 🃏 Gra w Blackjacka
- **1-4 ręce jednocześnie** - graj wieloma rękami równocześnie
- **Wszystkie standardowe akcje**: Hit, Stand, Double, Split, Surrender
- **Realistyczna mechanika** - zgodna z zasadami kasyn
- **Wizualnie atrakcyjny interfejs** - zielony stół z efektami świetlnymi kasyna

### 🤖 Inteligentny AI Trener
- **Ocena decyzji w czasie rzeczywistym** - AI sprawdza każdy Twój ruch
- **Pochwały za dobre decyzje** - pozytywne wzmocnienie
- **Szczegółowe wyjaśnienia błędów** - AI tłumaczy co było złe i co zrobić
- **Panel czatu** - wiadomości od AI po prawej stronie ekranu
- **Porady losowe** - kliknij, aby otrzymać wskazówki dotyczące strategii

### 📊 Basic Strategy
- **Kompletna implementacja** - wszystkie sytuacje (twarde, miękkie, pary)
- **Natychmiastowa ocena** - bez opóźnień
- **Wbudowana baza zasad** - działa lokalnie, bez API

### 🔢 Liczenie kart (Hi-Lo)
- **System Hi-Lo** - najpopularniejszy system liczenia
- **Running Count & True Count** - pełna obsługa
- **Tryb treningowy** - ćwicz liczenie podczas gry
- **Ocena dokładności** - AI sprawdza Twoje obliczenia
- **Porady zakładów** - rekomendacje na podstawie count

### 🔐 System użytkowników
- **Rejestracja i logowanie** - bezpieczne konta użytkowników
- **Hashowanie haseł** - bcrypt dla maksymalnego bezpieczeństwa
- **Sesje** - automatyczne zapamiętywanie logowania
- **Statystyki osobiste** - śledzenie postępów w nauce

### 📈 Statystyki
- **Procent poprawnych decyzji** - śledź swoją dokładność
- **Wyniki gier** - wygrane, przegrane, remisy
- **Statystyki liczenia kart** - dokładność i średni błąd
- **Postępy w czasie** - zobacz jak się rozwijasz

## 🛠 Technologie

### Backend
- **Node.js** - środowisko uruchomieniowe
- **Express.js** - framework webowy
- **SQLite** (better-sqlite3) - baza danych
- **bcryptjs** - hashowanie haseł
- **express-session** - zarządzanie sesjami

### Frontend
- **Vanilla JavaScript** - czysty JS bez frameworków
- **HTML5 & CSS3** - nowoczesny interfejs
- **Responsywny design** - działa na wszystkich urządzeniach

## 📥 Instalacja

### Wymagania
- **Node.js** v14 lub nowszy
- **npm** (instalowany z Node.js)

### Pobierz projekt

```bash
# Jeśli używasz Git
git clone <repository-url>
cd Inzynierka

# Lub po prostu upewnij się, że jesteś w katalogu projektu
cd /Users/bartekwiniarek/Desktop/Inzynierka
```

### Zainstaluj zależności

```bash
npm install
```

To zainstaluje wszystkie wymagane pakiety:
- express
- express-session
- bcryptjs
- body-parser
- dotenv
- better-sqlite3

## 🚀 Uruchomienie

### Tryb produkcyjny

```bash
npm start
```

### Tryb developerski (z automatycznym restartem)

```bash
npm run dev
```

Aplikacja zostanie uruchomiona na **http://localhost:3000**

### Pierwsze uruchomienie

1. Otwórz przeglądarkę i wejdź na `http://localhost:3000`
2. Zostaniesz przekierowany do strony logowania
3. Kliknij "**Nie masz konta? Zarejestruj się**"
4. Wprowadź email i hasło (min. 6 znaków)
5. Po rejestracji zostaniesz automatycznie zalogowany

## 📁 Struktura projektu

```
Inzynierka/
├── server.js                 # Główny serwer Express
├── package.json             # Zależności i skrypty
├── .env                     # Konfiguracja środowiska
├── README.md               # Ten plik
│
├── database/
│   ├── db.js               # Moduł bazy danych
│   └── blackjack.db        # Baza SQLite (tworzona automatycznie)
│
├── game/
│   ├── blackjack.js        # Logika gry w blackjacka
│   ├── basicStrategy.js    # AI z Basic Strategy
│   └── cardCounting.js     # System liczenia kart Hi-Lo
│
├── routes/
│   ├── auth.js             # Routing autentykacji
│   ├── game.js             # Routing gry
│   └── stats.js            # Routing statystyk
│
└── public/                 # Pliki frontendowe
    ├── login.html          # Strona logowania
    ├── game.html           # Strona gry
    ├── styles.css          # Style CSS (kasynowy wygląd)
    ├── login.js            # JavaScript logowania
    └── game.js             # JavaScript gry
```

## 🎮 Używanie aplikacji

### Rozpoczęcie gry

1. **Wybierz liczbę rąk** (1-4) z menu rozwijanego
2. Kliknij "**🎲 Nowa Gra**"
3. Karty zostaną rozdane - Ty i dealer otrzymujecie po 2 karty
4. Jedna karta dealera jest zakryta

### Akcje gracza

- **Hit** - dobierz kolejną kartę
- **Stand** - zostań z obecną ręką
- **Double** - podwój stawkę i dobierz jedną kartę (dostępne tylko na początku)
- **Split** - rozdziel parę na dwie ręce (dostępne tylko dla par)
- **Surrender** - poddaj się i odzyskaj połowę stawki

### AI Feedback

Po każdej akcji AI:
- ✅ **Chwali** za poprawne decyzje
- ❌ **Wyjaśnia błędy** i pokazuje optymalną strategię
- 💡 **Podaje porady** na przyszłość

### Liczenie kart

1. Kliknij "**🔢 Włącz liczenie kart**"
2. Obserwuj karty - system automatycznie aktualizuje count
3. Zobacz **Running Count**, **True Count** i pozostałe talie
4. Otrzymaj **porady zakładów** na podstawie count

### Statystyki

W dolnej części ekranu znajdziesz:
- **Dokładność decyzji** - procent poprawnych ruchów
- **Całkowite decyzje** - ile ruchów wykonałeś
- **Rozegrane ręce** - liczba partii
- **Procent wygranych** - wskaźnik wygranych
- **Dokładność liczenia** - jak dobrze liczysz karty

## 🔌 API

### Autentykacja

#### POST `/api/auth/register`
Rejestracja nowego użytkownika
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST `/api/auth/login`
Logowanie użytkownika
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST `/api/auth/logout`
Wylogowanie użytkownika

#### GET `/api/auth/session`
Sprawdzenie statusu sesji

### Gra

#### POST `/api/game/new-game`
Rozpoczęcie nowej gry
```json
{
  "numHands": 1
}
```

#### POST `/api/game/action/:gameId`
Wykonanie akcji gracza
```json
{
  "action": "hit",
  "handIndex": 0
}
```

#### GET `/api/game/state/:gameId`
Pobranie stanu gry

#### POST `/api/game/evaluate-count`
Ocena liczenia kart gracza
```json
{
  "runningCount": 3,
  "trueCount": 2
}
```

#### GET `/api/game/strategy-tip`
Pobranie losowej porady

### Statystyki

#### GET `/api/stats/all`
Wszystkie statystyki użytkownika

#### GET `/api/stats/game`
Statystyki gry

#### GET `/api/stats/counting`
Statystyki liczenia kart

## 🌐 Wdrożenie online

### Przygotowanie do produkcji

1. **Zmień SESSION_SECRET** w pliku `.env`:
```env
SESSION_SECRET=twoj-super-bezpieczny-losowy-klucz-minimum-32-znaki
```

2. **Ustaw NODE_ENV na production**:
```env
NODE_ENV=production
```

3. **Dla HTTPS ustaw secure cookies** w `server.js`:
```javascript
cookie: { 
  secure: true,  // wymaga HTTPS
  maxAge: 24 * 60 * 60 * 1000
}
```

### Wdrożenie na różnych platformach

#### Heroku
```bash
heroku create blackjack-trainer
git push heroku main
```

#### Vercel / Netlify
- Skonfiguruj jako Node.js app
- Ustaw build command: `npm install`
- Ustaw start command: `npm start`

#### VPS (Linux)
```bash
# Zainstaluj Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Sklonuj projekt
git clone <repo-url>
cd Inzynierka

# Zainstaluj zależności
npm install

# Użyj PM2 do zarządzania procesem
npm install -g pm2
pm2 start server.js --name blackjack-trainer
pm2 save
pm2 startup
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Konfiguracja (.env)

```env
# Port serwera
PORT=3000

# Klucz sesji (ZMIEŃ w produkcji!)
SESSION_SECRET=your-secret-key

# Środowisko
NODE_ENV=development

# Ścieżka do bazy danych
DB_PATH=./database/blackjack.db
```

## 🎓 Nauka Basic Strategy

Aplikacja wykorzystuje pełną **Basic Strategy Chart**:

### Twarde ręce (Hard Hands)
- Stań na 17+
- Dobieraj na 11 lub mniej
- 12-16: zależy od karty dealera

### Miękkie ręce (Soft Hands)
- As daje elastyczność
- Częste podwajanie przeciwko słabym kartom dealera

### Pary (Pairs)
- Zawsze rozdzielaj asy i ósemki
- Nigdy nie rozdzielaj dziesiątek
- Inne pary zależą od sytuacji

## 🔢 System liczenia Hi-Lo

- **Małe karty (2-6)**: +1
- **Neutralne (7-9)**: 0
- **Wysokie (10-A)**: -1

**Running Count** = suma wartości kart
**True Count** = Running Count ÷ pozostałe talie

## 🤝 Wsparcie

Jeśli napotkasz problemy:
1. Sprawdź czy Node.js jest zainstalowany: `node --version`
2. Upewnij się, że port 3000 jest wolny
3. Sprawdź logi w konsoli
4. Upewnij się, że wszystkie zależności są zainstalowane: `npm install`

## 📜 Licencja

Ten projekt jest stworzony do celów edukacyjnych.

## 🎯 Roadmap (przyszłe funkcje)

- [ ] Różne warianty blackjacka (European, Vegas, Atlantic City)
- [ ] Więcej systemów liczenia kart (KO, Omega II, Zen Count)
- [ ] Ranking graczy
- [ ] Tryb multiplayer
- [ ] Mobilna aplikacja
- [ ] Zaawansowane statystyki i wykresy
- [ ] Eksport/import postępów

---

**Powodzenia w nauce blackjacka! 🎰♠️♥️♦️♣️**
