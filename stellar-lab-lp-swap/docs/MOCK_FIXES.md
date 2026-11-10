# Fixes del Mock API Soroswap

## Problemas resueltos

### 1. Error BigInt a Number en `/quote`
**Archivo**: `mock-soroswap.js`  
**Función**: `handleQuote` / `simulateTrade`  
**Error**: `Cannot convert a BigInt value to a number`  
**Ubicación**: `Math.ceil(BigInt(amountOut) * BigInt(995) / BigInt(1000))`

**Solución**: Convertir a `Number()` antes de aplicar `Math.ceil()`:
```javascript
// Antes (fallido):
const threshold = Math.ceil(BigInt(amountOut) * BigInt(995) / BigInt(1000));

// Después (arreglado):
const amountOutNum = Number(amountOut);
const threshold = Math.ceil(amountOutNum * 995 / 1000);
```

### 2. POST /protocols retornaba 404
**Archivo**: `mock-soroswap.js`  
**Endpoint**: `/protocols`  
**Problema**: El enrutamiento solo aceptaba método GET  
**Solución**: Modificar el handler HTTP para aceptar tanto GET como POST:
```javascript
// En el handler del servidor:
if ((method === 'GET' || method === 'POST') && path === '/protocols') {
  result = await handleProtocols();
}
```

### 3. /quote requiere auth en modo mock
**Archivo**: `mock-soroswap.js`  
**Variable**: `REQUIRE_AUTH`  
**Configuración**: `MOCK_REQUIRE_AUTH=false`  
**Comportamiento**: En modo mock (`MOCK_REQUIRE_AUTH=false`), el endpoint `/quote` no requiere header Authorization, permitiendo testing sin configuración de credenciales.

## Configuración actual

```bash
# Modo mock (recomendado para testing)
MOCK_REQUIRE_AUTH=false MOCK_URL=http://localhost:3333 node orchestrator.js

# Con auth (modo realista)
MOCK_REQUIRE_AUTH=true SOROSWAP_API_KEY=sk_mock MOCK_URL=http://localhost:3333 node orchestrator.js
```

## Endpoints disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/protocols` | GET, POST | Lista protocolos disponibles: `["soroswap","sdex","aqua"]` |
| `/quote` | POST | Obtiene quote de simulación de swap |
| `/quote/build` | POST | Construye transacción XDR desde quote |