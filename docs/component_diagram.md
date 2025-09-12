```mermaid
flowchart LR
  %% Clients
  subgraph Client_Host["MCP Client / Host"]
    CD[Claude Desktop\n(MCP Host)]
  end

  %% MCP Server
  subgraph MCP_Server["Aya Hedera Gigs MCP Server\nhttps://ayamcp-hgigs.onrender.com/"]
    MCP[HGigs MCP\n(Model Context Protocol)]
  end

  %% DApp
  subgraph Hedera_MCP_Dapp["Hedera MCP Dapp\n(Hedera Gigs Marketplace)"]
    UI[Web UI / API Layer]
  end

  %% On-chain
  subgraph Hedera_Chain["Hedera Network (Testnet/Mainnet)"]
    GM[GigMarketplace Contract\n(Solidity / EVM)]
    %% Optional but common infra touchpoints:
    RPC[Hedera JSON-RPC Relay\n(read/write)]
    MN[Mirror Node\n(read/Index)]
  end

  %% Indexer (WIP)
  subgraph Indexer["Hedera Gig Marketplace Indexer (WIP)"]
    IDX[Custom Indexer Service]
    DB[(Indexer DB)]
  end

  %% Edges
  CD -- "MCP Tool Calls\n(JSON-RPC over stdio/WebSocket via MCP Host)" --> MCP
  MCP -- "Action: createGig / acceptGig / pay / status\n(HTTP fetch/tool exec)" --> UI
  UI -- "Contract Calls\n(write via SDK)\napprove/create/fulfill" --> RPC
  RPC -- "Tx Submit\n(EVM)" --> GM
  GM -- "State Changes" --> MN
  MN -- "Confirmations / Logs\n(read)" --> UI

  %% MCP reading chain state through Dapp API
  MCP -- "Fetch gig status / listings\n(HTTP API)" --> UI

  %% Indexer taps mirror node / rpc
  MN -- "Events / Receipts" --> IDX
  RPC -- "Tx / Traces (optional)" --> IDX
  IDX -- "Normalized Entities\n(Gigs, Bids, Tx Status)" --> DB

  %% Dapp + MCP consume indexer (when ready)
  UI -- "Query gigs, history\n(REST/GraphQL)" --> IDX
  MCP -- "Query gigs, status\n(REST/GraphQL)" --> IDX

  %% Notes
  classDef comp fill:#0b2239,stroke:#4fd1ff,color:#e6faff,stroke-width:1.5px;
  classDef infra fill:#0f2a3a,stroke:#a78bfa,color:#e6e0ff,stroke-width:1.5px;
  classDef db fill:#0d2030,stroke:#34d399,color:#eafff7,stroke-width:1.5px;

  class CD,MCP,UI,IDX comp
  class GM,RPC,MN infra
  class DB db
```