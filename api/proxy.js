// api/proxy.js

export default async function handler(req, res) {
    // Only allow POST requests to this endpoint
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  
    // Ensure you have set your API key in Vercel's environment variables
    const apiKey = "ur-api-key";
  
    const response = await fetch('https://api.teatree.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });
  
    // If the response is not ok, return the error
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch data from Tea Tree API' });
    }
  
    // Return the successful response from Tea Tree API
    const data = await response.json();
    return res.status(200).json(data);
  }