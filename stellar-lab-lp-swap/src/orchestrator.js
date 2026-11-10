// ============================================================
// stellar-lab-lp-swap/orchestrator.js
// Laboratorio: Pool Nativo (LP no transferible) vs Soroswap API (LP transferible)
// ============================================================
// ============================================================
// ⚙️ COMPATIBILIDAD stellar-sdk v9: helpers para Pool ID
// ============================================================
const stellar = require('stellar-sdk');
const {
  Keypair,
  Asset,
  LiquidityPoolAsset,
  TransactionBuilder,
  Operation,
  Server,
  BASE_FEE,
  Networks,
  StrKey,
  getLiquidityPoolId,
} = stellar;
const fetch = require('node-fetch');
const fs = require('fs');

// --- SDK de Soroswap ---
const { SoroswapSDK, SupportedNetworks, SupportedProtocols, TradeType } = require('@soroswap/sdk');

// ============================================================
// 🛡️ RATE LIMITER — Plan Free: 1 req/s, burst 5
// Espera 1.2s entre requests para respetar el límite sostenido.
// ============================================================
let lastSoroswapRequest = 0;
const MIN_INTERVAL_MS = 1200; // un poco más de 1s para estar seguros

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastSoroswapRequest;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastSoroswapRequest = Date.now();
}

