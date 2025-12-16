# @nylium/hyperliquid-sdk

Real-time Hyperliquid market data SDK for Node.js and browsers.

[![npm version](https://img.shields.io/npm/v/@nylium/hyperliquid-sdk.svg)](https://www.npmjs.com/package/@nylium/hyperliquid-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Real-time data** via WebSocket
- 💰 **Price feeds** for all Hyperliquid assets
- 📖 **Order book** depth updates
- 📊 **Trade stream** with batching
- 👤 **User data** (positions, orders, fills)
- 📈 **Candle data** for charts
- 🔄 **Auto-reconnection** with exponential backoff
- 📦 **TypeScript** with full type definitions
- 🌐 **Works in Node.js and browsers**

## Installation

```bash
# npm
npm install @nylium/hyperliquid-sdk

# pnpm
pnpm add @nylium/hyperliquid-sdk

# yarn
yarn add @nylium/hyperliquid-sdk
```

## Quick Start

```typescript
import { HyperliquidClient } from '@nylium/hyperliquid-sdk';

const client = new HyperliquidClient();

// Listen for connection
client.on('connected', () => {
  console.log('Connected to Nylium!');
  
  // Subscribe to all prices
  client.subscribePrices();
});

// Handle price updates
client.on('prices', (prices) => {
  prices.forEach(p => {
    console.log(`${p.symbol}: $${p.price.toFixed(2)} (${p.changePercent24h.toFixed(2)}%)`);
  });
});

// Connect
await client.connect();
```

## API Reference

### Constructor

```typescript
// Mainnet (default)
const client = new HyperliquidClient();

// Testnet
const testnetClient = new HyperliquidClient({ network: 'testnet' });

// Full options
const client = new HyperliquidClient({
  network: 'mainnet',             // 'mainnet' or 'testnet'
  url: 'wss://api.nylium.xyz',    // Override server URL
  autoReconnect: true,             // Auto-reconnect on disconnect
  reconnectDelay: 1000,            // Initial reconnect delay (ms)
  maxReconnectAttempts: 10,        // Max reconnection attempts
  debug: false                     // Enable debug logging
});

// Check network
client.getNetwork();  // 'mainnet' or 'testnet'
```

### Connection

```typescript
// Connect to server
await client.connect();

// Disconnect
client.disconnect();

// Check connection state
client.isConnected();  // boolean
client.getState();     // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
```

### Price Data

```typescript
// Subscribe to ALL prices (real-time updates)
client.subscribePrices();

// Subscribe to single asset
client.subscribePrices('BTC');

// Get prices for specific assets (one-time)
client.getPrices(['BTC', 'ETH', 'SOL']);

// Listen for updates
client.on('prices', (prices: PriceData[]) => {
  // All prices array (482+ assets)
});

client.on('price', (price: PriceData) => {
  // Single price update
});
```

### Filter Perps vs Spots

```typescript
// Each price has a 'type' field: 'perp' or 'spot'
client.on('prices', (prices) => {
  // Get only perpetual contracts
  const perps = prices.filter(p => p.type === 'perp');
  console.log(`${perps.length} perps`);  // 223 perps
  
  // Get only spot pairs
  const spots = prices.filter(p => p.type === 'spot');
  console.log(`${spots.length} spots`); // 259 spots
  
  // Spot symbols look like: HYPE/USDC, PURR/USDC, etc.
  spots.forEach(s => {
    console.log(`${s.displayName}: $${s.price}`);
  });
});
```

### Full Asset Subscription (Terminal Trading)

Subscribe to ALL data streams for a single asset with one call - perfect for building trading terminals:

```typescript
// Subscribe to everything for BTC: price, orderbook, trades, candles
client.subscribeAsset('BTC');

// Or specify candle interval
client.subscribeAsset('ETH', '15m');

// Subscribe to spot by index
client.subscribeAsset('@123');

// Listen to all the data
client.on('prices', (prices) => {
  const btc = prices.find(p => p.symbol === 'BTC');
  console.log('Price:', btc.price);
});

client.on('orderbook', (ob) => {
  console.log('Spread:', ob.spreadPercent);
});

client.on('trades', (data) => {
  data.trades.forEach(t => console.log(t.side, t.price, t.size));
});

client.on('candle', (candle) => {
  console.log('OHLCV:', candle);
});

// Cleanup
client.unsubscribeAsset('BTC');
```

### Order Book

```typescript
// Subscribe to order book
client.subscribeOrderBook('BTC');

// Listen for updates
client.on('orderbook', (orderBook: OrderBook) => {
  console.log('Best bid:', orderBook.bestBid);
  console.log('Best ask:', orderBook.bestAsk);
  console.log('Spread:', orderBook.spreadPercent.toFixed(4) + '%');
});
```

### Trades

```typescript
// Subscribe to trades
client.subscribeTrades('BTC');

// Listen for updates
client.on('trades', ({ asset, trades }) => {
  trades.forEach(t => {
    const emoji = t.side === 'buy' ? '🟢' : '🔴';
    console.log(`${emoji} ${t.size} BTC @ $${t.price}`);
  });
});
```

### Candles (Charts)

```typescript
// Subscribe to candles
client.subscribeCandles('BTC', '1h');  // Intervals: 1m, 5m, 15m, 1h, 4h, 1d

// Listen for updates
client.on('candles', ({ coin, interval, candles }) => {
  console.log(`Received ${candles.length} candles`);
});

client.on('candle', (candle: Candle) => {
  console.log(`New candle: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
});
```

### User Data (Authenticated)

```typescript
// Authenticate with wallet
await client.authenticate('0x1234...');

