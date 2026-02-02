# Mobile Wallet Adapter Hooks

Ready-to-use hooks for React Native Solana dApps. Copied/adapted from [solana-mobile/mobile-wallet-adapter](https://github.com/solana-mobile/mobile-wallet-adapter) examples.

## Source

- **useAuthorization** — [example-react-native-app/utils/useAuthorization.tsx](https://github.com/solana-mobile/mobile-wallet-adapter/blob/main/examples/example-react-native-app/utils/useAuthorization.tsx)
- **useMobileWallet** — wraps `transact` from MWA protocol to provide `signTransactions`
- **useAnchorWallet** — provides Anchor-compatible wallet for `AnchorProvider` / `Program`

## Dependencies

```bash
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js \
            @solana-mobile/mobile-wallet-adapter-protocol \
            @solana/addresses \
            @solana/web3.js \
            js-base64 \
            swr
```

For React Native, also add polyfills in `index.js`:

```js
import 'react-native-get-random-values'
import { Buffer } from 'buffer'
global.Buffer = Buffer
```

## Setup

1. Copy the hook files into your React Native project (e.g. `src/hooks/`).
2. Wrap your app with SWR provider (required for `useAuthorization`):

```tsx
import { SWRConfig } from 'swr'

<SWRConfig>
  <App />
</SWRConfig>
```

3. For auth persistence, use `AsyncStorage` with SWR (see [Solana Mobile docs](https://docs.solanamobile.com/react-native/storing_mwa_auth)).

## Usage

```tsx
import useAuthorization from './hooks/useAuthorization'
import { useMobileWallet } from './hooks/useMobileWallet'
import { useAnchorWallet } from './hooks/useAnchorWallet'

// Connect / disconnect
const { authorizeSession, deauthorizeSession, selectedAccount } = useAuthorization()
const { signTransactions, disconnect } = useMobileWallet()

// Connect button: call authorizeSession inside transact()
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'

const handleConnect = async () => {
  await transact(async (wallet) => {
    await authorizeSession(wallet)
  })
}

// Anchor Program
const wallet = useAnchorWallet()
const connection = new Connection(RPC_URL)
const provider = wallet ? new AnchorProvider(connection, wallet, { commitment: 'confirmed' }) : null
const program = provider ? new Program(IDL, programId, provider) : null
```

## APP_IDENTITY

Edit `useAuthorization.ts` to set your dApp identity (shown in wallet approval):

```ts
export const APP_IDENTITY = {
  name: '$FSBD',
  uri: 'https://fsbd.fun',
  icon: 'favicon.ico',
}
```
