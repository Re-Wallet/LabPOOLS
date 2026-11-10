# Arquitectura General - stellar-lab-lp-swap

## Visión General

Este laboratorio compara dos enfoques fundamentales para pools de liquidez en el ecosistema Stellar:

1. **Mundo A**: Pool nativo de Stellar con LP shares no transferibles
2. **Mundo B**: Soroswap con LP shares transferibles (SEP-41)

La arquitectura está diseñada para ser modular, permitiendo cambiar entre modo real y modo mock mediante variables de entorno.

## Componentes del Sistema

### 1. mock-soroswap.js - Servidor de Simulación

**Propósito**: Simular la API de Soroswap para testing en testnet sin depender de liquidez real.

**Endpoints implementados**:
- `GET|POST /protocols` - Lista protocolos disponibles
- `POST /quote` - Obtiene quote de simulación de swap
- `POST /quote/build` - Construye transacción XDR desde quote

**Características clave**:
- Estado de pool simulado con reservas iniciales (USDC 1,000,000, XLM 2,000,000)
- AUTH opcional (`MOCK_REQUIRE_AUTH=false` por defecto)
- CORS habilitado para todos los orígenes
- Headers de rate-limit (`X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: 4`)
- Fórmula constant product para simulación de trades

**Variables de entorno**:
| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `MOCK_PORT` | `3333` | Puerto del servidor |
| `MOCK_REQUIRE_AUTH` | `false` | Exigir auth en modo mock |
| `CONTRACT_TKA` | `CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK` | Contract ID token A (USDC) |
| `CONTRACT_TKB` | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | Contract ID token B (XLM) |
| `poolState.reserveA` | `1000000` | Reservas iniciales USDC |
| `poolState.reserveB` | `2000000` | Reservas iniciales XLM |

**Fixes aplicados en esta sesión**:
1. BigInt to Number conversion en `handleQuote`
2. POST /protocols method support
3. MOCK_REQUIRE_AUTH=false por defecto

### 2. orchestrator.js - Orquestador Principal

**Propósito**: Coordinar la ejecución del laboratorio comparando ambos mundos.

**Flujo principal**:
1. Ejecutar Mundo A (native Stellar pool)
2. Ejecutar Mundo B (Soroban/mock)
3. Guardar resultados en `data-completo.json`
4. Mostrar resumen comparativo

**Modos de operación**:

#### Modo Mock (usado en esta sesión)
```bash
USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 MOCK_REQUIRE_AUTH=false node orchestrator.js
```

**Comportamiento en modo mock**:
- Genera cuentas keypair automáticamente para LP, TRADER, RECIPIENT
- Usa mock-soroswap.js para todos los pasos de Soroswap
- No depende de Friendbot para funding (cuentas generadas localmente)
- Todos los steps de Soroswap exitosos (list_protocols, get_quote, build_transaction)

#### Modo Real
```bash
USE_SOROSWAP_MOCK=false SOROSWAP_API_KEY=sk_mock node orchestrator.js
```

**Comportamiento en modo real**:
- Usa API real de Soroswap (`https://api.soroswap.finance`)
- Requiere SOROSWAP_API_KEY
- Sujeto a rate limits (plan Free: 1 req/s, burst 5)
- Dependiente de disponibilidad de liquidez en testnet

### 3. Variables de Entorno

**Core variables**:
| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `USE_SOROSWAP_MOCK` | No | `true` para modo mock, `false` para real |
| `MOCK_URL` | No (solo mock) | URL del servidor mock (ej: `http://localhost:3333`) |
| `MOCK_REQUIRE_AUTH` | No | `true`/`false` - exigir auth en mock |
| `SOROSWAP_API_KEY` | Sí (modo real) | API key de Soroswap |
| `HORIZON_URL` | No | URL de Horizon (testnet por defecto) |
| `FRIENDBOT_URL` | No | URL de Friendbot |

**Mundo A (Native) variables**:
| Variable | Descripción |
|----------|-------------|
| `NATIVE_LP_SECRET` | Secret key de la cuenta LP |
| `NATIVE_TRADER_SECRET` | Secret key de la cuenta trader |
| `NATIVE_RECIPIENT_SECRET` | Secret key de la cuenta recipient |
| `ASSET_A_CODE` | Código del activo A (USDC por defecto) |
| `ASSET_B_CODE` | Código del activo B (XLM por defecto) |
| `ASSET_A_ISSUER` | Issuer del activo A |
| `ASSET_B_ISSUER` | Issuer del activo B |

**Mundo B (Soroswap) variables**:
| Variable | Descripción |
|----------|-------------|
| `CONTRACT_TKA` | Contract ID token A de Soroswap |
| `CONTRACT_TKB` | Contract ID token B de Soroswap |
| `SOROSWAP_BASE` | Base URL de API Soroswap |
| `SOROSWAP_NETWORK` | Red (testnet/mainnet) |

## Flujo de Datos

### Mundo A - Native Stellar AMM

```
1. Generar/usar cuentas (LP, Trader, Recipient)
2. Friendbot funding (si no hay secrets proporcionados)
3. Create assets + trustlines
4. liquidityPoolDeposit (crea el pool)
5. liquidityPoolSwapExactIn (swap A → B)
6. liquidityPoolWithdraw (retirar liquidez)
7. payment LP shares (intenta transferir - DEBE FALLAR)
8. Guardar estado final
```

### Mundo B - Soroswap Mock

```
1. Generar cuentas mock (LP, Trader, Recipient)
2. list_protocols → ["soroswap","sdex","aqua"]
3. get_quote (simular trade, calcular amountOut)
4. build_transaction (construir XDR simulado)
5. Guardar resultados exitosos
```

## Consideraciones de Diseño

### 1. Modularidad
El uso de `USE_SOROSWAP_MOCK` permite cambiar entre modos sin modificar código, solo variables de entorno.

### 2. Isolation
Cada mundo ejecuta de forma independiente. El estado del mock no persiste entre requests (cada quote es independiente).

### 3. Error Handling
- Friendbot timeout es un constraint conocido, no un error del código
- Mock siempre retorna resultados consistentes (no depende de disponibilidad real)
- Retries automáticos para 429/503 en modo real

### 4. Seguridad
- No se escriben .env en disco (política de seguridad)
- Variables de entorno solo en proceso runtime
- Mock mode isola testing de mainnet risks

### 5. Observabilidad
- Logs coloreados con emojis para pasos clave
- `data-completo.json` como fuente única de verdad para resultados
- Timing `duration_ms` para medir performance

## Estructura de Directorio docs/

```
docs/
├── MOCK_FIXES.md        # Fixes técnicos del mock (3 items)
├── ORCHESTRATOR_CHANGES.md  # Cambios en orchestrator
├── LABORATORY_SUMMARY.md    # Resumen ejecutivo comparativo
└── ARCHITECTURE_OVERVIEW.md # Esta visión general
```

## Próximos Desarrollos

1. **Persistencia de state del mock**: Agregar opción para mantener estado de pool entre requests
2. **Más endpoints mock**: Implementar `/orderbook`, `/accounts` etc.
3. **Integración con Better Auth**: Probar flujo completo con autenticación real
4. **Comparación de gas**: Medir costo de transacciones nativas vs Soroswap build
5. **Modo híbrido**: Combinar datos reales de Horizon con simulación de Soroswap