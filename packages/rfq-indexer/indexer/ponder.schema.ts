import { createSchema } from '@ponder/core'

export default createSchema((p) => ({
  BridgeRequestEvents: p.createTable({
    id: p.string(),
    transactionId: p.string(),
    sender: p.string(),
    originToken: p.string(),
    destToken: p.string(),
    originAmount: p.bigint().optional(),
    originAmountFormatted: p.string(),
    destAmount: p.bigint(),
    destAmountFormatted: p.string(),
    originChainId: p.int(),
    originChain: p.string(),
    destChainId: p.int(),
    destChain: p.string(),
    sendChainGas: p.boolean(),
    blockNumber: p.bigint(),
    blockTimestamp: p.int(),
    transactionHash: p.string(),
  }),

  BridgeRelayedEvents: p.createTable({
    id: p.string(),
    transactionId: p.string(),
    relayer: p.string(),
    to: p.string(),
    originToken: p.string(),
    destToken: p.string(),
    originAmount: p.bigint(),
    originAmountFormatted: p.string(),
    destAmount: p.bigint(),
    destAmountFormatted: p.string(),
    originChainId: p.int(),
    originChain: p.string(),
    destChainId: p.int(),
    destChain: p.string(),
    blockNumber: p.bigint(),
    blockTimestamp: p.int(),
    transactionHash: p.string()
  }),

  BridgeProofProvidedEvents: p.createTable({
    id: p.string(),
    transactionId: p.string(),
    relayer: p.string(),
    originChainId: p.int(),
    originChain: p.string(),
    blockNumber: p.bigint(),
    blockTimestamp: p.int(),
    transactionHash: p.string(),
  }),

  BridgeDepositRefundedEvents: p.createTable({
    id: p.string(),
    transactionId: p.string(),
    to: p.string(),
    token: p.string(),
    amount: p.bigint(),
    amountFormatted: p.string(),
    originChainId: p.int(),
    originChain: p.string(),
    blockNumber: p.bigint(),
    blockTimestamp: p.int(),
    transactionHash: p.string()
  }),

  BridgeDepositClaimedEvents: p.createTable({
    id: p.string(),
    transactionId: p.string(),
    relayer: p.string(),
    to: p.string(),
    token: p.string(),
    amount: p.bigint(),
    amountFormatted: p.string(),
    originChainId: p.int(),
    originChain: p.string(),
    blockNumber: p.bigint(),
    blockTimestamp: p.int(),
    transactionHash: p.string()
  }),
}))