async function soroswapFetchWithRetry(path, body, maxRetries = 3) {
  const API_KEY = process.env.SOROSWAP_API_KEY;
  const BASE = process.env.SOROSWAP_BASE || 'https://api.soroswap.finance';
  const NETWORK = process.env.SOROSWAP_NETWORK || 'testnet';

  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}?network=${NETWORK}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Leer headers de rate limit
      const limit = res.headers.get('X-RateLimit-Limit');
      const remaining = res.headers.get('X-RateLimit-Remaining');
      const reset = res.headers.get('X-RateLimit-Reset');
      if (limit || remaining) {
        console.log(`   📊 RateLimit: limit=${limit}, remaining=${remaining}, reset=${reset}s`);
      }

      if (res.ok) {
        return res.json();
      }

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

      // 429 y 503 son retryable
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || parsed.retryAfter || parsed.message?.match(/(\d+)/)?.[1] || 2;
        const waitMs = parseInt(retryAfter) * 1000;
        console.log(`   ⏳ 429 Rate limit exceeded. Esperando ${retryAfter}s antes del reintento (intento ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (res.status === 503) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.log(`   ⚠️  503 Service unavailable. Reintentando en ${waitMs}ms (intento ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // 400, 401, 403, 500 no son retryable sin cambios
      throw new Error(`Soroswap API ${res.status}: ${parsed.message || parsed.detail || text}`);
    } catch (err) {
      if (attempt < maxRetries && (err.message.includes('429') || err.message.includes('503'))) {
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Soroswap API: agotados ${maxRetries} reintentos`);
}

// --- StrKey encoding para Liquidity Pool ID (no expuesto en stellar-sdk v9) ---
function crc16(data) {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc;
}
function base32encode(data) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}
function encodeLiquidityPoolId(data) {
  const versionByte = 0x66;
  const payload = Buffer.concat([Buffer.from([versionByte]), data]);
  const checksum = crc16(payload);
  const full = Buffer.concat([payload, Buffer.from([checksum >>> 8, checksum & 0xFF])]);
  return base32encode(full);
}

// --- Asset de tipo pool_share (evita validación de 12 chars de Asset) ---
const xdr = require('stellar-base').xdr;
function poolShareAsset(poolIdBuffer) {
  return {
    toXDRObject() {
      return xdr.Asset.poolShare(poolIdBuffer);
    },
    getAssetType() { return 'pool_share'; },
    code: encodeLiquidityPoolId(poolIdBuffer),
    issuer: '',
  };
}

// ============================================================
// ⚙️ CONFIGURACIÓN — LEE DE VARIABLES DE ENTORNO
// ============================================================
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = process.env.FRIENDBOT_URL || 'https://horizon-testnet.stellar.org/friendbot';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

const SOROSWAP_API_KEY = process.env.SOROSWAP_API_KEY;
const SOROSWAP_BASE = process.env.SOROSWAP_BASE || 'https://api.soroswap.finance';
const SOROSWAP_NETWORK = process.env.SOROSWAP_NETWORK || 'testnet';

// Activos de prueba
const ASSET_A_CODE = process.env.ASSET_A_CODE || 'USDC';
const ASSET_B_CODE = process.env.ASSET_B_CODE || 'XLM';
const ASSET_A_ISSUER = process.env.ASSET_A_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const ASSET_B_ISSUER = process.env.ASSET_B_ISSUER || '';

// Contract IDs de Soroswap/Aquarius en Testnet
const CONTRACT_TKA = process.env.CONTRACT_TKA || 'CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK';
const CONTRACT_TKB = process.env.CONTRACT_TKB || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

if (!SOROSWAP_API_KEY) {
  console.warn('⚠️  SOROSWAP_API_KEY no definida. El mundo Soroswap fallará.');
}
if (!ASSET_A_ISSUER || !ASSET_B_ISSUER) {
  console.warn('⚠️  ASSET_A_ISSUER / ASSET_B_ISSUER no definidos. El mundo nativo puede fallar.');
}

// ============================================================
// HELPERS
// ============================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fundAccount(publicKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Friendbot falló: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// MUNDO A — Pool Nativo de Stellar (LP NO transferible)
// ============================================================
async function runNativeWorld() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('🟢 MUNDO A: Pool Nativo (LP no transferible)');
  console.log('═════════════════════════════════════════════════════════════════');

  const server = new Server(HORIZON_URL);
  const data = {
    world: 'native',
    pool_type: 'protocol_native_amm',
    lp_transferable: false,
    lp_asset_type: 'liquidity_pool_shares',
    fee_bps: 30,
    executed_at: new Date().toISOString(),
    steps: [],
  };

  // 1. Cuentas — usar específicas via env vars o generar nuevas
  const lpSecret = process.env.NATIVE_LP_SECRET;
  const traderSecret = process.env.NATIVE_TRADER_SECRET;
  const recipientSecret = process.env.NATIVE_RECIPIENT_SECRET;

  const lp = lpSecret ? Keypair.fromSecret(lpSecret) : Keypair.random();
  const trader = traderSecret ? Keypair.fromSecret(traderSecret) : Keypair.random();
  const recipient = recipientSecret ? Keypair.fromSecret(recipientSecret) : Keypair.random();

  console.log('🔑 Cuentas:');
  console.log('  LP:', lp.publicKey());
  console.log('  TRADER:', trader.publicKey());
  console.log('  RECIPIENT:', recipient.publicKey());

  // 2. Fundar con Friendbot solo si no se proporcionó secret key (cuenta nueva)
  if (!lpSecret) {
    console.log('📥 Paso: fundando LP con Friendbot...');
    await fundAccount(lp.publicKey());
    console.log('   LP funded');
  } else {
    console.log('   LP usando cuenta existente (sin friendbot)');
  }
  if (!traderSecret) {
    console.log('📥 Paso: fundando TRADER con Friendbot...');
    await fundAccount(trader.publicKey());
    console.log('   TRADER funded');
  } else {
    console.log('   TRADER usando cuenta existente (sin friendbot)');
  }
  if (!recipientSecret) {
    console.log('📥 Paso: fundando RECIPIENT con Friendbot...');
    await fundAccount(recipient.publicKey());
    console.log('   RECIPIENT funded');
  } else {
    console.log('   RECIPIENT usando cuenta existente (sin friendbot)');
  }
  await sleep(3000);

  data.accounts = { lp: lp.publicKey(), trader: trader.publicKey(), recipient: recipient.publicKey() };

  // 3. Activos y Pool
  console.log('📥 Paso: creando activos y pool...');
  const assetA = ASSET_A_ISSUER ? new Asset(ASSET_A_CODE, ASSET_A_ISSUER) : new Asset(ASSET_A_CODE);
  const assetB = ASSET_B_ISSUER ? new Asset(ASSET_B_CODE, ASSET_B_ISSUER) : new Asset(ASSET_B_CODE);
  const poolAsset = new LiquidityPoolAsset(assetA, assetB, 30);
  const poolIdBuffer = getLiquidityPoolId('constant_product', { assetA, assetB, fee: 30 });
  const poolId = poolIdBuffer.toString('hex');
  data.pool_id = poolId;
  console.log('🏊 Pool ID:', poolId);

  // 4. Trustlines para los activos del pool (primero A y B, antes de crear el pool)
  async function changeTrust(sourceKp, asset) {
    const account = await server.loadAccount(sourceKp.publicKey());
    const tx = new TransactionBuilder(account, { fee: BASE_FEE * 10, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(300)
      .build();
    tx.sign(sourceKp);
    return server.submitTransaction(tx);
  }

  for (const acct of [lp, trader]) {
    for (const [label, asset] of [['A', assetA], ['B', assetB]]) {
      try {
        await changeTrust(acct, asset);
        console.log(`   Trustline ${label} OK para ${acct.publicKey().substring(0, 8)}...`);
      } catch (err) {
        console.log(`   ❌ Trustline ${label} falló para ${acct.publicKey().substring(0, 8)}...:`, err.message);
        throw err;
      }
    }
  }
  console.log('✅ Trustlines creados (A, B)');

  // 5. Depositar liquidez (esto crea el pool y el trustline de LP shares implícitamente)
  const depositAmountA = '1000';
  const depositAmountB = '2000';
  const lpAccount = await server.loadAccount(lp.publicKey());
  const depositTx = new TransactionBuilder(lpAccount, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.liquidityPoolDeposit({
      liquidityPoolId: poolIdBuffer,
      maxAmountA: depositAmountA,
      maxAmountB: depositAmountB,
      minPrice: '0.49',
      maxPrice: '0.51',
    }))
    .setTimeout(300)
    .build();
  depositTx.sign(lp);
  const depositRes = await server.submitTransaction(depositTx);
  data.steps.push({ step: 'deposit_liquidity', tx_hash: depositRes.hash, amount_a: depositAmountA, amount_b: depositAmountB, success: true });
  console.log('💧 Depósito:', depositRes.hash);

  // 6. Ahora sí, trustline para LP shares (ya existe después del depósito)
  const lpShareAsset = poolShareAsset(poolIdBuffer);
  await changeTrust(lp, lpShareAsset);
  await changeTrust(trader, lpShareAsset);
  console.log('✅ Trustline creado (LP shares)');
  await sleep(3000);
  const lpAccAfter = await server.loadAccount(lp.publicKey());
  const lpTl = lpAccAfter.balances.find(b => b.asset_type === 'liquidity_pool_shares' && b.asset_code === poolId);
  const sharesBefore = lpTl ? lpTl.balance : '0';
  console.log('🎫 LP shares antes:', sharesBefore);

  // 7. Reservas ANTES
  const poolBefore = await server.liquidityPools().pool(poolId).call();
  const raBefore = poolBefore.reserves.a;
  const rbBefore = poolBefore.reserves.b;
  console.log('📊 Reservas ANTES:', { a: raBefore, b: rbBefore });

  data.steps.push({ step: 'record_state_before_swap', shares_lp: sharesBefore, reserve_a: raBefore, reserve_b: rbBefore });

  // 8. Swap A → B (PathPaymentStrictSend)
  const traderAcc = await server.loadAccount(trader.publicKey());
  const swapTx = new TransactionBuilder(traderAcc, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.pathPaymentStrictSend({
      sendAsset: assetA,
      sendAmount: '100',
      destination: trader.publicKey(),
      destAsset: assetB,
      destMin: '95',
      path: [],
    }))
    .setTimeout(300)
    .build();
  swapTx.sign(trader);
  const swapRes = await server.submitTransaction(swapTx);
  data.steps.push({ step: 'execute_swap', tx_hash: swapRes.hash, send_asset: ASSET_A_CODE, send_amount: '100', dest_asset: ASSET_B_CODE, dest_min: '95', success: true });
  console.log('🔄 Swap:', swapRes.hash);

  // 9. Reservas DESPUÉS
  await sleep(4000);
  const poolAfter = await server.liquidityPools().pool(poolId).call();
  const raAfter = poolAfter.reserves.a;
  const rbAfter = poolAfter.reserves.b;
  console.log('📊 Reservas DESPUÉS:', { a: raAfter, b: rbAfter });

  data.steps.push({ step: 'record_state_after_swap', reserve_a: raAfter, reserve_b: rbAfter });

  // 10. Retirar liquidez
  const lpAcc2 = await server.loadAccount(lp.publicKey());
  const withdrawTx = new TransactionBuilder(lpAcc2, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.liquidityPoolWithdraw({ liquidityPoolId: poolIdBuffer, amount: '500', minAmountA: '0', minAmountB: '0' }))
    .setTimeout(300)
    .build();
  withdrawTx.sign(lp);
  const withdrawRes = await server.submitTransaction(withdrawTx);
  data.steps.push({ step: 'withdraw_liquidity', tx_hash: withdrawRes.hash, shares_burned: '500', success: true });
  console.log('🏧 Retiro:', withdrawRes.hash);

  // 11. Intentar transferir LP token (DEBE FALLAR)
  let transferAttempt = null;
  try {
    const lpAcc3 = await server.loadAccount(lp.publicKey());
    const transferTx = new TransactionBuilder(lpAcc3, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.payment({ destination: recipient.publicKey(), asset: lpShareAsset, amount: '10' }))
      .setTimeout(300)
      .build();
    transferTx.sign(lp);
    await server.submitTransaction(transferTx);
    transferAttempt = { success: true };
  } catch (err) {
    transferAttempt = { success: false, error: err.message, code: 'not_transferable' };
    console.log('❌ Transferencia rechazada (esperado):', err.message);
  }
  data.steps.push({ step: 'attempt_lp_transfer', ...transferAttempt });

  // 12. Estado final y cálculo de incentivo
  const lpAccFinal = await server.loadAccount(lp.publicKey());
  const lpTlFinal = lpAccFinal.balances.find(b => b.asset_type === 'liquidity_pool_shares' && b.asset_code === poolId);
  const sharesAfter = lpTlFinal ? lpTlFinal.balance : '0';

  data.steps.push({
    step: 'calculate_incentive',
    shares_before: sharesBefore,
    shares_after: sharesAfter,
    reserve_a_before: raBefore,
    reserve_b_before: rbBefore,
    reserve_a_after: raAfter,
    reserve_b_after: rbAfter,
    note: 'Fee 0.3% retenida en el pool.',
  });

  console.log('✅ Mundo A completado.');
  return data;
}

// ============================================================
// MUNDO B — Soroswap API (LP transferible, SEP-41)
// Usa mock-soroswap si USE_SOROSWAP_MOCK=true, sino API real
// ============================================================
async function runSoroswapWorld() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('🟣 MUNDO B: Soroswap API (LP transferible, SEP-41)');
  console.log('═════════════════════════════════════════════════════════════════');

  const data = {
    world: 'soroban',
    pool_type: 'soroban_amm',
    lp_transferable: true,
    lp_standard: 'SEP-41',
    executed_at: new Date().toISOString(),
    steps: [],
  };

  const USE_MOCK = process.env.USE_SOROSWAP_MOCK === 'true';
  const MOCK_URL = process.env.MOCK_URL || 'http://localhost:3333';

  // Cuentas para modo mock (si no se proporcionan secrets)
  let lp, trader, recipient;
  if (USE_MOCK) {
    lp = Keypair.random();
    trader = Keypair.random();
    recipient = Keypair.random();
    console.log('🔑 Cuentas generadas para modo mock:');
    console.log('  LP:', lp.publicKey());
    console.log('  TRADER:', trader.publicKey());
    console.log('  RECIPIENT:', recipient.publicKey());
  }

  if (!SOROSWAP_API_KEY && !USE_MOCK) {
    console.log('⚠️  SOROSWAP_API_KEY no definida y USE_SOROSWAP_MOCK=false. Saltando mundo Soroswap.');
    data.steps.push({ step: 'error', success: false, error: 'SOROSWAP_API_KEY_not_defined' });
    console.log('✅ Mundo B completado (sin API key ni mock).');
    return data;
  }

  // Helper para hacer requests al mock o a la API real
  async function soroswapRequest(path, body, maxRetries = 3) {
    const base = USE_MOCK ? MOCK_URL : SOROSWAP_BASE;
    const network = USE_MOCK ? '' : '?network=' + SOROSWAP_NETWORK;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(base + path + network, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(USE_MOCK ? {} : { 'Authorization': 'Bearer ' + SOROSWAP_API_KEY }),
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (res.ok) return res.json();

        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

        if (res.status === 429 || res.status === 503) {
          const retryAfter = res.headers.get('Retry-After') || parsed.retryAfter || 2;
          console.log(`   ⏳ ${res.status}. Esperando ${retryAfter}s... (intento ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000));
          continue;
        }

        throw new Error(`Soroswap ${res.status}: ${parsed.message || parsed.detail || text}`);
      } catch (err) {
        if (attempt < maxRetries && (err.message.includes('429') || err.message.includes('503') || err.message.includes('ECONNREFUSED'))) {
          console.log(`   ⚠️  ${err.message}. Reintentando...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Soroswap: agotados reintentos');
  }

  // 1. Protocolos disponibles
  try {
    console.log('📡 Paso: listando protocolos...');
    const protocolsRes = await soroswapRequest('/protocols', null);
    console.log('   Protocolos disponibles:', JSON.stringify(protocolsRes));
    data.steps.push({ step: 'list_protocols', protocols: protocolsRes, success: true });
  } catch (err) {
    console.log('   ⚠️  No se pudieron listar protocolos:', err.message);
    data.steps.push({ step: 'list_protocols', success: false, error: err.message });
  }

  // 2. Quote de swap
  if (CONTRACT_TKA && CONTRACT_TKB) {
    try {
      console.log('💱 Paso: obteniendo quote de swap...');
      const quote = await soroswapRequest('/quote', {
        assetIn: CONTRACT_TKA,
        assetOut: CONTRACT_TKB,
        amount: '100000000',
        tradeType: 'EXACT_IN',
        protocols: ['soroswap'],
        slippageBps: 50,
      });
      console.log('   Quote obtenido:', JSON.stringify(quote, null, 2));
      data.steps.push({ step: 'get_quote', quote, success: true });

      // 3. Build de transacción
      const SOROSWAP_FROM = process.env.SOROSWAP_FROM || trader.publicKey();
      try {
        console.log('   🔧 Paso: building transacción...');
        const built = await soroswapRequest('/quote/build', {
          quote: quote,
          from: SOROSWAP_FROM,
        });
        console.log('   ✅ Transacción built:', built.xdr ? built.xdr.substring(0, 60) + '...' : 'N/A');
        data.steps.push({ step: 'build_transaction', built: { xdr: built.xdr ? built.xdr.substring(0, 50) + '...' : 'N/A' }, success: true });
      } catch (err) {
        console.log('   ⚠️  Build falló:', err.message);
        data.steps.push({ step: 'build_transaction', success: false, error: err.message });
      }
    } catch (err) {
      console.log('   ⚠️  Quote falló:', err.message);
      data.steps.push({ step: 'get_quote', success: false, error: err.message });
    }
  } else {
    console.log('⚠️  CONTRACT_TKA / CONTRACT_TKB no definidos. Saltando quote.');
    data.steps.push({ step: 'get_quote', success: false, error: 'contract_ids_not_defined' });
  }

  // 4. Nota sobre incentivo
  data.steps.push({
    step: 'calculate_incentive',
    note: 'En Soroswap testnet (mock o real), la quote es simulada. Mide reservas antes/después para calcular incentivo del LP.',
  });

  console.log('✅ Mundo B completado.');
  return data;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const start = Date.now();
  const result = {
    lab: 'stellar-lp-swap-comparison',
    network: 'testnet',
    executed_at: new Date().toISOString(),
    worlds: {},
  };

  try {
    result.worlds.native = await runNativeWorld();
  } catch (err) {
    console.error('❌ Error Mundo A:', err.message);
    result.worlds.native = { error: err.message };
  }

  try {
    result.worlds.soroban = await runSoroswapWorld();
  } catch (err) {
    console.error('❌ Error Mundo B:', err.message);
    result.worlds.soroban = { error: err.message };
  }

  result.duration_ms = Date.now() - start;

  fs.writeFileSync('data-completo.json', JSON.stringify(result, null, 2));
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('💾 Resultado guardado en data-completo.json');
  console.log('═════════════════════════════════════════════════════════════════');

  const nat = result.worlds.native;
  const sor = result.worlds.soroban;
  console.log('\n📊 RESUMEN:');
  console.log('  Mundo A (nativo) LP transferible:', nat.lp_transferable);
  console.log('  Mundo B (Soroban) LP transferible:', sor.lp_transferable);
  const natTransfer = nat.steps?.find(s => s.step === 'attempt_lp_transfer');
  console.log('  Transfer LP nativo exitoso:', natTransfer ? natTransfer.success : 'no ejecutado');
  const sorQuote = sor.steps?.find(s => s.step === 'get_quote');
  console.log('  Quote Soroswap exitoso:', sorQuote ? sorQuote.success : 'no ejecutado');
}

main().catch(console.error);
