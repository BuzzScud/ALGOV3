// Quick test script to verify Finnhub API is working
const FINNHUB_API_KEY = 'd18ueuhr01qkcat4uip0d18ueuhr01qkcat4uipg';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function testFinnhub() {
  console.log('Testing Finnhub API...\n');
  
  // Test quote endpoint
  try {
    const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=AAPL&token=${FINNHUB_API_KEY}`;
    console.log('Testing quote endpoint...');
    const quoteResp = await fetch(quoteUrl);
    const quoteData = await quoteResp.json();
    console.log('✓ Quote API working:', quoteData);
  } catch (err) {
    console.error('✗ Quote API failed:', err.message);
  }
  
  // Test history endpoint
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (30 * 24 * 60 * 60); // 30 days ago
    const historyUrl = `${FINNHUB_BASE_URL}/stock/candle?symbol=AAPL&resolution=D&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`;
    console.log('\nTesting history endpoint...');
    const histResp = await fetch(historyUrl);
    const histData = await histResp.json();
    console.log('✓ History API working:', {
      status: histData.s,
      dataPoints: histData.c?.length || 0,
      sample: histData.c?.slice(0, 5) || []
    });
  } catch (err) {
    console.error('✗ History API failed:', err.message);
  }
  
  console.log('\nTest complete!');
}

testFinnhub();

