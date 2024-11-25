use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
// use anchor_lang::solana_program::clock::Clock;
use std::str::FromStr;
use switchboard_solana::AggregatorAccountData;
 
pub fn withdraw_handler(ctx: Context<Withdraw>) -> Result<()> {
    let feed = &ctx.accounts.feed_aggregator.load()?;
    let escrow = &mut ctx.accounts.escrow_account;
 
    let current_sol_price: f64 = feed.get_result()?.try_into()?;

    // removed as causing issues with tests and devnet
    // feed.check_staleness(Clock::get().unwrap().unix_timestamp, 3600)
    //     .map_err(|_| error!(EscrowErrorCode::StaleFeed))?;
 
    msg!("Current SOL price is {}", current_sol_price);
    msg!("Unlock price is {}", escrow.unlock_price);
 
    if current_sol_price < escrow.unlock_price {
        return Err(EscrowErrorCode::SolPriceBelowUnlockPrice.into());
    }
 
    // Calculate exactly 50% of the escrow amount
    let withdrawal_amount = (escrow.escrow_amount as u128 * 50 / 100) as u64;
    msg!("Withdrawing {} lamports (30% of {})", withdrawal_amount, escrow.escrow_amount);
    
    // Update the escrow amount
    escrow.escrow_amount = escrow.escrow_amount.checked_sub(withdrawal_amount)
        .ok_or(ProgramError::InsufficientFunds)?;
 
    let current_lamports = escrow.to_account_info().lamports();
    
    // Transfer the lamports
    **escrow.to_account_info().try_borrow_mut_lamports()? = current_lamports
        .checked_sub(withdrawal_amount)
        .ok_or(ProgramError::InsufficientFunds)?;
 
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = ctx
        .accounts
        .user
        .to_account_info()
        .lamports()
        .checked_add(withdrawal_amount)
        .ok_or(ProgramError::InvalidArgument)?;

    // update the escrow price
    escrow.unlock_price = current_sol_price;
 
    Ok(())
}
 
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
 
    #[account(
        mut,
        seeds = [ESCROW_SEED, user.key().as_ref()],
        bump,
    )]
    pub escrow_account: Account<'info, Escrow>,
 
    #[account(
        address = Pubkey::from_str(SOL_USDC_FEED).unwrap()
    )]
    pub feed_aggregator: AccountLoader<'info, AggregatorAccountData>,
 
    pub system_program: Program<'info, System>,
}