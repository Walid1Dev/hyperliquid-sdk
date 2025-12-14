// ═══════════════════════════════════════════════════════════════════════════
// PRICE DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Real-time price data for an asset
 */
export interface PriceData {
  /** Asset symbol (e.g., "BTC", "ETH") */
  symbol: string;
  /** Display name (e.g., "Bitcoin", "Ethereum") */
  displayName: string;
  /** Asset type */
  type: "perp" | "spot";
  /** Current price in USD */
  price: number;
  /** Oracle price (if available) */
  oraclePrice?: number;
  /** 24h trading volume in USD */
  volume24h: number;
  /** 24h high price */
  high24h: number;
  /** 24h low price */
  low24h: number;
  /** 24h price change in USD */
  change24h: number;
  /** 24h price change percentage */
  changePercent24h: number;
  /** Current funding rate (for perpetuals) */
  fundingRate: number;
  /** Open interest in USD */
  openInterest: number;
  /** Maximum leverage allowed */
  maxLeverage?: number;
  /** Last update timestamp */
  lastUpdate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER BOOK TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Single level in the order book
 */
export interface OrderBookLevel {
  /** Price level */
  price: number;
  /** Size at this level */
  size: number;
  /** Total value (price * size) */
  total: number;
  /** Number of orders at this level */
  orders: number;
}

/**
 * Full order book snapshot
 */
export interface OrderBook {
  /** Asset symbol */
  asset: string;
  /** Display name */
  displayName: string;
  /** Asset type */
  type: "perp" | "spot";
  /** Bid levels (sorted high to low) */
  bids: OrderBookLevel[];
  /** Ask levels (sorted low to high) */
  asks: OrderBookLevel[];
  /** Spread in USD */
  spread: number;
  /** Spread as percentage */
  spreadPercent: number;
  /** Mid price */
  midPrice: number;
  /** Best bid price */
  bestBid: number;
  /** Best ask price */
  bestAsk: number;
  /** Last update timestamp */
  lastUpdate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRADE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Individual trade
 */
export interface Trade {
  /** Unique trade ID */
  id: string;
  /** Asset symbol */
  asset: string;
  /** Display name */
  displayName: string;
  /** Asset type */
  type: "perp" | "spot";
  /** Trade price */
  price: number;
  /** Trade size */
  size: number;
  /** Trade side */
  side: "buy" | "sell";
  /** Trade value in USD */
  value: number;
  /** Trade timestamp */
  timestamp: number;
  /** Trader address (if available) */
  user?: string;
  /** Transaction hash (if available) */
  hash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User position
 */
export interface Position {
  /** Asset symbol */
  asset: string;
  /** Display name */
  displayName: string;
  /** Position side */
  side: "long" | "short";
  /** Position size */
  size: number;
  /** Entry price */
  entryPrice: number;
  /** Current mark price */
  markPrice: number;
  /** Unrealized PnL in USD */
  pnl: number;
  /** PnL as percentage */
  pnlPercent: number;
  /** Leverage used */
  leverage: number;
  /** Liquidation price (if available) */
  liqPrice?: number;
  /** Position timestamp */
  timestamp: number;
}

/**
 * Open order
 */
export interface OpenOrder {
  /** Order ID */
  id: string;
  /** Asset symbol */
  asset: string;
  /** Display name */
  displayName: string;
  /** Order side */
  side: "buy" | "sell";
  /** Order type */
  type: "limit" | "market" | "stop" | "stop_limit";
  /** Order price */
  price: number;
  /** Order amount */
  amount: number;
  /** Filled amount */
  filled: number;
  /** Remaining amount */
  remaining: number;
  /** Order timestamp */
  timestamp: number;
}

/**
 * Order history entry
 */
export interface OrderHistory {
  /** Order ID */
  id: string;
  /** Asset symbol */
  asset: string;
  /** Display name */
  displayName: string;
  /** Order side */
  side: "buy" | "sell";
  /** Trade direction */
  direction?:
    | "open_long"
    | "open_short"
    | "close_long"
    | "close_short"
    | "liquidation"
    | "buy"
    | "sell";
  /** Order type */
  type: "limit" | "market" | "stop" | "stop_limit";
  /** Order price */
  price: number;
  /** Order amount */
  amount: number;
  /** Filled amount */
  filled: number;
  /** Order status */
  status:
    | "filled"
    | "canceled"
    | "partially_filled"
    | "rejected"
    | "liquidated";
  /** Order timestamp */
  timestamp: number;
  /** Transaction hash */
  txHash?: string;
  /** Closed PnL (for closing orders) */
  closedPnl?: number;
  /** Fee paid */
  fee: number;
}

/**
 * User funding payment
 */
export interface UserFunding {
  /** Funding timestamp */
  time: number;
  /** Asset symbol */
  coin: string;
  /** Funding amount in USDC */
  usdc: string;
  /** Position size at funding */
  szi: string;
  /** Funding rate applied */
  fundingRate: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANDLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OHLCV candle data
 */
export interface Candle {
  /** Candle open time */
  time: number;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close price */
  close: number;
  /** Volume */
  volume: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Network selection
 */
export type Network = "mainnet" | "testnet";

/**
 * Client connection options
 */
export interface ClientOptions {
  /** Network to connect to (default: mainnet) */
  network?: Network;
  /** WebSocket server URL (overrides network default) */
  url?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Connection state
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Client event types
 */
export interface ClientEvents {
  connected: { clientId: string; timestamp: number };
  disconnected: { reason: string };
  error: { code: string; message: string };
  reconnecting: { attempt: number; maxAttempts: number };
}
