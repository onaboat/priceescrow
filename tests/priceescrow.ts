// Inside tests/burry-escrow.ts
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { Priceescrow } from "../target/types/priceescrow";
import { Big } from "@switchboard-xyz/common";
import {
  AggregatorAccount,
  AnchorWallet,
  SwitchboardProgram,
} from "@switchboard-xyz/solana.js";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { assert } from "chai";
import { confirmTransaction } from "@solana-developers/helpers";
 
const SOL_USD_SWITCHBOARD_FEED = new PublicKey(
  "GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR",
);
 
const ESCROW_SEED = "ESCROWSEED";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const CONFIRMATION_COMMITMENT = "confirmed";
const PRICE_OFFSET = 10;
const ESCROW_AMOUNT = new anchor.BN(10000000000000);
const EXPECTED_ERROR_MESSAGE = "SOL price is below unlock price.";
 
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
 
const program = anchor.workspace.Priceescrow as Program<Priceescrow>;
const payer = (provider.wallet as AnchorWallet).payer;
 
describe("priceescrow", () => {
  let switchboardProgram: SwitchboardProgram;
  let aggregatorAccount: AggregatorAccount;
 
  before(async () => {
    switchboardProgram = await SwitchboardProgram.load(
      new Connection(DEVNET_RPC_URL),
      payer,
    );
    aggregatorAccount = new AggregatorAccount(
      switchboardProgram,
      SOL_USD_SWITCHBOARD_FEED,
    );
  });
 
  const createAndVerifyEscrow = async (unlockPrice: number) => {
    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), payer.publicKey.toBuffer()],
      program.programId,
    );
 
    try {
      const transaction = await program.methods
        .deposit(ESCROW_AMOUNT, unlockPrice)
        .accountsPartial({
          user: payer.publicKey,
          escrowAccount: escrow,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
 
      await confirmTransaction(
        provider.connection,
        transaction,
        CONFIRMATION_COMMITMENT,
      );
 
      const escrowAccount = await program.account.escrow.fetch(escrow);
      const escrowBalance = await provider.connection.getBalance(
        escrow,
        CONFIRMATION_COMMITMENT,
      );
 
      console.log("Onchain unlock price:", escrowAccount.unlockPrice);
      console.log("Amount in escrow:", escrowBalance);
 
      assert(unlockPrice === escrowAccount.unlockPrice);
      assert(escrowBalance > 0);
    } catch (error) {
      console.error("Error details:", error);
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  };
 
  it("creates Burry Escrow Below Current Price", async () => {

 

    const solPrice: Big | null = await aggregatorAccount.fetchLatestValue();
    if (solPrice === null) {
      throw new Error("Aggregator holds no value");
    }
    //are changing the unlockPrice in test - simulate the escrow behaviour
    const unlockPrice = solPrice.minus(PRICE_OFFSET).toNumber();
 
    await createAndVerifyEscrow(unlockPrice);
  });
 
  it("withdraws from escrow", async () => {
    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), payer.publicKey.toBuffer()],
      program.programId,
    );
 
    const userBalanceBefore = await provider.connection.getBalance(
      payer.publicKey,
    );
    console.log("User balance before:", userBalanceBefore);

       // updated escrow amount
       const escrowBalance = await provider.connection.getBalance(escrow);
       console.log("Amount in escrow before:", escrowBalance);

       const escrowAccount = await program.account.escrow.fetch(escrow);
       console.log("Onchain unlock price start:", escrowAccount.unlockPrice);
 
    try {
      const transaction = await program.methods
        .withdraw()
        .accountsPartial({
          user: payer.publicKey,
          escrowAccount: escrow,
          feedAggregator: SOL_USD_SWITCHBOARD_FEED,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
 
      await confirmTransaction(
        provider.connection,
        transaction,
        CONFIRMATION_COMMITMENT,
      );
 
     // updated escrow amount
     const escrowBalanceAfter = await provider.connection.getBalance(escrow);
     console.log("Amount in escrow after :", escrowBalanceAfter);
     assert(
      escrowBalanceAfter < escrowBalance,
      "Escrow balance should have decreased",
    );
 
      // Verify user balance increased
      const userBalanceAfter = await provider.connection.getBalance(
        payer.publicKey,
      );

      console.log("User balance after :", userBalanceAfter);
      assert(
        userBalanceAfter > userBalanceBefore,
        "User balance should have increased",
      );


      const escrowAccountEnd = await program.account.escrow.fetch(escrow);
      console.log("Onchain unlock price end:", escrowAccountEnd.unlockPrice);

    } catch (error) {
      throw new Error(`Failed to withdraw from escrow: ${error.message}`);
    }
  });

  it("closes escrow", async () => {
    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), payer.publicKey.toBuffer()],
      program.programId,
    );

    try {
      const transaction = await program.methods
        .close()
        .accountsPartial({
          user: payer.publicKey,
          escrowAccount: escrow,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      await confirmTransaction(
        provider.connection,
        transaction,
        CONFIRMATION_COMMITMENT,
      );

      try {
        await program.account.escrow.fetch(escrow);
        assert.fail("Escrow account should have been closed");
      } catch (error) {
        console.log(error.message);
        assert(
          error.message.includes("Account does not exist"),
          "Unexpected error: " + error.message,
        );
      }

    } catch (error) {
      throw new Error(`Failed to close escrow: ${error.message}`);
    }
  });

  it("creates Escrow Above Current Price", async () => {
    const solPrice: Big | null = await aggregatorAccount.fetchLatestValue();
    if (solPrice === null) {
      throw new Error("no value");
    }
    console.log("Current price:", solPrice.toNumber());
// simulate the escrow behaviour
    const unlockPrice = solPrice.plus(PRICE_OFFSET).toNumber();
    await createAndVerifyEscrow(unlockPrice);
    console.log("Unlock price 2:", unlockPrice);
  });
 
  it("fails to withdraw while price is below UnlockPrice", async () => {
    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), payer.publicKey.toBuffer()],
      program.programId,
    );
 
    try {
      await program.methods
        .withdraw()
        .accountsPartial({
          user: payer.publicKey,
          escrowAccount: escrow,
          feedAggregator: SOL_USD_SWITCHBOARD_FEED,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
 
      assert.fail("Withdrawal should have failed");
    } catch (error) {
      console.log(error.message);
      if (error instanceof AnchorError) {
        assert.include(error.message, EXPECTED_ERROR_MESSAGE);
      } else if (error instanceof Error) {
        assert.include(error.message, EXPECTED_ERROR_MESSAGE);
      } else {
        throw new Error(`Unexpected error type: ${error}`);
      }
    }
  });
});
