export default async function handler(req, res) {
  try {
    const { currency_pair } = req.query;
    const apiUrl = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${currency_pair}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Gate.io proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}