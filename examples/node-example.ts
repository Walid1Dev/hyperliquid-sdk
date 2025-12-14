/**
 * Node.js Example for @nylium/hyperliquid-sdk
 * 
 * Run this with: npx ts-node examples/node-example.ts
 */

import { HyperliquidClient, PriceData, OrderBook, Trade } from "../src";

async function main() {
  console.log("Hyperliquid SDK - Node.js Example\n");

  // Create client with debug mode
  const client = new HyperliquidClient({
    debug: true,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  client.on("connected", ({ clientId }) => {
    console.log(`✅ Connected! Client ID: ${clientId}\n`);
  });

  client.on("disconnected", ({ reason }) => {
    console.log(`❌ Disconnected: ${reason}`);
  });

  client.on("reconnecting", ({ attempt, maxAttempts }) => {
    console.log(`🔄 Reconnecting... (${attempt}/${maxAttempts})`);
  });

  client.on("error", ({ code, message }) => {
    console.error(`⚠️ Error [${code}]: ${message}`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECT
  // ═══════════════════════════════════════════════════════════════════════

  try {
    await client.connect();
  } catch (error) {
    console.error("Failed to connect:", error);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRICE SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════

  console.log("[Prices] Subscribing to prices...\n");

  let priceUpdateCount = 0;
  client.on("prices", (prices: PriceData[]) => {
    priceUpdateCount++;

    if (priceUpdateCount === 1) {
      console.log("[Prices] First Price Snapshot:");
      console.log("─".repeat(60));

      const top10 = prices
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10);

      top10.forEach((p) => {
        const changeEmoji = p.changePercent24h >= 0 ? "🟢" : "🔴";
        const changeStr = `${p.changePercent24h >= 0 ? "+" : ""}${p.changePercent24h.toFixed(2)}%`;
        console.log(
          `  ${p.symbol.padEnd(8)} $${p.price.toFixed(2).padStart(12)} ${changeEmoji} ${changeStr.padStart(8)}  Vol: $${(p.volume24h / 1e6).toFixed(1)}M`
        );
      });

      console.log("\n");
    }
  });

  client.subscribePrices();

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER BOOK SUBSCRIPTION (BTC)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("[OrderBook] Subscribing to BTC order book...\n");

  let obUpdateCount = 0;
  client.on("orderbook", (ob: OrderBook) => {
    obUpdateCount++;

    if (obUpdateCount === 1) {
      console.log("[OrderBook] BTC Order Book:");
      console.log("─".repeat(60));
      console.log(`  Best Bid: $${ob.bestBid.toFixed(2)}`);
      console.log(`  Best Ask: $${ob.bestAsk.toFixed(2)}`);
      console.log(`  Spread:   ${ob.spreadPercent.toFixed(4)}%`);
      console.log(`  Depth:    ${ob.bids.length} bids, ${ob.asks.length} asks`);
      console.log("\n");
    }
  });

  client.subscribeOrderBook("BTC");

  // ═══════════════════════════════════════════════════════════════════════
  // TRADE SUBSCRIPTION (ETH)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("[Trades] Subscribing to ETH trades...\n");

  let tradeCount = 0;
  client.on("trades", ({ asset, trades }: { asset: string; trades: Trade[] }) => {
    if (asset !== "ETH") return;

    if (tradeCount === 0 && trades.length > 0) {
      console.log("[Trades] Recent ETH Trades:");
      console.log("─".repeat(60));

      trades.slice(0, 5).forEach((t) => {
        const sideEmoji = t.side === "buy" ? "🟢 BUY " : "🔴 SELL";
        console.log(
          `  ${sideEmoji} ${t.size.toFixed(4)} ETH @ $${t.price.toFixed(2)}`
        );
      });

      console.log("\n");
    }

    tradeCount += trades.length;
  });

  client.subscribeTrades("ETH");

  // ═══════════════════════════════════════════════════════════════════════
  // KEEP RUNNING
  // ═══════════════════════════════════════════════════════════════════════

  console.log("⏳ Listening for updates... (Press Ctrl+C to exit)\n");

  // Print stats every 30 seconds
  setInterval(() => {
    console.log(
      `[Stats] Stats: ${priceUpdateCount} price updates, ${obUpdateCount} orderbook updates, ${tradeCount} trades`
    );
  }, 30000);

  // Handle shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down...");
    client.disconnect();
    console.log("👋 Goodbye!\n");
    process.exit(0);
  });
}

main().catch(console.error);
