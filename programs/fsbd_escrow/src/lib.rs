//! FSBD Escrow Program (2-of-3 Multisig)
//!
//! Three signers: buyer, seller, arbiter (platform). Any 2 can push release or refund.
//! - Happy path: buyer + seller agree → release or refund
//! - Dispute: arbiter + buyer/seller break tie

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod fsbd_escrow {
    use super::*;

    /// Create escrow and deposit SOL. Buyer pays; funds held in escrow PDA.
    /// Arbiter is platform/admin; 2-of-3 (buyer, seller, arbiter) required for release/refund.
    pub fn deposit(ctx: Context<Deposit>, listing_id: [u8; 32], amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);

        let escrow = &mut ctx.accounts.escrow;
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.arbiter = ctx.accounts.arbiter.key();
        escrow.listing_id = listing_id;
        escrow.amount_lamports = amount_lamports;
        escrow.bump = ctx.bumps.escrow;
        escrow.state = EscrowState::Deposited;

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
            ),
            amount_lamports,
        )?;

        Ok(())
    }

    /// Release funds to seller. Requires 2 of 3 signers (buyer, seller, arbiter).
    /// Happy path: buyer + seller. Dispute: arbiter + seller.
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(
            escrow.state == EscrowState::Deposited || escrow.state == EscrowState::Shipped,
            EscrowError::InvalidState
        );
        require!(escrow.amount_lamports > 0, EscrowError::InvalidAmount);

        require!(
            escrow.buyer == ctx.accounts.buyer.key()
                && escrow.seller == ctx.accounts.seller.key()
                && escrow.arbiter == ctx.accounts.arbiter.key(),
            EscrowError::InvalidSigner
        );
        let signer_count = ctx.accounts.buyer.is_signer() as u8
            + ctx.accounts.seller.is_signer() as u8
            + ctx.accounts.arbiter.is_signer() as u8;
        require!(signer_count >= 2, EscrowError::NeedTwoSigners);

        let bump = escrow.bump;
        let seeds = &[
            b"escrow",
            escrow.listing_id.as_ref(),
            escrow.buyer.as_ref(),
            escrow.seller.as_ref(),
            escrow.arbiter.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.seller.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
                signer_seeds,
            ),
            escrow.amount_lamports,
        )?;

        let escrow_mut = &mut ctx.accounts.escrow;
        escrow_mut.state = EscrowState::Completed;
        escrow_mut.amount_lamports = 0;

        Ok(())
    }

    /// Refund buyer. Requires 2 of 3 signers (buyer, seller, arbiter).
    /// Happy path: buyer + seller. Dispute: arbiter + buyer.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Deposited || escrow.state == EscrowState::Shipped, EscrowError::InvalidState);
        require!(escrow.amount_lamports > 0, EscrowError::InvalidAmount);

        require!(
            escrow.buyer == ctx.accounts.buyer.key()
                && escrow.seller == ctx.accounts.seller.key()
                && escrow.arbiter == ctx.accounts.arbiter.key(),
            EscrowError::InvalidSigner
        );
        let signer_count = ctx.accounts.buyer.is_signer() as u8
            + ctx.accounts.seller.is_signer() as u8
            + ctx.accounts.arbiter.is_signer() as u8;
        require!(signer_count >= 2, EscrowError::NeedTwoSigners);

        let bump = escrow.bump;
        let seeds = &[
            b"escrow",
            escrow.listing_id.as_ref(),
            escrow.buyer.as_ref(),
            escrow.seller.as_ref(),
            escrow.arbiter.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.buyer.to_account_info(), // buyer receives refund
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
                signer_seeds,
            ),
            escrow.amount_lamports,
        )?;

        let escrow_mut = &mut ctx.accounts.escrow;
        escrow_mut.state = EscrowState::Refunded;
        escrow_mut.amount_lamports = 0;

        Ok(())
    }

    /// Mark as shipped (optional, for tracking). Seller only.
    pub fn mark_shipped(ctx: Context<MarkShipped>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Deposited, EscrowError::InvalidState);
        escrow.state = EscrowState::Shipped;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(listing_id: [u8; 32])]
pub struct Deposit<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Seller receives funds on release
    pub seller: UncheckedAccount<'info>,

    /// CHECK: Arbiter (platform) breaks ties in disputes; 2-of-3 multisig
    pub arbiter: UncheckedAccount<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"escrow", listing_id.as_ref(), buyer.key().as_ref(), seller.key().as_ref(), arbiter.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    /// CHECK: Must match escrow; 2 of 3 must sign
    pub buyer: UncheckedAccount<'info>,

    /// CHECK: Seller receives funds; must match escrow
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    /// CHECK: Arbiter; must match escrow
    pub arbiter: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow.listing_id.as_ref(), escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.arbiter.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    /// CHECK: Buyer receives refund; must match escrow
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,

    /// CHECK: Must match escrow; 2 of 3 must sign
    pub seller: UncheckedAccount<'info>,

    /// CHECK: Arbiter; must match escrow
    pub arbiter: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow.listing_id.as_ref(), escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.arbiter.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkShipped<'info> {
    pub seller: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.seller == seller.key(),
        seeds = [b"escrow", escrow.listing_id.as_ref(), escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.arbiter.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
}

/// Space: 8 + 32*4 + 8 + 1 + 1 = 146
#[account]
pub struct Escrow {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub arbiter: Pubkey,
    pub listing_id: [u8; 32],
    pub amount_lamports: u64,
    pub bump: u8,
    pub state: EscrowState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowState {
    Deposited,
    Shipped,
    Completed,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid escrow state for this operation")]
    InvalidState,
    #[msg("Release/refund requires 2 of 3 signers (buyer, seller, arbiter)")]
    NeedTwoSigners,
    #[msg("Signer account does not match escrow")]
    InvalidSigner,
}
