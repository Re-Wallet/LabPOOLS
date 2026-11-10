# Enlaces de Investigación y Credibilidad — LabPOOL

Recursos oficiales, documentación y datos verificables utilizados como base para este laboratorio.

---

## Documentación oficial de Stellar

| Recurso | URL | Descripción |
|---------|-----|-------------|
| Stellar Developers | https://developers.stellar.org | Documentación principal de la red Stellar |
| Stellar Horizon API | https://developers.stellar.org/docs/data | API de datos de Horizon (testnet/mainnet) |
| Stellar SDK JavaScript | https://developers.stellar.org/docs/js-stellar-sdk | Referencia de `stellar-sdk` |
| Liquidity Pools (AMM) | https://developers.stellar.org/docs/glossary#liquidity-pool | Concepto de pools nativos de Stellar |
| Friendbot | https://developers.stellar.org/docs/friendbot | Faucet para testnet |
| SEP-41 | https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md | Stellar Ecosystem Proposal: Transferible Token |

---

## Soroswap / Aquarius

| Recurso | URL | Descripción |
|---------|-----|-------------|
| Soroswap Docs | https://docs.soroswap.finance | Documentación oficial de Soroswap |
| Soroswap Console | https://console.soroswap.finance | Consola para obtener API key y gestionar claves |
| Soroswap SDK (npm) | https://www.npmjs.com/package/@soroswap/sdk | Paquete oficial del SDK de JavaScript |
| Soroswap API | https://api.soroswap.finance | Endpoint de la API REST (testnet/mainnet) |
| Aquarius (Soroswap) | https://aquarius.soroswap.finance | Interfaz de Aquarius construida sobre Soroswap |

---

## Contratos verificados en Testnet (Soroswap)

| Contrato | ID | Descripción |
|----------|-----|-------------|
| Token A (USDC) | `CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK` | Contract ID de USDC en Soroswap testnet |
| Token B (XLM) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | Contract ID de XLM en Soroswap testnet |

> Estos IDs están definidos en `config/env.template` y utilizados en `src/orchestrator.js`.

---

## Faucets y herramientas de Testnet

| Recurso | URL | Descripción |
|---------|-----|-------------|
| Friendbot Stellar | https://friendbot.stellar.org | Faucet oficial de Stellar para testnet |
| Triangle Faucet | https://faucet.triangleplatform.com/stellar/testnet | Faucet alternativo de Triangle |
| Acachete Faucet | https://faucet.acachete.com | Faucet alternativo de Acachete |
| Stellar Expert Testnet | https://stellar.expert/explorer/testnet | Explorador de bloques para testnet |

---

## Herramientas de desarrollo utilizadas

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Node.js | 18+ | Runtime de JavaScript |
| stellar-sdk | 9.1.0 | SDK oficial de Stellar para JS |
| @soroswap/sdk | 0.5.0 | SDK de Soroswap para interaccionar con su API |
| node-fetch | 2.7.0 | Cliente HTTP para requests a Horizon y Soroswap |

---

## Datos comprobados en este laboratorio

| Dato | Valor | Verificable en |
|------|-------|----------------|
| Red utilizada | Stellar Testnet | `horizon-testnet.stellar.org` |
| Fee del pool nativo | 30 bps (0.3%) | `stellar-sdk` `LiquidityPoolAsset` con fee 30 |
| LP shares nativo | No transferible | Fallo verificado al intentar `payment` con `liquidity_pool_shares` |
| LP Soroswap | Transferible (SEP-41) | Diseño del estándar SEP-41 y mock implementado |
| Plan Free Soroswap | 1 req/s, burst 5 | Rate limits documentados en la API |

---

## Cómo citar este laboratorio

Si usas este repositorio en una tesis, investigación o proyecto académico, por favor referencia:

```
Re-Wallet. LabPOOL: Laboratorio de pools de liquidez en Stellar (AMM nativo vs Soroswap SEP-41).
https://github.com/Re-Wallet/LabPOOLS
```

---

## Licencia

MIT — ver [LICENSE](../LICENSE). Proyecto de investigación educativo.