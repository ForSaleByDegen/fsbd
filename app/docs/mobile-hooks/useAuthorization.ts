/**
 * useAuthorization - from Solana Mobile MWA example
 * Source: https://github.com/solana-mobile/mobile-wallet-adapter/blob/main/examples/example-react-native-app/utils/useAuthorization.tsx
 *
 * Dependencies: @solana-mobile/mobile-wallet-adapter-protocol, @solana/addresses, js-base64, swr
 */

import type { Address } from '@solana/addresses'
import { getAddressDecoder } from '@solana/addresses'
import type {
  Account as AuthorizedAccount,
  AuthorizationResult,
  AuthorizeAPI,
  AuthToken,
  Base64EncodedAddress,
  DeauthorizeAPI,
} from '@solana-mobile/mobile-wallet-adapter-protocol'
import { toUint8Array } from 'js-base64'
import { useCallback, useMemo } from 'react'
import useSWR from 'swr'

export type Account = Readonly<{
  address: Base64EncodedAddress
  label?: string
  publicKey: Address
  publicKeyBytes: Uint8Array
}>

type Authorization = Readonly<{
  accounts: Account[]
  authToken: AuthToken
  selectedAccount: Account
}>

function getAccountFromAuthorizedAccount(account: AuthorizedAccount): Account {
  return {
    ...account,
    publicKey: getPublicKeyFromAddress(account.address),
    publicKeyBytes: toUint8Array(account.address),
  }
}

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account
): Authorization {
  let selectedAccount: Account
  if (
    previouslySelectedAccount == null ||
    !authorizationResult.accounts.some(
      ({ address }) => address === previouslySelectedAccount.address
    )
  ) {
    const firstAccount = authorizationResult.accounts[0]
    selectedAccount = getAccountFromAuthorizedAccount(firstAccount)
  } else {
    selectedAccount = previouslySelectedAccount
  }
  return {
    accounts: authorizationResult.accounts.map(getAccountFromAuthorizedAccount),
    authToken: authorizationResult.auth_token,
    selectedAccount,
  }
}

function getPublicKeyFromAddress(base64Address: Base64EncodedAddress): Address {
  const publicKeyByteArray = toUint8Array(base64Address)
  const addressDecoder = getAddressDecoder()
  return addressDecoder.decode(publicKeyByteArray)
}

export const APP_IDENTITY = {
  name: '$FSBD',
  uri: 'https://fsbd.fun',
  icon: 'favicon.ico',
}

export default function useAuthorization() {
  const { data: authorization, mutate: setAuthorization } = useSWR<
    Authorization | null | undefined
  >('authorization')

  const handleAuthorizationResult = useCallback(
    async (authorizationResult: AuthorizationResult): Promise<Authorization> => {
      const nextAuthorization = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        authorization?.selectedAccount
      )
      await setAuthorization(nextAuthorization)
      return nextAuthorization
    },
    [authorization, setAuthorization]
  )

  const authorizeSession = useCallback(
    async (wallet: AuthorizeAPI): Promise<Account> => {
      const authorizationResult = await wallet.authorize({
        chain: 'solana:mainnet',
        identity: APP_IDENTITY,
        auth_token: authorization ? authorization.authToken : undefined,
      })
      return (await handleAuthorizationResult(authorizationResult)).selectedAccount
    },
    [authorization, handleAuthorizationResult]
  )

  const deauthorizeSession = useCallback(
    async (wallet: DeauthorizeAPI): Promise<void> => {
      if (authorization?.authToken == null) return
      await wallet.deauthorize({ auth_token: authorization.authToken })
      setAuthorization(null)
    },
    [authorization, setAuthorization]
  )

  const onChangeAccount = useCallback(
    (nextSelectedAccount: Account) => {
      setAuthorization((currentAuthorization) => {
        if (
          !currentAuthorization?.accounts.some(
            ({ address }) => address === nextSelectedAccount.address
          )
        ) {
          throw new Error(
            `${nextSelectedAccount.address} is not one of the available addresses`
          )
        }
        return {
          ...currentAuthorization,
          selectedAccount: nextSelectedAccount,
        }
      })
    },
    [setAuthorization]
  )

  return useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authToken: authorization?.authToken ?? null,
      authorizeSession,
      deauthorizeSession,
      onChangeAccount,
      selectedAccount: authorization?.selectedAccount ?? null,
    }),
    [authorization, authorizeSession, deauthorizeSession, onChangeAccount]
  )
}
