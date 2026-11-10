# Arquitectura Hexagonal — LabPOOL

Este documento describe la arquitectura hexagonal (puertos y adaptadores) del laboratorio `stellar-lab-lp-swap`.

## Visión general

El laboratorio compara dos implementaciones de pools de liquidez en Stellar:

1. **Mundo A — Pool Nativo de Stellar** (AMM del protocolo, LP no transferible)
2. **Mundo B — Soroswap / Aquarius** (Soroban, LP transferible SEP-41)

La arquitectura separa el **núcleo de dominio** (lógica de comparación, incentivos, estado de reservas) de los **adaptadores de infraestructura** (Horizon API, Soroswap API, servidor mock).

## Capas

### 1. Core (Dominio)

El core no depende de ninguna librería externa ni API. Define:

- `WorldResult` — estructura de resultado de cada mundo (native / soroban)
- `PoolStep` — cada paso ejecutado (deposit, swap, withdraw, quote, build, etc.)
- `IncentiveCalculation` — cálculo de incentivo del LP (fees retenidas, shares antes/después)
- `LiquidityPoolComparator` — lógica de comparación entre ambos mundos

### 2. Puertos (Interfaces)

Los puertos son contratos que definen qué operaciones debe soportar cada proveedor de pool:

| Puerto | Responsabilidad |
|--------|-----------------|
| `PoolProvider` | Listar protocolos, obtener información del pool |
| `SwapExecutor` | Ejecutar swaps (A → B) y obtener quotes |
| `LiquidityProvider` | Depositar y retirar liquidez |
| `TransferVerifier` | Verificar si un LP token es transferible entre cuentas |

### 3. Adaptadores (Implementaciones)

Cada mundo tiene su adaptador que implementa los puertos:

#### `StellarNativeAdapter` (Mundo A)
- Usa `stellar-sdk` v9 + Horizon API (`horizon-testnet.stellar.org`)
- Operaciones: `liquidityPoolDeposit`, `pathPaymentStrictSend` (swap), `liquidityPoolWithdraw`
- Verificación de transferibilidad: intenta `payment` con `liquidity_pool_shares` → **debe fallar**
- Funding: Friendbot (`friendbot.stellar.org`)

#### `SoroswapAdapter` (Mundo B)
- Usa `@soroswap/sdk` v0.5.0 + API REST (`api.soroswap.finance`)
- Operaciones: `/protocols`, `/quote`, `/quote/build`
- En modo mock: usa `mock-soroswap.js` (servidor local en puerto 3333)
- LP tokens: SEP-41, transferibles por diseño

## Flujo de ejecución

```
main()
├── runNativeWorld()          → StellarNativeAdapter
│   ├── crear cuentas (LP, Trader, Recipient)
│   ├── Friendbot funding
│   ├── crear activos + trustlines
│   ├── liquidityPoolDeposit (crea pool)
│   ├── pathPaymentStrictSend (swap A→B)
│   ├── liquidityPoolWithdraw
│   └── intentar transferir LP shares → FALLA (esperado)
│
└── runSoroswapWorld()        → SoroswapAdapter (real o mock)
    ├── list_protocols
    ├── get_quote
    ├── build_transaction
    └── calcular incentivo (nota)
```

## Modularidad

El cambio entre modo real y mock se controla exclusivamente por variable de entorno:

```bash
USE_SOROSWAP_MOCK=true    # usa servidor mock local
USE_SOROSWAP_MOCK=false   # usa API real de Soroswap
```

No se modifica código fuente para cambiar de modo.

## Directorio de código fuente

```
stellar-lab-lp-swap/src/
├── orchestrator.js   # Orquestador: coordina Mundo A y Mundo B
├── mock-soroswap.js  # Adaptador mock de Soroswap (servidor HTTP)
├── fund_accounts.js  # Generador de cuentas con Friendbot
└── test_faucets.js   # Pruebas de faucets externos (Triangle, Acachete)
```

## Configuración

```
stellar-lab-lp-swap/config/
└── env.template    # Plantilla de variables de entorno (copiar a .env)
```

## Datos de salida

```
stellar-lab-lp-swap/data/
└── data-completo.json   # Resultado completo de la ejecución (generado en runtime)
```

---

## Principios de diseño

1. **Separación de responsabilidades**: el core no sabe de Horizon ni de Soroswap.
2. **Inversión de dependencias**: los adaptadores implementan puertos definidos por el core.
3. **Configuración por entorno**: variables de entorno controlan el comportamiento sin tocar código.
4. **Observabilidad**: logs estructurados con emojis y archivo `data-completo.json` como fuente única de verdad.