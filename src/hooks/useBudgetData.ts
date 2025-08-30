import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Expense,
  ExpenseCategory,
  PersonalExpenseCategory,
  Loan,
  Asset,
  Settlement,
  BudgetSummary,
  UserBudgetBreakdown,
  PersonalExpenseBreakdown,
  AppState,
} from '../types';
import { saveState, loadState } from '../utils/statePersistence';
import { getMonthlyAmount } from '../utils/expenseCalculations';
import {
  calculateMonthlyAfterTaxIncome,
  getDefaultMunicipalTaxRate,
} from '../utils/swedishTaxCalculation';

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Alex',
    monthlyIncome: 50000,
    color: '#3B82F6',
    municipalTaxRate: getDefaultMunicipalTaxRate(),
  },
];

// Initialize with basic structure - will be updated when users change
const getInitialCategories = (users: User[]): ExpenseCategory[] => [
  // Single Shared Expense Category
  {
    id: 'shared',
    name: 'Household Expenses',
    collapsed: false,
    expenses: [
      {
        id: '1',
        name: 'Rent',
        amount: 8000,
        isShared: true,
        splitType: 'percentage',
        splitData: { '1': 1.0 }, // Income-based: 50k/(50k+45k) and 45k/(50k+45k)
        paidBy: '1',
      },
    ],
  },
  ...users.map((user) => ({
    id: `personal-${user.id}`,
    name: `Personal - ${user.name}`,
    collapsed: false,
    expenses: [
      {
        id: '3',
        name: 'Spotify',
        amount: 119,
        userId: user.id,
        isShared: false,
        splitType: 'fixed' as const,
        paidBy: user.id,
        personalCategoryId: 'streaming',
      },
      {
        id: '4',
        name: 'Netflix',
        amount: 199,
        userId: user.id,
        isShared: false,
        splitType: 'fixed' as const,
        paidBy: user.id,
        personalCategoryId: 'streaming',
      },
      {
        id: '8',
        name: 'Coffee Subscription',
        amount: 299,
        userId: user.id,
        isShared: false,
        splitType: 'fixed' as const,
        paidBy: user.id,
        // No personalCategoryId - this makes it uncategorized
      },
      {
        id: '9',
        name: 'Gym Membership',
        amount: 450,
        userId: user.id,
        isShared: false,
        splitType: 'fixed' as const,
        paidBy: user.id,
        personalCategoryId: 'hobbies',
      },
    ],
  })),
];

const initialLoans: Loan[] = [
  {
    id: '1',
    name: 'Mortgage Part 1',
    originalAmount: 1500000,
    currentAmount: 1300000,
    interestRate: 0.028,
    monthlyPayment: 8500,
    paidBy: '1', // User 1 pays

    // Interest splitting by income percentage
    isInterestShared: true,
    interestSplitType: 'percentage',
    interestSplitData: { '1': 1.0 },

    // Mortgage principal split equally
    isMortgageShared: true,
    mortgageSplitType: 'equal',
    mortgageSplitData: { '1': 1.0 },
  },
  {
    id: '2',
    name: 'Mortgage Part 2',
    originalAmount: 800000,
    currentAmount: 700000,
    interestRate: 0.028,
    monthlyPayment: 4200,
    paidBy: '2', // User 2 pays

    // Interest splitting by income percentage
    isInterestShared: true,
    interestSplitType: 'percentage',
    interestSplitData: { '1': 1.0 },

    // Mortgage principal split equally
    isMortgageShared: true,
    mortgageSplitType: 'equal',
    mortgageSplitData: { '1': 1.0 },
  },
];

const initialAssets: Asset[] = [
  {
    id: '1',
    name: 'Car',
    fixedCosts: [
      {
        id: '5',
        name: 'Insurance',
        amount: 450,
        isShared: true,
        splitType: 'percentage',
        splitData: { '1': 1.0 }, // Income-based: 50k/(50k+45k) and 45k/(50k+45k)
        paidBy: '1',
      },
      {
        id: '6',
        name: 'Registration',
        amount: 150,
        isShared: true,
        splitType: 'equal',
        paidBy: '1',
      },
    ],
    variableCosts: [
      {
        id: '7',
        name: 'Fuel',
        amount: 800,
        isShared: true,
        splitType: 'equal',
        isVariable: true,
        paidBy: '1',
      },
    ],
  },
];

