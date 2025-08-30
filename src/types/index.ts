export interface User {
  id: string;
  name: string;
  monthlyIncome: number;
  color: string;
  municipalTaxRate?: number; // Combined municipal + county tax rate (default: 32%)
}

export interface ExpenseCategory {
  id: string;
  name: string;
  collapsed: boolean;
  expenses: Expense[];
}

export interface PersonalExpenseCategory {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  userId?: string;
  isShared: boolean;
  splitType: 'percentage' | 'equal' | 'fixed';
  splitData?: { [userId: string]: number };
  paidBy?: string;
  isVariable?: boolean;
  isYearly?: boolean; // True if this is a yearly expense
  personalCategoryId?: string; // Link to personal expense category (optional)
}

export interface Loan {
  id: string;
  name: string;
  originalAmount: number;
  currentAmount: number;
  interestRate: number;
  monthlyPayment: number;
  testInterestRate?: number;
  paidBy?: string; // Which user pays the loan

  // Interest splitting
  isInterestShared: boolean;
  interestSplitType: 'percentage' | 'equal';
  interestSplitData?: { [userId: string]: number };

  // Principal/mortgage splitting
  isMortgageShared: boolean;
  mortgageSplitType: 'percentage' | 'equal';
  mortgageSplitData?: { [userId: string]: number };
}

export interface Asset {
  id: string;
  name: string;
  fixedCosts: Expense[];
  variableCosts: Expense[];
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface BudgetSummary {
  totalIncome: number;
  totalSharedExpenses: number;
  totalPersonalExpenses: number;
  afterTaxIncome: number;
  afterSharedExpenses: number;
  afterPersonalExpenses: number;
  remainingIncome: number;
  percentageRemaining: number;
}

export interface PersonalExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface UserBudgetBreakdown {
  userId: string;
  income: number;
  sharedExpensesOwed: number;
  personalExpenses: number;
  netPosition: number;
  remainingAfterExpenses: number;
  personalExpenseBreakdown: PersonalExpenseBreakdown[];
  sharedExpensePercentage: number;
}

export interface AppState {
  users: User[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  personalCategoriesSectionCollapsed?: boolean;
  loans: Loan[];
  assets: Asset[];
  version: string;
  lastUpdated: string;
}
