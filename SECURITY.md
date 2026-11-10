# Security Policy

## Versiones soportadas

| Versión | Soportada |
|---------|-----------|
| 1.0.x   | ✅ Sí     |

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad, por favor **no abras un issue público**. Escríbenos directamente a:

- **Email**: security@rewallet.com (o abre un issue privado si GitHub lo permite)

Incluye:
- Descripción del problema
- Pasos para reproducir
- Impacto potencial
- Versión afectada

## Buenas prácticas de seguridad en este repo

- Nunca subas archivos `.env` con claves reales (están en `.gitignore`).
- Usa `env.template` como referencia y crea tu propio `.env` local.
- Las claves de API de Soroswap y secret keys de cuentas Stellar **nunca** se commitean.
- El modo mock (`USE_SOROSWAP_MOCK=true`) es la forma recomendada para pruebas sin exponer claves reales.

## Ámbito

Este laboratorio se ejecuta exclusivamente en **Stellar Testnet**. No se recomienda ejecutar con claves de mainnet ni fondos reales.