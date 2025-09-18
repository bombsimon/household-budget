export interface User {
  id: string;
  name: string;
  monthlyIncome: number;
  color: string;
  municipalityCode: string; // Swedish municipality code for tax calculation
  municipalityName: string; // Swedish municipality name for display
  // Firebase integration fields
  firebaseUid?: string;
  email?: string;
  photoURL?: string;
  role?: 'owner' | 'member';
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
  splitType: 'percentage' | 'equal';
  splitData?: { [userId: string]: number };
  paidBy?: string;
  isVariable?: boolean;
  isYearly?: boolean; // True if this is a yearly expense
  isBudgeted?: boolean; // True if this is a budgeted/variable expense
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

  // Repayment splitting
  isRepaymentShared: boolean;
  repaymentSplitType: 'percentage' | 'equal';
  repaymentSplitData?: { [userId: string]: number };
}

export interface Asset {
  id: string;
  name: string;
  expenses: Expense[];
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
  totalBudgetedSharedExpenses: number;
  totalBudgetedPersonalExpenses: number;
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
