// Each kind of cost keeps its color on every screen. The order keeps
// neighbouring colors distinguishable for color-blind readers.
export const COST_COLORS = {
  household: 'var(--cost-household)',
  loanInterest: 'var(--cost-loan-interest)',
  loanRepayment: 'var(--cost-loan-repayment)',
  assets: 'var(--cost-assets)',
  personal: 'var(--cost-personal)',
  left: 'var(--cost-left)',
} as const;
