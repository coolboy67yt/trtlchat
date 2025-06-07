export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch('https://api.llm.vin/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("TeaTree API Error:", response.status, errorData);
      return res.status(response.status).json({ error: 'Failed to fetch from llm.vin', detail: errorData });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Proxy route error:", error);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
}
