# Telegram Bot Setup — Post New Listings to Channel

When a new listing is created, the bot posts a card-style message to your Telegram channel with title, price, category, location, description snippet, and link to the listing.

## 1. Create a Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`, follow prompts
3. Copy the token (e.g. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Create or Use a Channel

1. Create a channel (e.g. @fsbd_listings) or use an existing one
2. Add the bot as an **administrator** (with "Post Messages" permission)

## 3. Get Channel ID

- **Username**: If your channel is public (e.g. @fsbd_listings), use `@fsbd_listings` as the channel ID
- **Numeric ID**: For private channels, forward a message from the channel to @userinfobot or use @getidsbot to get the ID (e.g. `-1001234567890`)

## 4. Add Environment Variables

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_CHANNEL_ID` | `@yourchannel` or `-1001234567890` |

In Vercel: Settings → Environment Variables → Add both (mark as Sensitive).

## 5. Deploy

Redeploy the app. New listings will automatically post to the channel. If vars are not set, posting is skipped (no errors).

## Message Format

```
🆕 NEW LISTING

📦 Listing Title
💰 1.5 SOL
📂 Digital Assets · Token
📍 Austin, TX
🪙 $TOKEN · MC $12.5K
🟣 Buy on pump.fun

Description snippet...

🔗 View listing
```

If the listing has a token (token_mint), the message includes:
- Token symbol
- Market cap (from DexScreener)
- Bonding curve % (from Bitquery — requires `BITQUERY_API_KEY`; shows how close the token is to graduating from pump.fun)
- Link to buy on pump.fun
