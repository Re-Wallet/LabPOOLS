# LabPOOL

> Laboratorio de pools de liquidez (LP) en Stellar — comparación entre **AMM nativo de Stellar** (LP no transferible) y **Soroswap / Aquarius** (LP transferible SEP-41) en Testnet.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-blue)](https://horizon-testnet.stellar.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Soroswap SDK](https://img.shields.io/badge/Soroswap-SDK%200.5.0-purple)](https://www.npmjs.com/package/@soroswap/sdk)
[![stellar-sdk](https://img.shields.io/badge/stellar--sdk-v9.1.0-blue)](https://www.npmjs.com/package/stellar-sdk)

---

## ¿Qué es este repositorio?

**LabPOOL** es un laboratorio educativo y de investigación que compara dos arquitecturas de pools de liquidez en el ecosistema Stellar:

| Característica | Mundo A: Pool Nativo Stellar | Mundo B: Soroswap / Aquarius |
|----------------|------------------------------|------------------------------|
| Tipo de pool | AMM nativo (Stellar Protocol) | Soroswap SDK (Soroban) |
| LP token | Liquidity Pool Shares (no transferible) | SEP-41 (transferible) |
| Transferible entre cuentas | ❌ No (falla intencionalmente) | ✅ Sí |
| Estándar | Protocol nativo AMM | SEP-41 |
| Red | Stellar Testnet | Soroswap Testnet |
| API | Horizon (`horizon-testnet.stellar.org`) | `api.soroswap.finance` |
| Friendbot | ✅ Para funding de cuentas | N/A (mock o API real) |

El objetivo es documentar y demostrar la diferencia fundamental: **en el AMM nativo de Stellar los LP shares no son transferibles entre cuentas, mientras que en Soroswap (SEP-41) sí lo son**.

---

## Estructura del repositorio

```
LabPOOL/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md          # Arquitectura hexagonal del sistema
│   ├── MERMAID_DIAGRAMS.md      # Diagramas Mermaid (visuales)
│   ├── API_REFERENCE.md         # Referencia de endpoints Soroswap
│   ├── ENVIRONMENT.md           # Variables de entorno
│   ├── DEPLOYMENT.md            # Guía de despliegue y ejecución
│   └── RESEARCH_LINKS.md        # Links de investigación y credibilidad
└── stellar-lab-lp-swap/         # Laboratorio Stellar LP Swap
    ├── src/
    │   ├── orchestrator.js      # Orquestador principal (dos mundos)
    │   ├── mock-soroswap.js     # Servidor mock de Soroswap para testing
    │   ├── fund_accounts.js     # Generador de cuentas con Friendbot
    │   └── test_faucets.js      # Pruebas de faucets testnet
    ├── config/
    │   └── env.template         # Plantilla de variables de entorno
    ├── data/                    # Datos generados en runtime (gitignored)
    │   ├── data-completo.json
    │   └── funded-accounts.json
    ├── package.json
    └── package-lock.json
```

---

## Comenzando rápidamente

### 1. Clonar el repositorio

```bash
git clone https://github.com/Re-Wallet/LabPOOLS.git
cd LabPOOLS
```

### 2. Instalar dependencias

```bash
cd stellar-lab-lp-swap
npm install
```

### 3. Configurar variables de entorno

Copia la plantilla y edita con tus valores:

```bash
cp config/env.template .env
```

Edita `.env` con tu `SOROSWAP_API_KEY` (obténla en [console.soroswap.finance](https://console.soroswap.finance)) si quieres usar la API real. Para pruebas rápidas usa el modo mock (ver abajo).

### 4. Ejecutar el laboratorio (modo mock — recomendado para empezar)

```bash
USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 MOCK_REQUIRE_AUTH=false node src/orchestrator.js
```

Esto iniciará el servidor mock de Soroswap en `http://localhost:3333` y ejecutará ambos mundos (nativo y Soroswap), guardando el resultado en `data/data-completo.json`.

### 5. Ejecutar con API real de Soroswap

```bash
USE_SOROSWAP_MOCK=false SOROSWAP_API_KEY=tu_api_key_aqui node src/orchestrator.js
```

---

## Arquitectura hexagonal

Este proyecto sigue los principios de **arquitectura hexagonal (puertos y adaptadores)**:

- **Core (dominio)**: lógica de comparación de pools, cálculo de incentivos, estado de reservas.
- **Puertos (interfaces)**: `PoolProvider`, `SwapExecutor`, `LiquidityProvider`.
- **Adaptadores (implementaciones)**:
  - `StellarNativeAdapter` → Horizon API + `stellar-sdk`
  - `SoroswapAdapter` → API REST de Soroswap o servidor mock local

Ver documentación completa: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Diagramas (Mermaid)

Los diagramas visuales están en [docs/MERMAID_DIAGRAMS.md](./docs/MERMAID_DIAGRAMS.md) e incluyen:

1. **Arquitectura hexagonal** — puertos, adaptadores y core
2. **Flujo Mundo A (nativo)** — deposit → swap → withdraw → transfer fallido
3. **Flujo Mundo B (Soroswap)** — protocols → quote → build transaction
4. **Comparativa de transferibilidad de LP tokens**

---

## Documentación técnica

| Documento | Contenido |
|-----------|-----------|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Arquitectura hexagonal, puertos, adaptadores, diseño modular |
| [`docs/MERMAID_DIAGRAMS.md`](./docs/MERMAID_DIAGRAMS.md) | Diagramas Mermaid de flujos y arquitectura |
| [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) | Endpoints de Soroswap, ejemplos de request/response |
| [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) | Todas las variables de entorno, tabla completa |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Cómo desplegar y ejecutar en diferentes entornos |
| [`docs/RESEARCH_LINKS.md`](./docs/RESEARCH_LINKS.md) | Links de investigación, documentación oficial, credibilidad |

---

## Hallazgos clave (para tesis e investigación)

1. **LP tokens no transferibles en Stellar nativo**: Al intentar transferir un `liquidity_pool_shares` entre cuentas en el AMM nativo, la operación es rechazada por la red. Esto es comportamiento por diseño del protocolo Stellar.

2. **LP tokens transferibles en Soroswap (SEP-41)**: Los LP shares implementan el estándar SEP-41, permitiendo transferencia libre entre cuentas, lo que habilita casos de uso como collateral en DeFi, mercados secundarios de LP, etc.

3. **Friendbot es limitado**: Para funding de cuentas en testnet, Friendbot tiene timeouts y rate limits. Se recomienda usar cuentas pre-fondeadas para ejecuciones completas del mundo nativo.

4. **Mock vs API real**: El servidor mock permite validar flujos sin depender de liquidez real ni rate limits de Soroswap (plan Free: 1 req/s, burst 5).

---

## Créditos y enlaces de investigación

Ver [`docs/RESEARCH_LINKS.md`](./docs/RESEARCH_LINKS.md) para:
- Documentación oficial de Stellar (developers.stellar.org)
- Documentación de Soroswap (docs.soroswap.finance)
- SEP-41 (Stellar Ecosystem Proposal)
- Contracts de Soroswap en testnet
- Faucets y herramientas de testnet

---

## Licencia

MIT — ver [LICENSE](./LICENSE). Este es un proyecto de investigación educativo; no se recomienda usar con fondos reales en mainnet sin auditoría previa.