# Cambios en orchestrator.js

## Agregado de soporte para modo mock

### Variable de entorno `USE_SOROSWAP_MOCK`
**Propósito**: Alternar entre API real de Soroswap y mock local para testing.

**Uso**:
```bash
# Modo mock (usado en este laboratorio)
USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 node orchestrator.js

# Modo real (requiere API key)
USE_SOROSWAP_MOCK=false SOROSWAP_API_KEY=sk_mock node orchestrator.js
```

### Generación automática de cuentas en modo mock
**Archivo**: `orchestrator.js` - función `runSoroswapWorld()`

Cuando `USE_SOROSWAP_MOCK=true`, el orquestador genera automáticamente 3 cuentas keypair para:
- **LP**: Liquidity Provider (pool)
- **TRADER**: Cuenta que ejecuta el swap
- **RECIPIENT**: Destinatario de los LP tokens transferidos

**Salida de ejemplo**:
```
🔑 Cuentas generadas para modo mock:
  LP: GCKZW44V3M2RRNISTOJAM5UUJVNF5LOAMEM7DRP2GOSOQ2TSVN3FA7PF
  TRADER: GAMRH3WELNGJ473HB4J62ILOAKJR5OHPXO5L4S3NUFL5WT674EEJUWO2
  RECIPIENT: GCAF3M3KBNEE2VWASLUFK7OQOW5TMFACUOVVXJQ4M7HJLC7DE5A6LDXA
```

### Cuenta SOROSWAP_FROM
**Variable**: `SOROSWAP_FROM`  
**Uso**: Define qué cuenta firma la transacción built. Si no está definida, se usa la clave pública del trader generado.

```javascript
const SOROSWAP_FROM = process.env.SOROSWAP_FROM || trader.publicKey();
```

### Flujo completado en modo mock

1. **list_protocols** ✅ - Retorna `["soroswap","sdex","aqua"]`
2. **get_quote** ✅ - Retorna quote con amountOut simulado
3. **build_transaction** ✅ - Retorna XDR simulado con `AAAAAgAAAACXDR simulated transaction ...`
4. **calculate_instruction** ✅ - Nota sobre incentivo del LP

## Mundo A vs Mundo B - Resumen de comportamiento

| Característica | Mundo A (Native) | Mundo B (Soroban/mock) |
|----------------|------------------|------------------------|
| **Tipo de LP** | Liquidity Pool Shares (no transferible) | SEP-41 Transferible LP |
| **Transferencia LP** | ❌ Fallaría en nativo | ✅ Exitosa en mock |
| **Standard** | Protocol nativo AMM | SEP-41 |
| **Quote/Build** | Horizon liquidity pools API | Mock endpoints `/quote` y `/quote/build` |
| **Network** | TESTNET de Stellar | TESTNET de Soroswap/Astrader |

## Consideraciones importantes

1. **Friendbot timeout**: Mundo A usa Friendbot para fundar cuentas nuevas, el cual tiene timeout de 15s. Para ejecuciones completas, usar cuentas ya fondeadas (como GAG6G77TMOAMZJ4RHILGHI5YMOWTYPH7E2RBS3ICCCZDRUK33H2JKUQB).

2. **Pool state depletion**: El mock no modifica reservas entre requests, por lo que cada quote es independiente y siempre retorna resultados consistentes.

3. **Auth en mock**: Por defecto `MOCK_REQUIRE_AUTH=false`. Para testing realista, usar `MOCK_REQUIRE_AUTH=true` con `SOROSWAP_API_KEY=sk_mock`.

4. **Rate limiting**: El mock incluye headers `X-RateLimit-Limit: 5` y `X-RateLimit-Remaining: 4`, simiendo el plan Free de Soroswap (1 req/s, burst 5).