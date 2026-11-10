// ============================================================
// stellar-lab-lp-swap/mock-soroswap.js
// Servidor mock de API Soroswap para testnet
// Simula: GET /protocols, POST /quote, POST /quote/build
// ============================================================
const http = require('http');
const { parse } = require('url');

const PORT = process.env.MOCK_PORT || 3333;
const API_KEY = process.env.SOROSWAP_API_KEY || 'sk_mock';
const NETWORK = 'testnet';

// Contract IDs (USDC y XLM en Soroswap testnet)
const CONTRACT_TKA = process.env.CONTRACT_TKA || 'CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK';
const CONTRACT_TKB = process.env.CONTRACT_TKB || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// Simular estado del pool con liquidez
const poolState = {
  reserveA: '1000000', // USDC
  reserveB: '2000000', // XLM
  lastTradePrice: '0.5',
};

// Si REQUIRE_AUTH es true, la API key es obligatoria; en modo mock por defecto no exige
const REQUIRE_AUTH = process.env.MOCK_REQUIRE_AUTH === 'true';

function authenticate(req) {
  if (!REQUIRE_AUTH) return null; // Modo mock: no exigir auth
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return { status: 401, body: { statusCode: 401, error: 'Unauthorized', code: 'MISSING_CREDENTIAL', message: 'Missing or invalid API key' } };
  }
  return null;
}

function buildResponse(body, status = 200) {
  return JSON.stringify(body);
}

// --- Helpers de mock ---

function simulateTrade(amountIn, reserveIn, reserveOut, feeBps = 30) {
  // Constant product formula: x * y = k
  // amountOut = (amountIn * reserveOut * (k - fee)) / (k * reserveIn + amountIn * fee)
  // Usamos k = 10000 para simplificar (fee del 0.3%)
  // NOTA: No modificamos las reservas para que cada quote sea independiente
  const k = BigInt(10000);
  const fee = BigInt(feeBps);
  const amountInBig = BigInt(amountIn);
  const reserveInBig = BigInt(reserveIn);
  const reserveOutBig = BigInt(reserveOut);

  // amountOut = (amountIn * reserveOut * (k - fee)) / (k * reserveIn + amountIn * fee)
  const numerator = amountInBig * reserveOutBig * (k - fee);
  const denominator = k * reserveInBig + amountInBig * fee;
  const amountOut = numerator / denominator;

  return { amountOut: amountOut.toString() };
}

// --- Endpoints ---

async function handleProtocols() {
  return { status: 200, body: ['soroswap', 'sdex', 'aqua'] };
}

async function handleQuote(body) {
  const { assetIn, assetOut, amount, tradeType, protocols, slippageBps } = body;

  if (!assetIn || !assetOut || !amount) {
    return { status: 400, body: { statusCode: 400, error: 'Bad Request', message: 'Missing required fields: assetIn, assetOut, amount' } };
  }

  // Simular quote basado en reservas del pool
  const result = simulateTrade(amount, poolState.reserveA, poolState.reserveB, 30);

  // Actualizar reservas simuladas (después del trade)
  poolState.reserveA = (BigInt(poolState.reserveA) + BigInt(amount)).toString();
  poolState.reserveB = (BigInt(poolState.reserveB) - BigInt(result.amountOut)).toString();

  const amountOut = result.amountOut;
  // Calcular threshold (0.5% de slippage por defecto)
  // Usar división BigInt con Math.ceil requiere convertir a número primero
  const amountOutNum = Number(amountOut);
  const threshold = Math.ceil(amountOutNum * 995 / 1000);

  const quote = {
    assetIn,
    assetOut,
    amount: amount,
    amountOut: amountOut.toString(),
    otherAmountThreshold: threshold.toString(),
    tradeType: tradeType || 'EXACT_IN',
    protocols: protocols || ['soroswap'],
    slippageBps: slippageBps || '50',
    routePlan: [{ protocol: 'soroswap', pool: CONTRACT_TKA + '-' + CONTRACT_TKB }],
    platform: 'aggregator',
    network: NETWORK,
    expiresAt: new Date(Date.now() + 180000).toISOString(),
  };

  return { status: 200, body: quote };
}

async function handleBuild(body) {
  const { quote, from, to, referralId } = body;

  if (!quote || !from) {
    return { status: 400, body: { statusCode: 400, error: 'Bad Request', message: 'Missing required fields: quote, from' } };
  }

  // Simular XDR de transacción (base64 con firma simulada)
  const mockXdr = `AAAAAgAAAACXDR simulated transaction ${from.substring(0, 6)}-${Date.now()} for quote ${quote.amountOut}`;
  
  const buildResponse = {
    xdr: mockXdr,
    transactionSize: mockXdr.length,
    minFee: '100',
    expiresAt: new Date(Date.now() + 180000).toISOString(),
    quote: { ...quote, network: NETWORK },
  };

  return { status: 200, body: buildResponse };
}

// --- Servidor HTTP ---

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Headers CORS y rate limit info
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', '4');
  res.setHeader('X-RateLimit-Reset', '1');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Determinar si exige auth (por defecto false en modo mock)
  if (REQUIRE_AUTH) {
    const authErr = authenticate(req);
    if (authErr) {
      res.writeHead(authErr.status, { 'Content-Type': 'application/json' });
      res.end(buildResponse(authErr.body, authErr.status));
      return;
    }
  }

  try {
    let result;

    // Enrutamiento de endpoints
    if ((method === 'GET' || method === 'POST') && path === '/protocols') {
      result = await handleProtocols();
    } else if (method === 'POST' && path === '/quote') {
      let body = '';
      for await (const chunk of req) body += chunk;
      result = await handleQuote(JSON.parse(body || '{}'));
    } else if (method === 'POST' && path === '/quote/build') {
      let body = '';
      for await (const chunk of req) body += chunk;
      result = await handleBuild(JSON.parse(body || '{}'));
    } else {
      result = { status: 404, body: { statusCode: 404, error: 'Not Found', message: 'Endpoint not found' } };
    }

    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(buildResponse(result.body, result.status));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(buildResponse({ statusCode: 500, error: 'Internal Server Error', message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🎭 Mock Soroswap API escuchando en http://localhost:${PORT}`);
  console.log(`   API Key: ${API_KEY}`);
  console.log(`   Red: ${NETWORK}`);
  console.log(`   Contratos: ${CONTRACT_TKA} / ${CONTRACT_TKB}`);
  console.log(`   Reservas iniciales: USDC=${poolState.reserveA}, XLM=${poolState.reserveB}`);
  console.log(`   REQUIRE_AUTH: ${REQUIRE_AUTH} (poner MOCK_REQUIRE_AUTH=true para exigir auth)`);
});

module.exports = { server, poolState, REQUIRE_AUTH };