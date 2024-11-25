use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowErrorCode {
    #[msg("Feed has not been updated recently")]
    StaleFeed,
    #[msg("SOL price is below unlock price")]
    SolPriceBelowUnlockPrice,
}