// Each kind of cost keeps its color on every screen. The order keeps
// neighbouring colors distinguishable for color-blind readers.
export const COST_COLORS = {
  household: '#2a78d6',
  loanInterest: '#eb6834',
  loanRepayment: '#1baf7a',
  assets: '#eda100',
  personal: '#e87ba4',
  left: '#cbd5e1',
} as const;
