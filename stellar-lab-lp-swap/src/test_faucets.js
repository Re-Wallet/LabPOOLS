const fetch = require('node-fetch');

async function main() {
  const ADDR = 'GAG6G77TMOAMZJ4RHILGHI5YMOWTYPH7E2RBS3ICCCZDRUK33H2JKUQB';

  // Probar faucet de Triangle
  try {
    console.log('Probando Triangle faucet...');
    const res = await fetch('https://faucet.triangleplatform.com/stellar/testnet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: ADDR }),
    });
    const text = await res.text();
    console.log('Triangle:', res.status, text.substring(0, 300));
  } catch(e) {
    console.log('Triangle error:', e.message);
  }

  await new Promise(r => setTimeout(r, 1000));

  // Probar faucet de Acachete
  try {
    console.log('\nProbando Acachete faucet...');
    const res = await fetch('https://faucet.acachete.com/api/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: ADDR, token: 'XLM' }),
    });
    const text = await res.text();
    console.log('Acachete:', res.status, text.substring(0, 300));
  } catch(e) {
    console.log('Acachete error:', e.message);
  }
}

main();
