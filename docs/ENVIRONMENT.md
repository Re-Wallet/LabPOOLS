# Variables de Entorno — LabPOOL

Todas las variables de entorno utilizadas por el laboratorio `stellar-lab-lp-swap`.

---

## Plantilla

Copia `config/env.template` a `.env` y edita con tus valores:

```bash
cp stellar-lab-lp-swap/config/env.template stellar-lab-lp-swap/.env
```

> ⚠️ Nunca commitees un archivo `.env` con claves reales. Está en `.gitignore`.

---

## Tabla completa de variables

### Core (ambos mundos)

| Variable | Obligatorio | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `USE_SOROSWAP_MOCK` | No | `false` | `true` para usar servidor mock local, `false` para API real |
| `MOCK_URL` | No (solo mock) | `http://localhost:3333` | URL del servidor mock de Soroswap |
| `MOCK_REQUIRE_AUTH` | No | `false` | `true` para exigir auth en modo mock |
| `SOROSWAP_API_KEY` | Sí (modo real) | — | API key de Soroswap (consíguela en console.soroswap.finance) |
| `SOROSWAP_BASE` | No | `https://api.soroswap.finance` | Base URL de la API de Soroswap |
| `SOROSWAP_NETWORK` | No | `testnet` | Red de Soroswap (testnet/mainnet) |
| `HORIZON_URL` | No | `https://horizon-testnet.stellar.org` | URL de Horizon para Stellar |
| `FRIENDBOT_URL` | No | `https://horizon-testnet.stellar.org/friendbot` | URL de Friendbot para funding |
| `NETWORK_PASSPHRASE` | No | `Testnet SDF Network ; September 2015` | Passphrase de la red Stellar |

### Mundo A (Pool Nativo de Stellar)

| Variable | Obligatorio | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `NATIVE_LP_SECRET` | No | — | Secret key de la cuenta LP (si no, se genera aleatoria) |
| `NATIVE_TRADER_SECRET` | No | — | Secret key de la cuenta trader |
| `NATIVE_RECIPIENT_SECRET` | No | — | Secret key de la cuenta recipient |
| `ASSET_A_CODE` | No | `USDC` | Código del activo A |
| `ASSET_B_CODE` | No | `XLM` | Código del activo B |
| `ASSET_A_ISSUER` | No | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` | Issuer del activo A |
| `ASSET_B_ISSUER` | No | `` (vacío) | Issuer del activo B (vacío para XLM nativo) |

### Mundo B (Soroswap / Soroban)

| Variable | Obligatorio | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `CONTRACT_TKA` | No | `CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK` | Contract ID token A (USDC) en Soroswap testnet |
| `CONTRACT_TKB` | No | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | Contract ID token B (XLM) en Soroswap testnet |
| `SOROSWAP_FROM` | No | trader.publicKey() | Dirección que firma la transacción built |

### Mock (servidor local)

| Variable | Obligatorio | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `MOCK_PORT` | No | `3333` | Puerto del servidor mock |

---

## Ejemplos de uso

### Modo mock (recomendado para empezar)

```bash
cd stellar-lab-lp-swap
USE_SOROSWAP_MOCK=true \
  MOCK_URL=http://localhost:3333 \
  MOCK_REQUIRE_AUTH=false \
  node src/orchestrator.js
```

### Modo real (requiere API key)

```bash
cd stellar-lab-lp-swap
USE_SOROSWAP_MOCK=false \
  SOROSWAP_API_KEY=sk_tu_clave_aqui \
  node src/orchestrator.js
```

### Con cuentas pre-configuradas (mundo nativo)

```bash
cd stellar-lab-lp-swap
NATIVE_LP_SECRET=SA... \
  NATIVE_TRADER_SECRET=SA... \
  NATIVE_RECIPIENT_SECRET=SA... \
  node src/orchestrator.js
```

---

## Seguridad

- Nunca subas claves secretas de cuentas Stellar ni API keys reales a GitHub.
- Usa `config/env.template` como referencia y crea tu propio `.env` local.
- El modo mock no requiere claves reales y es la forma más segura de probar.