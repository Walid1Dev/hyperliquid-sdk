import { io, Socket } from "socket.io-client";
import {
  ClientOptions,
  ConnectionState,
  Network,
  PriceData,
  OrderBook,
  Trade,
  Position,
  OpenOrder,
  OrderHistory,
  UserFunding,
  Candle,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default server URLs for each network
 * Users can override with custom URL in options
 */
const NETWORK_URLS: Record<Network, string> = {
  mainnet: "wss://api.nylium.xyz",
  testnet: "wss://testnet.api.nylium.xyz",
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface InternalOptions {
  network: Network;
  url: string;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  debug: boolean;
}

const DEFAULT_NETWORK: Network = "mainnet";

// ═══════════════════════════════════════════════════════════════════════════
// HYPERLIQUID CLIENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HyperliquidClient - Real-time market data client for Hyperliquid
 *
 * @example
 * ```typescript
 * import { HyperliquidClient } from '@Walid1Dev/hyperliquid-sdk';
 *
 * // Mainnet (default)
 * const client = new HyperliquidClient();
 *
 * // Testnet
 * const testnetClient = new HyperliquidClient({ network: 'testnet' });
 *
 * client.on('connected', () => {
 *   console.log('Connected!');
 *   client.subscribePrices();
 * });
 *
 * client.on('prices', (prices) => {
 *   console.log('Prices:', prices);
 * });
 *
 * await client.connect();
 * ```
 */
export class HyperliquidClient {
  private socket: Socket | null = null;
  private options: InternalOptions;
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private authenticatedWallet: string | null = null;

  // Event handlers
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  constructor(options?: ClientOptions) {
    const network = options?.network || DEFAULT_NETWORK;
    const url = options?.url || NETWORK_URLS[network];
    
    this.options = {
      network,
      url,
      autoReconnect: options?.autoReconnect ?? true,
      reconnectDelay: options?.reconnectDelay ?? 1000,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 10,
      debug: options?.debug ?? false,
    };
    
    this.log(`Initialized for ${network} at ${url}`);
  }

  /**
   * Get the current network
   */
  getNetwork(): Network {
    return this.options.network;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTION METHODS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Connect to the Nylium data server
   */
  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.setState("connecting");
    this.log("Connecting to", this.options.url);

    return new Promise((resolve, reject) => {
      this.socket = io(this.options.url, {
        transports: ["websocket"],
        reconnection: false, // We handle reconnection ourselves
      });

      this.socket.on("connected", (data: { clientId: string }) => {
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.log("Connected with client ID:", data.clientId);
        this.emit("connected", data);
        resolve();
      });

      this.socket.on("connect_error", (error: Error) => {
        this.log("Connection error:", error.message);
        this.handleConnectionError(error);
        if (this.state === "connecting") {
          reject(error);
        }
      });

      this.socket.on("disconnect", (reason: string) => {
        this.log("Disconnected:", reason);
        this.handleDisconnect(reason);
      });

      this.socket.on("error", (error: { code: string; message: string }) => {
        this.log("Server error:", error);
        this.emit("error", error);
      });

      // Set up data listeners
      this.setupDataListeners();
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setState("disconnected");
    this.authenticatedWallet = null;
    this.log("Disconnected");
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "connected";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRICE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to all prices or a specific asset
   * @param asset - Optional asset symbol (e.g., "BTC"). If omitted, subscribes to all.
   */
  subscribePrices(asset?: string): void {
    this.ensureConnected();
    this.socket!.emit("subscribe:price", asset ? { asset } : {});
    this.log("Subscribed to prices:", asset || "all");
  }

  /**
   * Get prices for specific assets (one-time request)
   * @param assets - Array of asset symbols
   */
  getPrices(assets: string[]): void {
    this.ensureConnected();
    this.socket!.emit("get:prices", { assets });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER BOOK SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to order book updates for an asset
   * @param asset - Asset symbol (e.g., "BTC")
   */
  subscribeOrderBook(asset: string): void {
    this.ensureConnected();
    this.socket!.emit("subscribe:orderbook", { asset });
    this.log("Subscribed to order book:", asset);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRADE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to trade stream for an asset
   * @param asset - Asset symbol (e.g., "BTC")
   */
  subscribeTrades(asset: string): void {
    this.ensureConnected();
    this.socket!.emit("subscribe:trades", { asset });
    this.log("Subscribed to trades:", asset);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CANDLE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to candle updates for an asset
   * @param asset - Asset symbol (e.g., "BTC")
   * @param interval - Candle interval (e.g., "1m", "5m", "1h", "1d")
   */
  subscribeCandles(asset: string, interval: string): void {
    this.ensureConnected();
    this.socket!.emit("subscribe:candle", { coin: asset, interval });
    this.log("Subscribed to candles:", asset, interval);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // USER DATA (AUTHENTICATED)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Authenticate with a wallet address to receive user-specific data
   * @param wallet - Ethereum wallet address
   */
  async authenticate(wallet: string): Promise<void> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Authentication timeout"));
      }, 10000);

      this.socket!.once("authenticated", (data: { wallet: string }) => {
        clearTimeout(timeout);
        this.authenticatedWallet = data.wallet;
        this.log("Authenticated as:", data.wallet);
        this.emit("authenticated", data);
        resolve();
      });

      this.socket!.once("auth:error", (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      this.socket!.emit("authenticate", { wallet });
    });
  }

  /**
   * Get user balance (requires authentication)
   */
  async getBalance(): Promise<number> {
    this.ensureConnected();
    this.ensureAuthenticated();

    return new Promise((resolve) => {
      this.socket!.emit("get:userBalance", (balance: number) => {
        resolve(balance);
      });
    });
  }

  /**
   * Get authenticated wallet address
   */
  getAuthenticatedWallet(): string | null {
    return this.authenticatedWallet;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UNSUBSCRIBE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Unsubscribe from a room
   * @param room - Room name (e.g., "prices:all", "orderbook:BTC")
   */
  unsubscribe(room: string): void {
    this.ensureConnected();
    this.socket!.emit("unsubscribe", { room });
    this.log("Unsubscribed from:", room);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Register an event handler
   */
  on<T = any>(event: string, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════

  private setupDataListeners(): void {
    if (!this.socket) return;

    // Price events
    this.socket.on("prices:snapshot", (prices: PriceData[]) => {
      this.emit("prices", prices);
    });
    this.socket.on("prices:update", (prices: PriceData[]) => {
      this.emit("prices", prices);
    });
    this.socket.on("price:snapshot", (price: PriceData) => {
      this.emit("price", price);
    });
    this.socket.on("price:update", (price: PriceData) => {
      this.emit("price", price);
    });

    // Order book events
    this.socket.on("orderbook:snapshot", (orderBook: OrderBook) => {
      this.emit("orderbook", orderBook);
    });
    this.socket.on("orderbook:update", (orderBook: OrderBook) => {
      this.emit("orderbook", orderBook);
    });

    // Trade events
    this.socket.on(
      "trades:snapshot",
      (data: { asset: string; trades: Trade[] }) => {
        this.emit("trades", data);
      }
    );
    this.socket.on(
      "trades:update",
      (data: { asset: string; trades: Trade[] }) => {
        this.emit("trades", data);
      }
    );

    // Candle events
    this.socket.on(
      "candle:snapshot",
      (data: { coin: string; interval: string; candles: Candle[] }) => {
        this.emit("candles", data);
      }
    );
    this.socket.on("candle:update", (candle: Candle) => {
      this.emit("candle", candle);
    });

    // User data events
    this.socket.on("position:snapshot", (positions: Position[]) => {
      this.emit("positions", positions);
    });
    this.socket.on("position:update", (position: Position) => {
      this.emit("position", position);
    });
    this.socket.on("position:closed", (data: { asset: string }) => {
      this.emit("positionClosed", data);
    });

    this.socket.on("openOrder:snapshot", (orders: OpenOrder[]) => {
      this.emit("openOrders", orders);
    });
    this.socket.on("openOrder:update", (order: OpenOrder) => {
      this.emit("openOrder", order);
    });
    this.socket.on("openOrder:removed", (data: { orderId: string }) => {
      this.emit("orderRemoved", data);
    });

    this.socket.on("orderHistory:snapshot", (history: OrderHistory[]) => {
      this.emit("orderHistory", history);
    });
    this.socket.on("orderHistory:update", (fill: OrderHistory) => {
      this.emit("orderFill", fill);
    });

    this.socket.on("funding:snapshot", (fundings: UserFunding[]) => {
      this.emit("fundings", fundings);
    });
    this.socket.on("funding:update", (funding: UserFunding) => {
      this.emit("funding", funding);
    });

    this.socket.on("balance:update", (data: { balance: number }) => {
      this.emit("balance", data.balance);
    });

    // Subscription confirmations
    this.socket.on("subscribed", (data: { type: string; asset: string }) => {
      this.emit("subscribed", data);
    });
    this.socket.on("unsubscribed", (data: { room: string }) => {
      this.emit("unsubscribed", data);
    });
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit("stateChange", state);
  }

  private handleConnectionError(error: Error): void {
    this.emit("error", { code: "CONNECTION_ERROR", message: error.message });

    if (this.options.autoReconnect) {
      this.scheduleReconnect();
    } else {
      this.setState("error");
    }
  }

  private handleDisconnect(reason: string): void {
    this.setState("disconnected");
    this.emit("disconnected", { reason });

    if (
      this.options.autoReconnect &&
      reason !== "io client disconnect" // Don't reconnect if user called disconnect()
    ) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log("Max reconnection attempts reached");
      this.setState("error");
      this.emit("error", {
        code: "MAX_RECONNECT_ATTEMPTS",
        message: "Maximum reconnection attempts reached",
      });
      return;
    }

    this.reconnectAttempts++;
    this.setState("reconnecting");

    const delay =
      this.options.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    this.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    );

    this.emit("reconnecting", {
      attempt: this.reconnectAttempts,
      maxAttempts: this.options.maxReconnectAttempts,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, delay);
  }

  private ensureConnected(): void {
    if (!this.socket || this.state !== "connected") {
      throw new Error("Not connected. Call connect() first.");
    }
  }

  private ensureAuthenticated(): void {
    if (!this.authenticatedWallet) {
      throw new Error("Not authenticated. Call authenticate(wallet) first.");
    }
  }

  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log("[HyperliquidClient]", ...args);
    }
  }
}
