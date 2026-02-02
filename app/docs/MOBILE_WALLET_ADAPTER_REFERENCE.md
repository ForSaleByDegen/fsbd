# Mobile Wallet Adapter (MWA) Reference

Reference for integrating Solana Mobile Wallet Adapter in a React Native (Expo) app. Use this when building an FSBD mobile companion app.

## Dependencies

```bash
# Mobile Wallet Adapter
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js \
            @solana-mobile/mobile-wallet-adapter-protocol

# RPC / Transactions
npm install @solana/web3.js@1 react-native-get-random-values buffer
```

Add polyfills to `index.js` (required for web3.js in React Native):

```js
import 'react-native-get-random-values'
import { Buffer } from 'buffer'
global.Buffer = Buffer
```

## App Identity

Define your dApp identity for wallet approval dialogs:

```ts
export const APP_IDENTITY = {
  name: '$FSBD',
  uri: 'https://fsbd.fun',
  icon: 'favicon.ico',  // resolves to https://fsbd.fun/favicon.ico
}
```

## Establishing a Session

```ts
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'

await transact(async (wallet: Web3MobileWallet) => {
  const auth = await wallet.authorize({
    cluster: 'solana:mainnet',
    identity: APP_IDENTITY,
  })
  return auth
})
```

## Connection (RPC)

```ts
import { Connection } from '@solana/web3.js'

const connection = new Connection(
  process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

const balance = await connection.getBalance(publicKey)
const blockhash = await connection.getLatestBlockhash()
```

## Sign and Send Transaction

```ts
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
} from '@solana/web3.js'

const connection = new Connection(/* ... */)

const txSignature = await transact(async (wallet) => {
  const auth = await wallet.authorize({ cluster: 'solana:mainnet', identity: APP_IDENTITY })
  const pubkey = new PublicKey(auth.accounts[0].address)

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: pubkey,
      toPubkey: recipientPubkey,
      lamports: amount,
    }),
  ]

  const blockhash = await connection.getLatestBlockhash()
  const txMessage = new TransactionMessage({
    payerKey: pubkey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message()

  const tx = new VersionedTransaction(txMessage)

  const sigs = await wallet.signAndSendTransactions({ transactions: [tx] })
  return sigs[0]
})

const confirmation = await connection.confirmTransaction(txSignature, 'confirmed')
```

## Sign Message

```ts
const message = 'Hello world!'
const messageBuffer = new Uint8Array(message.split('').map((c) => c.charCodeAt(0)))

const signedMessages = await transact(async (wallet) => {
  const auth = await wallet.authorize({ cluster: 'solana:mainnet', identity: APP_IDENTITY })
  return wallet.signMessages({
    addresses: [auth.accounts[0].address],
    payloads: [messageBuffer],
  })
})
```

## Deauthorize (Disconnect)

```ts
await transact(async (wallet) => {
  if (storedAuthToken) {
    await wallet.deauthorize({ auth_token: storedAuthToken })
  }
})
```

## Creating a Project

```bash
npm create solana-dapp@latest
# Select "Solana Mobile" framework, then pick template
```

Or scaffold directly:

```bash
npx react-native init FsbdMobile --template @solana-mobile/solana-mobile-dapp-scaffold --npm
```

## Hooks (in `docs/mobile-hooks/`)

This project includes ready-to-copy hooks:

- **useAuthorization.ts** — from Solana Mobile MWA example; manages wallet auth, accounts, auth token
- **useMobileWallet.ts** — wraps `transact` to provide `signTransactions` and `disconnect`
- **useAnchorWallet.ts** — Anchor-compatible wallet for `AnchorProvider` / `Program`

Copy these into your React Native app's `src/hooks/` and install deps (see `docs/mobile-hooks/README.md`).

## useAnchorWallet Hook

Provides an Anchor-compatible wallet interface for libraries that expect `signTransaction`, `signAllTransactions`, and `publicKey`. Depends on `useMobileWallet` and `useAuthorization`.

```ts
// useAnchorWallet.ts
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { useMobileWallet } from './useMobileWallet'
import { useAuthorization } from './useAuthorization'

export interface AnchorWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>
}

export function useAnchorWallet(): AnchorWallet | undefined {
  const { selectedAccount } = useAuthorization()
  const mobileWallet = useMobileWallet()

  return useMemo(() => {
    if (!selectedAccount || !mobileWallet.signTransactions) return

    return {
      get publicKey() {
        return selectedAccount.publicKey
      },
      signTransaction: async <T extends Transaction | VersionedTransaction>(
        transaction: T
      ): Promise<T> => {
        const signed = await mobileWallet.signTransactions([transaction])
        return signed[0] as T
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        transactions: T[]
      ): Promise<T[]> => {
        return (await mobileWallet.signTransactions(transactions)) as T[]
      },
    }
  }, [mobileWallet, selectedAccount])
}
```

Use with Anchor programs:

```ts
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { useAnchorWallet } from './useAnchorWallet'
import { useConnection } from './useConnection'

const wallet = useAnchorWallet()
const connection = useConnection()

const provider = useMemo(() => {
  if (!wallet || !connection) return null
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
}, [wallet, connection])

const program = useMemo(() => {
  if (!provider) return null
  return new Program(IDL, programId, provider)
}, [provider])
```

## Links

- [MWA 2.0 Spec](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana Mobile Docs](https://docs.solanamobile.com)
- [@solana/web3.js RPC Methods](https://solana.com/docs/rpc/http)
