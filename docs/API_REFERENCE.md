# Referencia de API — Soroswap / Aquarius

Este documento referencia los endpoints de la API de Soroswap utilizados en el laboratorio, tanto en modo real como en modo mock.

---

## Base URL

| Entorno | URL |
|---------|-----|
| Testnet (real) | `https://api.soroswap.finance` |
| Mock (local) | `http://localhost:3333` |

---

## Endpoints

### 1. Listar protocolos

```
GET|POST /protocols?network=testnet
```

**Descripción**: Retorna los protocolos de swap disponibles.

**Respuesta (200)**:
```json
["soroswap", "sdex", "aqua"]
```

**Uso en el laboratorio**:
```javascript
const res = await fetch(`${BASE}/protocols?network=testnet`);
const protocols = await res.json(); // ["soroswap","sdex","aqua"]
```

---

### 2. Obtener quote de swap

```
POST /quote?network=testnet
```

**Headers**:
```
Authorization: Bearer <SOROSWAP_API_KEY>
Content-Type: application/json
```

**Body**:
```json
{
  "assetIn": "CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK",
  "assetOut": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  "amount": "100000000",
  "tradeType": "EXACT_IN",
  "protocols": ["soroswap"],
  "slippageBps": 50
}
```

**Respuesta (200)**:
```json
{
  "assetIn": "...",
  "assetOut": "...",
  "amount": "100000000",
  "amountOut": "99970000",
  "otherAmountThreshold": "99970000",
  "tradeType": "EXACT_IN",
  "protocols": ["soroswap"],
  "slippageBps": "50",
  "routePlan": [{ "protocol": "soroswap", "pool": "CONTRACT_TKA-CONTRACT_TKB" }],
  "platform": "aggregator",
  "network": "testnet",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}
```

**Uso en el laboratorio**:
```javascript
const quote = await soroswapRequest('/quote', {
  assetIn: CONTRACT_TKA,
  assetOut: CONTRACT_TKB,
  amount: '100000000',
  tradeType: 'EXACT_IN',
  protocols: ['soroswap'],
  slippageBps: 50,
});
```

---

### 3. Construir transacción desde quote

```
POST /quote/build?network=testnet
```

**Headers**:
```
Authorization: Bearer <SOROSWAP_API_KEY>
Content-Type: application/json
```

**Body**:
```json
{
  "quote": { ... },
  "from": "GAAAAA...",
  "to": "GBBBBB...",
  "referralId": null
}
```

**Respuesta (200)**:
```json
{
  "xdr": "AAAAAgAAAACXDR simulated transaction ...",
  "transactionSize": 1234,
  "minFee": "100",
  "expiresAt": "2024-01-01T00:00:00.000Z",
  "quote": { ... }
}
```

**Uso en el laboratorio**:
```javascript
const built = await soroswapRequest('/quote/build', {
  quote: quote,
  from: SOROSWAP_FROM,
});
```

---

## Rate limiting (Plan Free)

| Límite | Valor |
|--------|-------|
| Requests por segundo | 1 req/s |
| Burst | 5 requests |
| Headers de respuesta | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Código de error por exceso | `429 Too Many Requests` |

El orquestador implementa retry automático para `429` y `503`.

---

## Modo mock (servidor local)

El archivo `src/mock-soroswap.js` simula la API de Soroswap para pruebas sin depender de servicios externos.

**Endpoints del mock**:
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/protocols` | GET, POST | Retorna `["soroswap","sdex","aqua"]` |
| `/quote` | POST | Simula quote con fórmula constant product |
| `/quote/build` | POST | Retorna XDR simulado |

**Configuración**:
```bash
USE_SOROSWAP_MOCK=true
MOCK_URL=http://localhost:3333
MOCK_REQUIRE_AUTH=false
```

**Iniciar mock manualmente**:
```bash
cd stellar-lab-lp-swap
MOCK_PORT=3333 MOCK_REQUIRE_AUTH=false node src/mock-soroswap.js
```

---

## Códigos de error comunes

| Código | Significado |
|--------|-------------|
| `400` | Bad Request — faltan campos requeridos |
| `401` | Unauthorized — API key inválida o faltante |
| `404` | Not Found — endpoint no existe |
| `429` | Too Many Requests — rate limit excedido |
| `503` | Service Unavailable — servidor temporalmente no disponible |

---

## Enlaces oficiales

- Documentación Soroswap: https://docs.soroswap.finance
- Consola Soroswap (obtener API key): https://console.soroswap.finance
- Repositorio Soroswap SDK: https://www.npmjs.com/package/@soroswap/sdk