# Diagramas Mermaid — LabPOOL

Diagramas visuales de la arquitectura y flujos del laboratorio. Copia cualquier bloque en [Mermaid Live Editor](https://mermaid.live) para renderizar.

---

## 1. Arquitectura Hexagonal (Puertos y Adaptadores)

```mermaid
graph TD
    subgraph Core["Core (Dominio)"]
        DirectionLR
        C1[LiquidityPoolComparator]
        C2[IncentiveCalculation]
        C3[WorldResult]
        C4[PoolStep]
    end

    subgraph Ports["Puertos (Interfaces)"]
        DirectionLR
        P1[PoolProvider]
        P2[SwapExecutor]
        P3[LiquidityProvider]
        P4[TransferVerifier]
    end

    subgraph Adapters["Adaptadores (Infraestructura)"]
        DirectionLR
        A1[StellarNativeAdapter<br/>stellar-sdk + Horizon]
        A2[SoroswapAdapter<br/>Soroswap SDK + API REST]
        A3[MockSoroswapServer<br/>Servidor local :3333]
    end

    C1 --- P1
    C1 --- P2
    C1 --- P3
    C1 --- P4

    P1 -.-> A1
    P2 -.-> A1
    P3 -.-> A1
    P4 -.-> A1

    P1 -.-> A2
    P2 -.-> A2

    A2 -.-> A3

    O[orchestrator.js<br/>Mundo A + Mundo B] --> C1
    O --> A1
    O --> A2
    O --> A3

    style Core fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Ports fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style Adapters fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style O fill:#e8f5e9,stroke:#1b5e20,stroke-width:3px
```

---

## 2. Flujo Mundo A — Pool Nativo de Stellar

```mermaid
sequenceDiagram
    participant O as Orquestador
    participant LP as Cuenta LP
    participant TR as Cuenta Trader
    participant HZ as Horizon API
    participant FB as Friendbot

    O->>FB: Funding LP, Trader, Recipient
    FB-->>O: Cuentas fondeadas
    O->>HZ: Crear trustlines USDC + XLM
    HZ-->>O: Trustlines OK
    O->>HZ: liquidityPoolDeposit (1000 USDC + 2000 XLM)
    HZ-->>O: Pool creado + TX hash
    O->>HZ: pathPaymentStrictSend (100 USDC → XLM)
    HZ-->>O: Swap ejecutado
    O->>HZ: liquidityPoolWithdraw (500 shares)
    HZ-->>O: Retiro OK
    O->>HZ: Intentar transferir LP shares a Recipient
    HZ-->>O: ❌ Rechazado (LP no transferible)
    O->>O: Guardar data-completo.json
```

---

## 3. Flujo Mundo B — Soroswap / Aquarius (mock o real)

```mermaid
sequenceDiagram
    participant O as Orquestador
    participant M as Mock Soroswap (:3333)
    participant API as API Soroswap Real

    alt Modo Mock
        O->>M: GET/POST /protocols
        M-->>O: ["soroswap","sdex","aqua"]
        O->>M: POST /quote (USDC→XLM, 100000000)
        M-->>O: Quote con amountOut simulado
        O->>M: POST /quote/build
        M-->>O: XDR simulado
    else Modo Real
        O->>API: POST /protocols?network=testnet
        API-->>O: Protocolos disponibles
        O->>API: POST /quote?network=testnet
        API-->>O: Quote real
        O->>API: POST /quote/build?network=testnet
        API-->>O: XDR de transacción
    end
    O->>O: Guardar data-completo.json
```

---

## 4. Comparativa de Transferibilidad de LP Tokens

```mermaid
graph LR
    subgraph MundoA["Mundo A — Stellar Nativo"]
        direction TB
        A1[LP Deposita liquidez]
        A2[Recibe liquidity_pool_shares]
        A3{Intentar transferir<br/>LP shares}
        A4[❌ Rechazado por la red<br/>LP NO transferible]
        A1 --> A2 --> A3 --> A4
    end

    subgraph MundoB["Mundo B — Soroswap SEP-41"]
        direction TB
        B1[LP Deposita liquidez]
        B2[Recibe LP token SEP-41]
        B3{Transferir LP token<br/>entre cuentas}
        B4[✅ Transferencia exitosa<br/>LP transferible]
        B1 --> B2 --> B3 --> B4
    end

    style MundoA fill:#ffebee,stroke:#c62828,stroke-width:2px
    style MundoB fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A4 fill:#ffcdd2,stroke:#c62828
    style B4 fill:#c8e6c9,stroke:#2e7d32
```

---

## 5. Flujo de datos completo (orchestrator)

```mermaid
flowchart TD
    Start([Inicio]) --> Config[Leer variables de entorno]
    Config --> Native{Mundo A:<br/>Native Stellar?}
    Native -->|Sí| FundA[Friendbot funding]
    FundA --> TrustA[Crear trustlines USDC/XLM]
    TrustA --> DepositA[liquidityPoolDeposit]
    DepositA --> SwapA[pathPaymentStrictSend Swap A→B]
    SwapA --> WithdrawA[liquidityPoolWithdraw]
    WithdrawA --> TransferA[Intentar transferir LP shares<br/>→ FALLA esperada]
    TransferA --> ResultA[Guardar resultado Mundo A]

    Native -->|No / Paralelo| Mock{USE_SOROSWAP_MOCK?}
    Mock -->|true| MockServer[Iniciar mock-soroswap.js :3333]
    Mock -->|false| RealAPI[Usar API real Soroswap]
    MockServer --> Proto[GET/POST /protocols]
    RealAPI --> Proto
    Proto --> Quote[POST /quote USDC→XLM]
    Quote --> Build[POST /quote/build]
    Build --> ResultB[Guardar resultado Mundo B]

    ResultA --> Merge[Unir resultados en data-completo.json]
    ResultB --> Merge
    Merge --> End([Fin: data-completo.json])

    style End fill:#e8f5e9,stroke:#1b5e20,stroke-width:3px
    style Start fill:#e8f5e9,stroke:#1b5e20,stroke-width:3px
```

---

## 6. Despliegue de datos (estado del pool)

```mermaid
stateDiagram-v2
    [*] --> CuentasCreadas
    CuentasCreadas --> TrustlinesCreadas
    TrustlinesCreadas --> PoolCreado
    PoolCreado --> LiquidezDepositada
    LiquidezDepositada --> SwapEjecutado
    SwapEjecutado --> ReservasActualizadas
    ReservasActualizadas --> LiquidezRetirada
    LiquidezRetirada --> TransferenciaIntentada
    TransferenciaIntentada --> [*]

    note right of PoolCreado: Pool ID generado<br/>Reservas iniciales registradas
    note right of SwapEjecutado: 0.3% fee retenida<br/>en el pool
    note right of TransferenciaIntentada: Mundo A: ❌ Rechazada<br/>Mundo B: ✅ Permitida (SEP-41)
```

---

> **Nota**: Estos diagramas están diseñados para usarse en documentación, presentaciones y tesis. Todos son rendereables con [Mermaid Live Editor](https://mermaid.live).