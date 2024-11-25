# Price Escrow

A Solana program that creates price-locked escrow accounts using SOL/USD price feeds from Switchboard.

## Overview

This program enables conditional SOL transfers based on SOL/USD price thresholds. Users can lock SOL in an escrow account that only becomes withdrawable when SOL reaches a specified price point, creating opportunities for automated price-based trading strategies.

## Features

- Create price-locked escrow accounts
- Deposit SOL with specific price unlock conditions
- Withdraw SOL when price conditions are met
- Close escrow accounts and recover rent
- Real-time price feeds from Switchboard oracles
- Devnet support

## Live Deployment

- Devnet Program ID: `A1pMdJC1Q75EHemWeAUqSr941VctKQ3vBn9tXg8vkeaN`
- Switchboard SOL/USD Feed: [Latest Price Data](https://app.switchboard.xyz/solana/devnet/feed/GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR)

## Prerequisites

- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools) v1.17 or later
- [Anchor](https://www.anchor-lang.com/docs/installation) v0.28.0 or later
- [Node.js](https://nodejs.org/) v16 or later
- [Yarn](https://yarnpkg.com/)

## Installation

```bash
git clone <repository-url>
cd priceescrow
yarn install
```

## Build

```bash
anchor build
```

## Test

```bash
anchor test
```

## Program Architecture

The program consists of three main instructions:

1. **Deposit**: Creates an escrow account and deposits SOL with a specified unlock price.
2. **Withdraw**: Withdraws SOL from the escrow when price conditions are met.
3. **Close**: Closes the escrow account and returns rent.

## Example Usage

```typescript
// Create an escrow that unlocks when SOL price reaches $25
await program.methods
  .deposit(new BN(25_000_000)) // $25.00 in 6 decimals
  .accounts({
    user: wallet.publicKey,
    escrowAccount: escrow,
    systemProgram: SystemProgram.programId,
  })
  .signers([wallet])
  .rpc();

// Withdraw when conditions are met
await program.methods
  .withdraw()
  .accounts({
    user: wallet.publicKey,
    escrowAccount: escrow,
    switchboardFeed: SOL_USD_SWITCHBOARD_FEED,
  })
  .signers([wallet])
  .rpc();
```

## Error Handling

The program includes custom error types:

- `SolPriceBelowUnlockPrice`: Attempted withdrawal when SOL price is below unlock price.
- `InvalidSwitchboardFeed`: Invalid or stale price feed data.

## Security Considerations

- Price feeds are verified for staleness.
- Program uses PDAs to prevent account spoofing.
- Escrow accounts are owned by the program.

