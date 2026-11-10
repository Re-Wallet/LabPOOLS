# Guía de Despliegue y Ejecución — LabPOOL

Este documento explica cómo ejecutar el laboratorio en diferentes entornos.

---

## Requisitos previos

- **Node.js** 18 o superior
- **npm** (incluido con Node.js)
- Acceso a internet (para Horizon testnet y Soroswap API)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Re-Wallet/LabPOOLS.git
cd LabPOOLS

# Instalar dependencias del laboratorio
cd stellar-lab-lp-swap
npm install
```

---

## Opción 1: Modo mock (recomendado para desarrollo y pruebas)

Este modo no requiere API key de Soroswap ni liquidez real. Usa un servidor local que simula los endpoints de Soroswap.

### Paso 1: Iniciar el servidor mock

```bash
cd stellar-lab-lp-swap
MOCK_PORT=3333 MOCK_REQUIRE_AUTH=false node src/mock-soroswap.js
```

Verás algo como:
```
🎭 Mock Soroswap API escuchando en http://localhost:3333
   API Key: sk_mock
   Red: testnet
   Contratos: CDWE... / CDLZ...
   Reservas iniciales: USDC=1000000, XLM=2000000
   REQUIRE_AUTH: false
```

### Paso 2: Ejecutar el orquestador (en otra terminal)

```bash
cd stellar-lab-lp-swap
USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 MOCK_REQUIRE_AUTH=false node src/orchestrator.js
```

### Paso 3: Revisar resultados

El resultado se guarda en:
```
stellar-lab-lp-swap/data/data-completo.json
```

---

## Opción 2: Modo real (API de Soroswap)

Requiere una API key válida de Soroswap.

### Paso 1: Obtener API key

Regístrate en [console.soroswap.finance](https://console.soroswap.finance) y obtén tu `SOROSWAP_API_KEY`.

### Paso 2: Ejecutar el orquestador

```bash
cd stellar-lab-lp-swap
USE_SOROSWAP_MOCK=false SOROSWAP_API_KEY=sk_tu_clave_aqui node src/orchestrator.js
```

> ⚠️ El plan Free tiene un límite de 1 req/s y burst 5. El orquestador incluye retry automático para 429 y 503.

---

## Opción 3: Mundo nativo con cuentas pre-fondeadas

Si ya tienes cuentas con fondos en Stellar testnet, usa sus secret keys para evitar depender de Friendbot:

```bash
cd stellar-lab-lp-swap
NATIVE_LP_SECRET=SA_TU_SECRET_LP \
  NATIVE_TRADER_SECRET=SA_TU_SECRET_TRADER \
  NATIVE_RECIPIENT_SECRET=SA_TU_SECRET_RECIPIENT \
  USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 MOCK_REQUIRE_AUTH=false \
  node src/orchestrator.js
```

---

## Generar y fondear cuentas nuevas (Friendbot)

```bash
cd stellar-lab-lp-swap
node src/fund_accounts.js
```

Esto genera 3 keypairs (LP, TRADER, RECIPIENT), intenta fondearlas con Friendbot y guarda el resultado en `data/funded-accounts.json`.

---

## Pruebas de faucets externos

```bash
cd stellar-lab-lp-swap
node src/test_faucets.js
```

Prueba los faucets de Triangle y Acachete para la dirección `GAG6G77TMOAMZJ4RHILGHI5YMOWTYPH7E2RBS3ICCCZDRUK33H2JKUQB`.

---

## Estructura de datos de salida

El archivo `data/data-completo.json` contiene:

```json
{
  "lab": "stellar-lp-swap-comparison",
  "network": "testnet",
  "executed_at": "2024-...",
  "worlds": {
    "native": { ... },
    "soroban": { ... }
  },
  "duration_ms": 12345
}
```

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `SOROSWAP_API_KEY no definida` | Configura tu API key o usa `USE_SOROSWAP_MOCK=true` |
| Friendbot timeout | Usa cuentas pre-fondeadas con `NATIVE_*_SECRET` |
| Rate limit 429 | Espera unos segundos y reintenta; el orquestador ya tiene retry |
| Mock no responde | Inicia `src/mock-soroswap.js` antes de ejecutar el orquestador |
| `node_modules` faltante | Ejecuta `npm install` en `stellar-lab-lp-swap/` |