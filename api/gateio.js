// api/gateio.js
export default async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pair = url.searchParams.get("currency_pair") || "BTC_USDT";
  
    try {
      const response = await fetch(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`);
      const data = await response.json();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Failed to fetch data from Gate.io" }));
    }
  }
  