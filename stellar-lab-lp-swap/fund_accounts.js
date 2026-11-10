// ============================================================
// stellar-lab-lp-swap/fund_accounts.js
// Genera 3 keypairs (LP, TRADER, RECIPIENT) y las funda con Friendbot
// ============================================================
const stellar = require('stellar-sdk');
const { Keypair } = stellar;
const fetch = require('node-fetch');
const fs = require('fs');

const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const accounts = ['LP', 'TRADER', 'RECIPIENT'];

async function fundWithRetry(publicKey, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(FRIENDBOT_URL + '?addr=' + publicKey, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        console.log('   ✅ ' + publicKey.substring(0, 8) + '... funded (attempt ' + attempt + ')');
        return json;
      }
      console.log('   ⚠️  ' + publicKey.substring(0, 8) + '... Friendbot status ' + res.status + ' (attempt ' + attempt + ')');
    } catch (err) {
      console.log('   ⚠️  ' + publicKey.substring(0, 8) + '... Friendbot error: ' + err.message + ' (attempt ' + attempt + ')');
    }
    if (attempt < maxAttempts) {
      console.log('      Esperando 3s antes del siguiente intento...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

async function main() {
  console.log('==============================================================');
  console.log('Generando 3 keypairs para stellar-lab-lp-swap');
  console.log('==============================================================\n');

  const result = {};

  for (const name of accounts) {
    const kp = Keypair.random();
    const publicKey = kp.publicKey();
    const secretKey = kp.secret();

    console.log(name + ':');
    console.log('   Public Key: ' + publicKey);
    console.log('   Secret Key: ' + secretKey);

    // Intentar fondear con Friendbot
    console.log('   Solicitando fondos a Friendbot...');
    const friendbotRes = await fundWithRetry(publicKey);

    result[name] = {
      publicKey: publicKey,
      secretKey: secretKey,
      funded: friendbotRes !== null,
      friendbotResponse: friendbotRes,
    };

    console.log('');
  }

  // Guardar resultado
  const output = {
    generatedAt: new Date().toISOString(),
    network: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: 'Testnet SDF Network ; September 2015',
    accounts: result,
    instructions: [
      '1. Copia las Public Keys y pásalas por Friendbot si no se pudieron fondear:',
      '   https://friendbot.stellar.org?addr=<PUBLIC_KEY>',
      '2. Para Soroswap testnet, ve a https://faucet.soroswap.finance y solicita USDC + XLM',
      '3. Copia las variables a .env en stellar-lab-lp-swap/.env',
      '4. Ejecuta: cd stellar-lab-lp-swap && node orchestrator.js',
    ],
  };

  fs.writeFileSync('funded-accounts.json', JSON.stringify(output, null, 2));
  console.log('==============================================================');
  console.log('Información guardada en funded-accounts.json');
  console.log('==============================================================');
}

main().catch(console.error);
