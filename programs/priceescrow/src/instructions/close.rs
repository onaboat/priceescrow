use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;
use std::str::FromStr;
use switchboard_solana::AggregatorAccountData;
 
pub fn close_handler(ctx: Context<Close>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_account;
 
    let escrow_lamports = escrow.escrow_amount;
 
    // Transfer all lamports from escrow to user
    **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
        .to_account_info()
        .lamports()
        .checked_sub(escrow_lamports)
        .ok_or(ProgramError::InsufficientFunds)?;
 
    **ctx
        .accounts
        .user
        .to_account_info()
        .try_borrow_mut_lamports()? = ctx
        .accounts
        .user
        .to_account_info()
        .lamports()
        .checked_add(escrow_lamports)
        .ok_or(ProgramError::InvalidArgument)?;
 
    Ok(())
}
 
#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
 
    #[account(
        mut,
        seeds = [ESCROW_SEED, user.key().as_ref()],
        bump,
        close = user
    )]
    pub escrow_account: Account<'info, Escrow>,
 
    #[account(
        address = Pubkey::from_str(SOL_USDC_FEED).unwrap()
    )]
    pub feed_aggregator: AccountLoader<'info, AggregatorAccountData>,
 
    pub system_program: Program<'info, System>,
}