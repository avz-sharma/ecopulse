/**
 * Vercel Serverless function proxy for Google Gemini API calls.
 * Secures the API key on the backend and includes exponential backoff retry logic.
 */
export default async function handler(req, res) {
  // Enforce standard CORS headers and POST method constraint
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: Gemini API Key is missing.' });
  }

  // Get parameters from incoming frontend request
  const { contents, systemInstruction, generationConfig, tools } = req.body;
  
  // Use recommended stable model for text/extraction logic
  const targetModel = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents,
    ...(systemInstruction && { systemInstruction }),
    ...(generationConfig && { generationConfig }),
    ...(tools && { tools })
  };

  // Exponential backoff runner
  const maxRetries = 5;
  let delay = 1000; // start with 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Handle successful execution
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data);
      }

      // If we encounter a rate limit (429) or transient server error (5xx), we retry
      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Gemini API failed after max retries: ${errText}` });
        }
      } else {
        // For other client errors (400, 403, 404), fail immediately to prevent endless loops
        const errText = await response.text();
        return res.status(response.status).json({ error: `Gemini API client error: ${errText}` });
      }
    } catch (err) {
      if (attempt === maxRetries) {
        return res.status(500).json({ error: `Network error processing Gemini API: ${err.message}` });
      }
    }

    // Wait before executing next attempt
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // Double the delay time
  }
}