// Get balance
const balance = await client.getBalance();

// Listen for position updates
client.on('positions', (positions: Position[]) => {
  positions.forEach(p => {
    console.log(`${p.asset}: ${p.side} ${p.size} @ ${p.entryPrice}`);
    console.log(`PnL: $${p.pnl.toFixed(2)} (${p.pnlPercent.toFixed(2)}%)`);
  });
});

// Listen for order updates
client.on('openOrders', (orders: OpenOrder[]) => {
  console.log(`${orders.length} open orders`);
});

// Listen for fills
client.on('orderFill', (fill: OrderHistory) => {
  console.log(`Order ${fill.id} filled @ $${fill.price}`);
});

// Listen for balance changes
client.on('balance', (balance: number) => {
  console.log(`Balance: $${balance.toFixed(2)}`);
});
```

### Unsubscribe

```typescript
// Unsubscribe from a room
client.unsubscribe('prices:all');
client.unsubscribe('orderbook:BTC');
client.unsubscribe('trades:ETH');
```

### Events

| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{ clientId }` | Connected to server |
| `disconnected` | `{ reason }` | Disconnected from server |
| `reconnecting` | `{ attempt, maxAttempts }` | Attempting reconnection |
| `error` | `{ code, message }` | Error occurred |
| `prices` | `PriceData[]` | All prices update |
| `price` | `PriceData` | Single price update |
| `orderbook` | `OrderBook` | Order book update |
| `trades` | `{ asset, trades }` | Trades update |
| `candles` | `{ coin, interval, candles }` | Candles snapshot |
| `candle` | `Candle` | Single candle update |
| `positions` | `Position[]` | Positions snapshot |
| `position` | `Position` | Single position update |
| `positionClosed` | `{ asset }` | Position closed |
| `openOrders` | `OpenOrder[]` | Open orders snapshot |
| `openOrder` | `OpenOrder` | Order update |
| `orderRemoved` | `{ orderId }` | Order removed |
| `orderHistory` | `OrderHistory[]` | Order history snapshot |
| `orderFill` | `OrderHistory` | New fill |
| `balance` | `number` | Balance update |
| `authenticated` | `{ wallet }` | Authentication success |

## Type Definitions

```typescript
interface PriceData {
  symbol: string;
  displayName: string;
  type: 'perp' | 'spot';
  price: number;
  oraclePrice?: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
  fundingRate: number;
  openInterest: number;
  maxLeverage?: number;
  lastUpdate: number;
}

interface OrderBook {
  asset: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  bestBid: number;
  bestAsk: number;
}

interface Position {
  asset: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
  liqPrice?: number;
}
```

## React Example

```tsx
import { useEffect, useState } from 'react';
import { HyperliquidClient, PriceData } from '@nylium/hyperliquid-sdk';

const client = new HyperliquidClient();

function usePrices() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.on('connected', () => setConnected(true));
    client.on('disconnected', () => setConnected(false));
    client.on('prices', setPrices);

    client.connect().then(() => {
      client.subscribePrices();
    });

    return () => {
      client.disconnect();
    };
  }, []);

  return { prices, connected };
}

function PriceTable() {
  const { prices, connected } = usePrices();

  if (!connected) return <div>Connecting...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Asset</th>
          <th>Price</th>
          <th>24h Change</th>
        </tr>
      </thead>
      <tbody>
        {prices.map(p => (
          <tr key={p.symbol}>
            <td>{p.displayName}</td>
            <td>${p.price.toFixed(2)}</td>
            <td style={{ color: p.changePercent24h >= 0 ? 'green' : 'red' }}>
              {p.changePercent24h.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## License

MIT © [Walid1Dev](https://nylium.xyz)
