export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, shows } = req.body;

  if (!keyword || !shows || shows.length === 0) {
    return res.status(400).json({ error: 'Missing keyword or shows' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `You are a helpful assistant that finds kids TV episodes matching a topic or keyword.

The parent wants episodes from these shows: ${shows.join(', ')}.
They are searching for: "${keyword}"

Return a JSON array of matching episodes. Each object must have:
- "show": exact show name from the list
- "title": episode title
- "season": season number (integer or null)
- "episode": episode number (integer or null)
- "description": 2-3 sentences about the episode and why it matches the topic (written warmly for a parent)
- "themes": array of 2-4 short theme tags (e.g. "sharing", "friendship", "ocean life")

Return 2-4 episodes per show that best match. If a show has no clear match, skip it.
Return ONLY valid JSON array, no markdown, no explanation, no backticks.
Example: [{"show":"Bluey","title":"Markets","season":1,"episode":12,"description":"...","themes":["sharing","community","family"]}]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const episodes = JSON.parse(clean);

    return res.status(200).json({ episodes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
