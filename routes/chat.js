/**
 * Routing czatu AI (Groq - llama-3.3-70b-versatile)
 * Endpoint POST /api/chat - wysyła wiadomość użytkownika do modelu Groq i zwraca odpowiedź.
 */

const express = require('express');
const Groq = require('groq-sdk');

const router = express.Router();

// System prompt - określa "osobowość" i kontekst trenera blackjacka
const SYSTEM_PROMPT = `Jesteś trenerem blackjacka. Odpowiadaj TYLKO zgodnie z poniższą tabelą Basic Strategy. Nie używaj własnego rozumowania - tylko tabela poniżej jest prawdą.

TWARDE RĘCE (bez Asa):
- 8 lub mniej: zawsze HIT
- 9: DOUBLE przeciwko 3-6, reszta HIT
- 10: DOUBLE przeciwko 2-9, reszta HIT
- 11: zawsze DOUBLE
- 12: STAND przeciwko 4-6, reszta HIT
- 13: STAND przeciwko 2-6, reszta HIT
- 14: STAND przeciwko 2-6, reszta HIT
- 15: STAND przeciwko 2-6, reszta HIT
- 16: STAND przeciwko 2-6, reszta HIT
- 17 lub więcej: zawsze STAND

MIĘKKIE RĘCE (z Asem):
- As+2, As+3: DOUBLE przeciwko 5-6, reszta HIT
- As+4, As+5: DOUBLE przeciwko 4-6, reszta HIT
- As+6: DOUBLE przeciwko 3-6, reszta HIT
- As+7: STAND przeciwko 2,7,8 / DOUBLE przeciwko 3-6 / HIT przeciwko 9,10,As
- As+8 lub więcej: zawsze STAND

PARY:
- As-As: zawsze SPLIT
- 8-8: zawsze SPLIT
- 10-10: zawsze STAND
- 5-5: traktuj jak 10 (DOUBLE lub HIT)
- 4-4: HIT lub SPLIT przeciwko 5-6
- 2-2, 3-3: SPLIT przeciwko 2-7, reszta HIT
- 6-6: SPLIT przeciwko 2-6, reszta HIT
- 7-7: SPLIT przeciwko 2-7, reszta HIT
- 9-9: SPLIT przeciwko 2-9 oprócz 7, STAND przeciwko 7,10,As

Odpowiadaj po polsku. Gdy pytają o decyzję: podaj jedną konkretną odpowiedź z tabeli i krótko wyjaśnij dlaczego.`;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Tworzymy klienta Groq tylko raz (lazy init - po pierwszym wywołaniu z prawidłowym kluczem)
let groqClient = null;
function getGroqClient() {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  groqClient = new Groq({ apiKey });
  return groqClient;
}

// POST /api/chat - wysyła wiadomość użytkownika do Groq i zwraca odpowiedź
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Brak wiadomości' });
    }

    const client = getGroqClient();
    if (!client) {
      console.error('[CHAT] Brak GROQ_API_KEY w pliku .env - czat nie zadziała.');
      return res.status(500).json({ error: 'Serwer nie ma skonfigurowanego klucza Groq' });
    }

    // Wywołanie Groq Chat Completions (OpenAI-compatible API)
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim()
      || 'Brak odpowiedzi od modelu.';

    res.json({ answer });

  } catch (error) {
    console.error('[CHAT] Błąd Groq API:', error?.status || '', error?.message || error);

    // Groq SDK rzuca błędy z polem `status` - mapujemy je na czytelne komunikaty
    const status = error?.status;
    if (status === 429) {
      return res.status(429).json({
        error: 'AI chwilowo niedostępne - przekroczono limit zapytań do Groq. Spróbuj ponownie za chwilę.'
      });
    }
    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: 'Klucz Groq API jest nieprawidłowy lub nie ma uprawnień.'
      });
    }
    if (status === 400) {
      return res.status(400).json({
        error: 'Nieprawidłowe żądanie do Groq (np. zła konfiguracja modelu).'
      });
    }

    res.status(500).json({ error: 'Błąd serwera podczas komunikacji z AI' });
  }
});

module.exports = router;
