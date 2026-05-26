/**
 * Routing czatu AI (Groq - llama-3.3-70b-versatile)
 * Endpoint POST /api/chat - wysyła wiadomość użytkownika do modelu Groq i zwraca odpowiedź.
 */

const express = require('express');
const Groq = require('groq-sdk');

const router = express.Router();

// System prompt - określa "osobowość" i kontekst trenera blackjacka
const SYSTEM_PROMPT = `Jesteś ekspertem od blackjacka i liczenia kart systemem Hi-Lo.
Odpowiadaj TYLKO na pytania dotyczące: zasad blackjacka, strategii gry,
liczenia kart, decyzji podczas gry (hit/stand/double/split/surrender)
oraz basic strategy. Jeśli pytanie nie dotyczy blackjacka, grzecznie
poinformuj że możesz pomagać tylko w tematach związanych z blackjackiem.
Odpowiadaj po polsku, krótko i konkretnie.`;

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