export function useBudgetData() {
  // Load initial state from localStorage or use defaults
  const [isLoaded, setIsLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [personalCategories, setPersonalCategories] = useState<
    PersonalExpenseCategory[]
  >([]);
  const [
    personalCategoriesSectionCollapsed,
    setPersonalCategoriesSectionCollapsed,
  ] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      setUsers(savedState.users);
      setCategories(savedState.categories);
      setPersonalCategories(savedState.personalCategories);
      setPersonalCategoriesSectionCollapsed(
        savedState.personalCategoriesSectionCollapsed || false
      );
      setLoans(savedState.loans);
      setAssets(savedState.assets);
    } else {
      // Use initial data if no saved state
      setUsers(initialUsers);
      setCategories(getInitialCategories(initialUsers));
      setPersonalCategories([
        { id: 'uncategorized', name: 'Uncategorized', collapsed: false },
        { id: 'streaming', name: 'Streaming', collapsed: false },
        { id: 'charity', name: 'Charity', collapsed: false },
        { id: 'hobbies', name: 'Hobbies', collapsed: false },
        { id: 'dining', name: 'Dining Out', collapsed: false },
      ]);
      setLoans(initialLoans);
      setAssets(initialAssets);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever data changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load

    const currentState: AppState = {
      users,
      categories,
      personalCategories,
      personalCategoriesSectionCollapsed,
      loans,
      assets,
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };

    saveState(currentState);
  }, [
    users,
    categories,
    personalCategories,
    personalCategoriesSectionCollapsed,
    loans,
    assets,
    isLoaded,
  ]);

  const addUser = useCallback(
    (name: string, income: number, municipalTaxRate?: number) => {
      const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
      const newUser: User = {
        id: uuidv4(),
        name,
        monthlyIncome: income,
        color: colors[users.length % colors.length],
        municipalTaxRate: municipalTaxRate || getDefaultMunicipalTaxRate(),
      };

      setUsers((prev) => {
        const newUsers = [...prev, newUser];
        // Update categories to include the new user
        setCategories(getInitialCategories(newUsers));
        return newUsers;
      });
    },
    [users.length]
  );

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const newUsers = prev.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      );

      // Update category names to reflect the new user names
      setCategories((prevCategories) =>
        prevCategories.map((cat) => {
          if (cat.id === `personal-${userId}`) {
            const updatedUser = newUsers.find((u) => u.id === userId);
            return {
              ...cat,
              name: `Personal - ${updatedUser?.name || cat.name.split(' - ')[1]}`,
            };
          }
          return cat;
        })
      );

      // Update asset percentage splits if income changed
      if (updates.monthlyIncome !== undefined) {
        const totalIncome = newUsers.reduce(
          (sum, user) => sum + user.monthlyIncome,
          0
        );
        const newIncomeBasedSplit: { [userId: string]: number } = {};
        newUsers.forEach((user) => {
          newIncomeBasedSplit[user.id] =
            totalIncome > 0
              ? user.monthlyIncome / totalIncome
              : 1 / newUsers.length;
        });

        setAssets((prevAssets) =>
          prevAssets.map((asset) => ({
            ...asset,
            fixedCosts: asset.fixedCosts.map((cost) => {
              if (cost.splitType === 'percentage') {
                return {
                  ...cost,
                  splitData: newIncomeBasedSplit,
                };
              }
              return cost;
            }),
          }))
        );

        // Also update shared expense percentage splits in categories
        setCategories((prevCategories) =>
          prevCategories.map((cat) => ({
            ...cat,
            expenses: cat.expenses.map((expense) => {
              if (expense.isShared && expense.splitType === 'percentage') {
                return {
                  ...expense,
                  splitData: newIncomeBasedSplit,
                };
              }
              return expense;
            }),
          }))
        );

        // Update loan percentage splits for both interest and mortgage
        setLoans((prevLoans) =>
          prevLoans.map((loan) => {
            const updatedLoan = { ...loan };

            // Update interest split if it's percentage-based
            if (
              loan.isInterestShared &&
              loan.interestSplitType === 'percentage'
            ) {
              updatedLoan.interestSplitData = newIncomeBasedSplit;
            }

            // Update mortgage split if it's percentage-based
            if (
              loan.isMortgageShared &&
              loan.mortgageSplitType === 'percentage'
            ) {
              updatedLoan.mortgageSplitData = newIncomeBasedSplit;
            }

            return updatedLoan;
          })
        );
      }

      return newUsers;
    });
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers((prev) => {
      const newUsers = prev.filter((user) => user.id !== userId);
      // Update categories to reflect the remaining users
      setCategories(getInitialCategories(newUsers));
      return newUsers;
    });
  }, []);

  const addExpense = useCallback(
    (categoryId: string, expense: Omit<Expense, 'id'>) => {
      const newExpense: Expense = {
        ...expense,
        id: uuidv4(),
      };

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, expenses: [...cat.expenses, newExpense] }
            : cat
        )
      );
    },
    []
  );

  const updateExpense = useCallback(
    (expenseId: string, updates: Partial<Expense>) => {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          expenses: cat.expenses.map((exp) =>
            exp.id === expenseId ? { ...exp, ...updates } : exp
          ),
        }))
      );
    },
    []
  );

  const deleteExpense = useCallback((expenseId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        expenses: cat.expenses.filter((exp) => exp.id !== expenseId),
      }))
    );
  }, []);

  // Remove addCategory - categories are now fixed

  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
      )
    );
  }, []);

  const addLoan = useCallback((loan: Omit<Loan, 'id'>) => {
    const newLoan: Loan = {
      ...loan,
      id: uuidv4(),
    };
    setLoans((prev) => [...prev, newLoan]);
  }, []);

  const updateLoan = useCallback((loanId: string, updates: Partial<Loan>) => {
    setLoans((prev) =>
      prev.map((loan) => (loan.id === loanId ? { ...loan, ...updates } : loan))
    );
  }, []);

  const deleteLoan = useCallback((loanId: string) => {
    setLoans((prev) => prev.filter((loan) => loan.id !== loanId));
  }, []);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => {
    const newAsset: Asset = {
      ...asset,
      id: uuidv4(),
    };
    setAssets((prev) => [...prev, newAsset]);
  }, []);

  const updateAsset = useCallback(
    (assetId: string, updates: Partial<Asset>) => {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, ...updates } : asset
        )
      );
    },
    []
  );

  const deleteAsset = useCallback((assetId: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const addPersonalCategory = useCallback((name: string) => {
    const newCategory: PersonalExpenseCategory = {
      id: uuidv4(),
      name,
      collapsed: false,
    };
    setPersonalCategories((prev) => [...prev, newCategory]);
  }, []);

  const updatePersonalCategory = useCallback(
    (categoryId: string, updates: Partial<PersonalExpenseCategory>) => {
      setPersonalCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId ? { ...category, ...updates } : category
        )
      );
    },
    []
  );

  const deletePersonalCategory = useCallback((categoryId: string) => {
    setPersonalCategories((prev) =>
      prev.filter((category) => category.id !== categoryId)
    );
    // Remove personalCategoryId from any expenses in this category
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        expenses: cat.expenses.map((exp) =>
          exp.personalCategoryId === categoryId
            ? { ...exp, personalCategoryId: undefined }
            : exp
        ),
      }))
    );
  }, []);

  const togglePersonalCategoryCollapse = useCallback((categoryId: string) => {
    setPersonalCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? { ...category, collapsed: !category.collapsed }
          : category
      )
    );
  }, []);

  const togglePersonalCategoriesSectionCollapse = useCallback(() => {
    setPersonalCategoriesSectionCollapsed((prev) => !prev);
  }, []);

  const calculateSettlements = useCallback((): Settlement[] => {
    const userBalances: { [userId: string]: number } = {};

    users.forEach((user) => {
      userBalances[user.id] = 0;
    });

    categories.forEach((category) => {
      category.expenses.forEach((expense) => {
        if (expense.isShared) {
          const paidBy = expense.paidBy || users[0]?.id;
          userBalances[paidBy] =
            (userBalances[paidBy] || 0) + getMonthlyAmount(expense);

          if (expense.splitType === 'equal') {
            const perPerson = getMonthlyAmount(expense) / users.length;
            users.forEach((user) => {
              userBalances[user.id] -= perPerson;
            });
          } else if (expense.splitType === 'percentage' && expense.splitData) {
            Object.entries(expense.splitData).forEach(
              ([userId, percentage]) => {
                if (userBalances[userId] !== undefined) {
                  // Only process if user still exists
                  userBalances[userId] -=
                    getMonthlyAmount(expense) * percentage;
                }
              }
            );
          }
        } else if (expense.userId && expense.paidBy !== expense.userId) {
          const paidBy = expense.paidBy || expense.userId;
          if (
            userBalances[paidBy] !== undefined &&
            userBalances[expense.userId] !== undefined
          ) {
            userBalances[paidBy] =
              (userBalances[paidBy] || 0) + getMonthlyAmount(expense);
            userBalances[expense.userId] -= getMonthlyAmount(expense);
          }
        }
      });
    });

    assets.forEach((asset) => {
      asset.fixedCosts.forEach((expense) => {
        if (expense.isShared) {
          const paidBy = expense.paidBy || users[0]?.id;
          userBalances[paidBy] =
            (userBalances[paidBy] || 0) + getMonthlyAmount(expense);

          if (expense.splitType === 'equal') {
            const perPerson = getMonthlyAmount(expense) / users.length;
            users.forEach((user) => {
              userBalances[user.id] -= perPerson;
            });
          } else if (expense.splitType === 'percentage' && expense.splitData) {
            Object.entries(expense.splitData).forEach(
              ([userId, percentage]) => {
                if (userBalances[userId] !== undefined) {
                  // Only process if user still exists
                  userBalances[userId] -=
                    getMonthlyAmount(expense) * percentage;
                }
              }
            );
          }
        }
      });
    });

    // Handle loan settlements - separate interest and mortgage
    loans.forEach((loan) => {
      const paidBy = loan.paidBy || users[0]?.id;
      const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
      const monthlyPrincipal = loan.monthlyPayment;

      // Fallback for old loan structure
      const isInterestShared =
        loan.isInterestShared !== undefined
          ? loan.isInterestShared
          : (loan as any).isShared;
      const interestSplitType =
        loan.interestSplitType || (loan as any).splitType || 'percentage';
      const interestSplitData =
        loan.interestSplitData || (loan as any).splitData;

      const isMortgageShared =
        loan.isMortgageShared !== undefined
          ? loan.isMortgageShared
          : (loan as any).isShared;
      const mortgageSplitType =
        loan.mortgageSplitType || (loan as any).splitType || 'equal';
      const mortgageSplitData =
        loan.mortgageSplitData || (loan as any).splitData;

      // Add interest + monthly payment to payer (treating them as separate costs)
      userBalances[paidBy] =
        (userBalances[paidBy] || 0) + monthlyInterest + loan.monthlyPayment;

      // Subtract interest portion based on interest splitting
      if (isInterestShared) {
        if (interestSplitType === 'equal') {
          const perPerson = monthlyInterest / users.length;
          users.forEach((user) => {
            userBalances[user.id] = (userBalances[user.id] || 0) - perPerson;
          });
        } else if (interestSplitType === 'percentage' && interestSplitData) {
          Object.entries(interestSplitData).forEach(([userId, percentage]) => {
            if (userBalances[userId] !== undefined) {
              // Only process if user still exists
              userBalances[userId] =
                (userBalances[userId] || 0) -
                monthlyInterest * (percentage as number);
            }
          });
        }
      } else {
        // Interest is personal to the payer
        userBalances[paidBy] = (userBalances[paidBy] || 0) - monthlyInterest;
      }

      // Subtract mortgage portion based on mortgage splitting
      if (isMortgageShared) {
        if (mortgageSplitType === 'equal') {
          const perPerson = monthlyPrincipal / users.length;
          users.forEach((user) => {
            userBalances[user.id] = (userBalances[user.id] || 0) - perPerson;
          });
        } else if (mortgageSplitType === 'percentage' && mortgageSplitData) {
          Object.entries(mortgageSplitData).forEach(([userId, percentage]) => {
            if (userBalances[userId] !== undefined) {
              // Only process if user still exists
              userBalances[userId] =
                (userBalances[userId] || 0) -
                monthlyPrincipal * (percentage as number);
            }
          });
        }
      } else {
        // Mortgage is personal to the payer
        userBalances[paidBy] = (userBalances[paidBy] || 0) - monthlyPrincipal;
      }
    });

    const settlements: Settlement[] = [];
    const debtors = Object.entries(userBalances).filter(
      ([, balance]) => balance < 0
    );
    const creditors = Object.entries(userBalances).filter(
      ([, balance]) => balance > 0
    );

    debtors.forEach(([debtorId, debtAmount]) => {
      let remainingDebt = Math.abs(debtAmount);

      creditors.forEach(([creditorId, creditAmount]) => {
        if (remainingDebt > 0 && creditAmount > 0) {
          const settlement = Math.min(remainingDebt, creditAmount);
          settlements.push({
            from: debtorId,
            to: creditorId,
            amount: settlement,
          });
          remainingDebt -= settlement;
          userBalances[creditorId] -= settlement;
        }
      });
    });

    return settlements;
  }, [users, categories, assets, loans]);

  const calculateDetailedBalances = useCallback(() => {
    const userBalances: {
      [userId: string]: {
        total: number;
        sharedExpenses: number;
        assets: { [assetName: string]: number };
        loanInterests: number;
        loanMortgages: number;
      };
    } = {};

    users.forEach((user) => {
      userBalances[user.id] = {
        total: 0,
        sharedExpenses: 0,
        assets: {},
        loanInterests: 0,
        loanMortgages: 0,
      };
    });

    // Calculate shared expenses from categories
    categories.forEach((category) => {
      category.expenses.forEach((expense) => {
        if (expense.isShared) {
          const paidBy = expense.paidBy || users[0]?.id;
          if (userBalances[paidBy]) {
            // Only process if payer still exists
            userBalances[paidBy].total += getMonthlyAmount(expense);
            userBalances[paidBy].sharedExpenses += getMonthlyAmount(expense);

            if (expense.splitType === 'equal') {
              const perPerson = getMonthlyAmount(expense) / users.length;
              users.forEach((user) => {
                userBalances[user.id].total -= perPerson;
                userBalances[user.id].sharedExpenses -= perPerson;
              });
            } else if (
              expense.splitType === 'percentage' &&
              expense.splitData
            ) {
              Object.entries(expense.splitData).forEach(
                ([userId, percentage]) => {
                  if (userBalances[userId]) {
                    // Only process if user still exists
                    const amount = getMonthlyAmount(expense) * percentage;
                    userBalances[userId].total -= amount;
                    userBalances[userId].sharedExpenses -= amount;
                  }
                }
              );
            }
          }
        }
      });
    });

    // Calculate asset costs by individual asset
    assets.forEach((asset) => {
      asset.fixedCosts.forEach((expense) => {
        if (expense.isShared) {
          const paidBy = expense.paidBy || users[0]?.id;
          const amount = getMonthlyAmount(expense);

          if (userBalances[paidBy]) {
            // Only process if payer still exists
            userBalances[paidBy].total += amount;
            userBalances[paidBy].assets[asset.name] =
              (userBalances[paidBy].assets[asset.name] || 0) + amount;

            if (expense.splitType === 'equal') {
              const perPerson = amount / users.length;
              users.forEach((user) => {
                userBalances[user.id].total -= perPerson;
                userBalances[user.id].assets[asset.name] =
                  (userBalances[user.id].assets[asset.name] || 0) - perPerson;
              });
            } else if (
              expense.splitType === 'percentage' &&
              expense.splitData
            ) {
              Object.entries(expense.splitData).forEach(
                ([userId, percentage]) => {
                  if (userBalances[userId]) {
                    // Only process if user still exists
                    const userAmount = amount * percentage;
                    userBalances[userId].total -= userAmount;
                    userBalances[userId].assets[asset.name] =
                      (userBalances[userId].assets[asset.name] || 0) -
                      userAmount;
                  }
                }
              );
            }
          }
        }
      });
    });

    // Calculate loan costs - separate interest and mortgage components
    loans.forEach((loan) => {
      const paidBy = loan.paidBy || users[0]?.id;
      const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
      const monthlyPrincipal = loan.monthlyPayment;

      // Fallback for old loan structure
      const isInterestShared =
        loan.isInterestShared !== undefined
          ? loan.isInterestShared
          : (loan as any).isShared;
      const interestSplitType =
        loan.interestSplitType || (loan as any).splitType || 'percentage';
      const interestSplitData =
        loan.interestSplitData || (loan as any).splitData;

      const isMortgageShared =
        loan.isMortgageShared !== undefined
          ? loan.isMortgageShared
          : (loan as any).isShared;
      const mortgageSplitType =
        loan.mortgageSplitType || (loan as any).splitType || 'equal';
      const mortgageSplitData =
        loan.mortgageSplitData || (loan as any).splitData;

      // Add interest + monthly payment to payer first
      if (userBalances[paidBy]) {
        // Only process if payer still exists
        userBalances[paidBy].total += monthlyInterest + loan.monthlyPayment;

        // Handle interest portion splitting
        if (isInterestShared) {
          userBalances[paidBy].loanInterests += monthlyInterest;

          if (interestSplitType === 'equal') {
            const perPerson = monthlyInterest / users.length;
            users.forEach((user) => {
              userBalances[user.id].total -= perPerson;
              userBalances[user.id].loanInterests -= perPerson;
            });
          } else if (interestSplitType === 'percentage' && interestSplitData) {
            Object.entries(interestSplitData).forEach(
              ([userId, percentage]) => {
                if (userBalances[userId]) {
                  // Only process if user still exists
                  const userAmount = monthlyInterest * (percentage as number);
                  userBalances[userId].total -= userAmount;
                  userBalances[userId].loanInterests -= userAmount;
                }
              }
            );
          }
        }

        // Handle principal portion splitting
        if (isMortgageShared) {
          userBalances[paidBy].loanMortgages += monthlyPrincipal;

          if (mortgageSplitType === 'equal') {
            const perPerson = monthlyPrincipal / users.length;
            users.forEach((user) => {
              userBalances[user.id].total -= perPerson;
              userBalances[user.id].loanMortgages -= perPerson;
            });
          } else if (mortgageSplitType === 'percentage' && mortgageSplitData) {
            Object.entries(mortgageSplitData).forEach(
              ([userId, percentage]) => {
                if (userBalances[userId]) {
                  // Only process if user still exists
                  const userAmount = monthlyPrincipal * (percentage as number);
                  userBalances[userId].total -= userAmount;
                  userBalances[userId].loanMortgages -= userAmount;
                }
              }
            );
          }
        }
      }
    });

    return userBalances;
  }, [users, categories, assets, loans]);

  const calculateBudgetSummary = useCallback((): BudgetSummary => {
    const totalIncome = users.reduce(
      (sum, user) => sum + user.monthlyIncome,
      0
    );

    const allExpenses = categories.flatMap((cat) => cat.expenses);
    const totalSharedExpenses = allExpenses
      .filter((exp) => exp.isShared)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    const totalPersonalExpenses = allExpenses
      .filter((exp) => !exp.isShared)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    // Calculate total asset expenses (both fixed and variable costs)
    const totalAssetExpenses = assets.reduce(
      (sum, asset) =>
        sum +
        [...asset.fixedCosts, ...asset.variableCosts].reduce(
          (expSum, exp) => expSum + getMonthlyAmount(exp),
          0
        ),
      0
    );

    // Calculate total loan costs (interest + principal payments)
    const totalLoanCosts = loans.reduce((sum, loan) => {
      const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
      return sum + monthlyInterest + loan.monthlyPayment;
    }, 0);

    const afterTaxIncome = users.reduce(
      (sum, user) =>
        sum +
        calculateMonthlyAfterTaxIncome(
          user.monthlyIncome * 12,
          user.municipalTaxRate
        ),
      0
    );
    // Calculate total household expenses (shared expenses + asset costs + loan costs)
    const totalHouseholdExpenses =
      totalSharedExpenses + totalAssetExpenses + totalLoanCosts;

    const afterHouseholdExpenses = afterTaxIncome - totalHouseholdExpenses;
    const afterPersonalExpenses =
      afterHouseholdExpenses - totalPersonalExpenses;
    const percentageRemaining = (afterPersonalExpenses / afterTaxIncome) * 100;

    return {
      totalIncome,
      totalSharedExpenses: totalHouseholdExpenses, // Now includes all household costs
      totalPersonalExpenses,
      afterTaxIncome,
      afterSharedExpenses: afterHouseholdExpenses, // Now the accurate household surplus
      afterPersonalExpenses,
      remainingIncome: afterPersonalExpenses,
      percentageRemaining,
    };
  }, [users, categories, assets, loans]);

  const calculateUserBreakdowns = useCallback((): UserBudgetBreakdown[] => {
    return users.map((user) => {
      const income = calculateMonthlyAfterTaxIncome(
        user.monthlyIncome * 12,
        user.municipalTaxRate
      );

      const sharedExpenses = categories
        .flatMap((cat) => cat.expenses)
        .filter((exp) => exp.isShared);

      const assetExpenses = assets.flatMap((asset) =>
        asset.fixedCosts.filter((exp) => exp.isShared)
      );

      const allSharedExpenses = [...sharedExpenses, ...assetExpenses];

      let sharedExpensesOwed = 0;
      allSharedExpenses.forEach((expense) => {
        if (expense.splitType === 'equal') {
          sharedExpensesOwed += getMonthlyAmount(expense) / users.length;
        } else if (
          expense.splitType === 'percentage' &&
          expense.splitData?.[user.id]
        ) {
          sharedExpensesOwed +=
            getMonthlyAmount(expense) * expense.splitData[user.id];
        }
      });

      // Add loan expenses to sharedExpensesOwed
      loans.forEach((loan) => {
        const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
        const monthlyPrincipal = loan.monthlyPayment;

        // Fallback for old loan structure
        const isInterestShared =
          loan.isInterestShared !== undefined
            ? loan.isInterestShared
            : (loan as any).isShared;
        const interestSplitType =
          loan.interestSplitType || (loan as any).splitType || 'percentage';
        const interestSplitData =
          loan.interestSplitData || (loan as any).splitData;

        const isMortgageShared =
          loan.isMortgageShared !== undefined
            ? loan.isMortgageShared
            : (loan as any).isShared;
        const mortgageSplitType =
          loan.mortgageSplitType || (loan as any).splitType || 'equal';
        const mortgageSplitData =
          loan.mortgageSplitData || (loan as any).splitData;

        // Interest allocation
        if (isInterestShared) {
          if (interestSplitType === 'equal') {
            sharedExpensesOwed += monthlyInterest / users.length;
          } else if (
            interestSplitType === 'percentage' &&
            interestSplitData?.[user.id]
          ) {
            sharedExpensesOwed += monthlyInterest * interestSplitData[user.id];
          }
        }

        // Mortgage allocation
        if (isMortgageShared) {
          if (mortgageSplitType === 'equal') {
            sharedExpensesOwed += monthlyPrincipal / users.length;
          } else if (
            mortgageSplitType === 'percentage' &&
            mortgageSplitData?.[user.id]
          ) {
            sharedExpensesOwed += monthlyPrincipal * mortgageSplitData[user.id];
          }
        }
      });

      const personalExpenses = categories
        .flatMap((cat) => cat.expenses)
        .filter((exp) => !exp.isShared && exp.userId === user.id)
        .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

      const remainingAfterExpenses =
        income - sharedExpensesOwed - personalExpenses;

      // Calculate personal expense breakdown by categories
      const personalExpenseBreakdown: PersonalExpenseBreakdown[] = [];

      // Add uncategorized personal expenses
      const uncategorizedPersonalExpenses = categories
        .flatMap((cat) => cat.expenses)
        .filter(
          (exp) =>
            !exp.isShared && exp.userId === user.id && !exp.personalCategoryId
        )
        .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

      if (uncategorizedPersonalExpenses > 0) {
        personalExpenseBreakdown.push({
          categoryId: 'uncategorized',
          categoryName: 'Uncategorized',
          amount: uncategorizedPersonalExpenses,
          percentage:
            income > 0 ? (uncategorizedPersonalExpenses / income) * 100 : 0,
        });
      }

      // Add categorized personal expenses
      personalCategories.forEach((category) => {
        const categoryExpenses = categories
          .flatMap((cat) => cat.expenses)
          .filter(
            (exp) =>
              !exp.isShared &&
              exp.userId === user.id &&
              exp.personalCategoryId === category.id
          )
          .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

        if (categoryExpenses > 0) {
          personalExpenseBreakdown.push({
            categoryId: category.id,
            categoryName: category.name,
            amount: categoryExpenses,
            percentage: income > 0 ? (categoryExpenses / income) * 100 : 0,
          });
        }
      });

      const sharedExpensePercentage =
        income > 0 ? (sharedExpensesOwed / income) * 100 : 0;

      return {
        userId: user.id,
        income,
        sharedExpensesOwed,
        personalExpenses,
        netPosition: 0,
        remainingAfterExpenses,
        personalExpenseBreakdown,
        sharedExpensePercentage,
      };
    });
  }, [users, categories, assets, personalCategories]);

  // Export/Import functions
  const getCurrentState = useCallback((): AppState => {
    return {
      users,
      categories,
      personalCategories,
      personalCategoriesSectionCollapsed,
      loans,
      assets,
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }, [
    users,
    categories,
    personalCategories,
    personalCategoriesSectionCollapsed,
    loans,
    assets,
  ]);

  const importAppState = useCallback((state: AppState) => {
    setUsers(state.users);
    setCategories(state.categories);
    setPersonalCategories(state.personalCategories);
    setPersonalCategoriesSectionCollapsed(
      state.personalCategoriesSectionCollapsed || false
    );
    setLoans(state.loans);
    setAssets(state.assets);
  }, []);

  return {
    users,
    categories,
    personalCategories,
    personalCategoriesSectionCollapsed,
    loans,
    assets,
    addUser,
    updateUser,
    deleteUser,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleCategoryCollapse,
    addPersonalCategory,
    updatePersonalCategory,
    deletePersonalCategory,
    togglePersonalCategoryCollapse,
    togglePersonalCategoriesSectionCollapse,
    addLoan,
    updateLoan,
    deleteLoan,
    addAsset,
    updateAsset,
    deleteAsset,
    calculateSettlements,
    calculateDetailedBalances,
    calculateBudgetSummary,
    calculateUserBreakdowns,
    // State management functions
    getCurrentState,
    importAppState,
    isLoaded,
  };
}
