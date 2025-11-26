// Test script to check if server can make outbound requests to Finnhub
// This helps diagnose if hosting provider is blocking outbound requests

const FINNHUB_API_KEY = 'd18ueuhr01qkcat4uip0d18ueuhr01qkcat4uipg';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function testServerConnectivity() {
  console.log('=== Server Connectivity Test ===\n');
  console.log('Testing if server can make outbound HTTPS requests...\n');
  
  // Test 1: Basic connectivity to Finnhub
  try {
    console.log('Test 1: Basic connectivity to Finnhub API...');
    const url = `${FINNHUB_BASE_URL}/quote?symbol=AAPL&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js/Express Server Test',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ SUCCESS: Server can reach Finnhub API');
      console.log('  Response:', data);
    } else {
      console.log('✗ FAILED: Got HTTP', response.status, response.statusText);
      const errorText = await response.text();
      console.log('  Error response:', errorText);
    }
  } catch (err) {
    console.log('✗ FAILED: Cannot reach Finnhub API');
    console.log('  Error type:', err.name);
    console.log('  Error code:', err.code);
    console.log('  Error message:', err.message);
    
    if (err.name === 'AbortError') {
      console.log('\n  → TIMEOUT: Request timed out. Server may be slow or blocked.');
    } else if (err.code === 'ENOTFOUND') {
      console.log('\n  → DNS ERROR: Cannot resolve finnhub.io domain. Check DNS/firewall.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('\n  → CONNECTION REFUSED: Firewall or security policy blocking outbound HTTPS.');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('\n  → TIMEOUT: Network timeout. Check firewall rules.');
    } else {
      console.log('\n  → UNKNOWN ERROR: Check server network configuration.');
    }
  }
  
  // Test 2: Check if we can reach any external HTTPS endpoint
  console.log('\nTest 2: Testing general HTTPS connectivity...');
  try {
    const testResponse = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    console.log('✓ SUCCESS: Server can make outbound HTTPS requests');
    console.log('  Status:', testResponse.status);
  } catch (err) {
    console.log('✗ FAILED: Server cannot make outbound HTTPS requests');
    console.log('  Error:', err.message);
    console.log('\n  → Your hosting provider may be blocking all outbound HTTPS requests.');
    console.log('  → Consider using client-side API calls instead of server-side.');
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nRecommendations:');
  console.log('1. If server cannot reach Finnhub: Move API calls to client-side (browser)');
  console.log('2. If timeout errors: Check firewall rules and network policies');
  console.log('3. If DNS errors: Verify DNS resolution on server');
  console.log('4. If connection refused: Contact hosting provider about outbound HTTPS restrictions');
}

testServerConnectivity();


