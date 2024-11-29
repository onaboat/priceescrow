pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("3xdEMhH9Dm8WZR2uWwnZwazc9dtYwRubDerEptEEMpcd");

#[program]
pub mod priceescrow {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, escrow_amount: u64, unlock_price: f64) -> Result<()> {
        deposit_handler(ctx, escrow_amount, unlock_price)
    }
 
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        withdraw_handler(ctx)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        close_handler(ctx)
    }
}
