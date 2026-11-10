# Contributing to LabPOOL

Gracias por interesarte en contribuir a **LabPOOL** — laboratorio de pools de liquidez en Stellar comparando el AMM nativo contra Soroswap/Aquarius.

## Cómo contribuir

1. **Fork** el repositorio y crea una rama desde `main`.
2. Crea una rama descriptiva: `git checkout -b feat/mi-mejora` o `fix/mi-correccion`.
3. Haz tus cambios y asegúrate de que todo funcione:
   ```bash
   cd stellar-lab-lp-swap
   npm install
   USE_SOROSWAP_MOCK=true MOCK_URL=http://localhost:3333 MOCK_REQUIRE_AUTH=false node src/orchestrator.js
   ```
4. Commit con mensajes claros (estilo Conventional Commits):
   - `feat: ...` para nuevas características
   - `fix: ...` para correcciones
   - `docs: ...` para documentación
   - `refactor: ...` para refactorización
5. Push y abre un Pull Request describiendo qué cambiaste y por qué.

## Estructura del repositorio

```
LabPOOL/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── .gitignore
├── package.json
├── docs/                          # Documentación principal del repositorio
│   ├── ARCHITECTURE.md            # Arquitectura hexagonal
│   ├── MERMAID_DIAGRAMS.md        # Diagramas Mermaid
│   ├── API_REFERENCE.md           # Referencia de endpoints
│   ├── ENVIRONMENT.md             # Variables de entorno
│   ├── DEPLOYMENT.md              # Guía de despliegue
│   └── RESEARCH_LINKS.md          # Links de investigación y credibilidad
└── stellar-lab-lp-swap/           # Laboratorio Stellar LP Swap
    ├── src/
    │   ├── orchestrator.js        # Orquestador principal
    │   ├── mock-soroswap.js       # Servidor mock de Soroswap
    │   ├── fund_accounts.js       # Generador de cuentas con Friendbot
    │   └── test_faucets.js        # Pruebas de faucets testnet
    ├── config/
    │   └── env.template           # Plantilla de variables de entorno
    ├── data/                      # Datos generados en runtime (gitignored)
    │   ├── data-completo.json
    │   └── funded-accounts.json
    ├── package.json
    └── package-lock.json
```

## Código de conducta

Sé respetuoso, constructivo y colaborativo. Este es un proyecto de aprendizaje e investigación abierto.

## Licencia

MIT — ver [LICENSE](./LICENSE).