import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  encryptionService,
  type HouseholdData,
} from '../services/encryptionService';

// Generate a simple user ID for this browser session
const getCurrentUserId = (): string => {
  let userId = localStorage.getItem('household_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('household_user_id', userId);
  }
  return userId;
};
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
import { calculateAfterTaxIncomeWithTablesSync } from '../services/taxService';
import { getMonthlyAmount } from '../utils/expenseCalculations';
import {
  getAssetExpenses,
  getLoanInterest,
  getLoanRepayment,
  getSettlements,
  getUserBalances,
  getUserCosts,
} from '../utils/costAllocation';

const getInitialState = (): AppState => {
  return {
    users: [],
    categories: [],
    personalCategories: [],
    loans: [],
    assets: [],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  };
};

export function useManualFirebaseBudgetData(householdId: string) {
  const currentUserId = getCurrentUserId();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Encryption state
  const [encryptionReady, setEncryptionReady] = useState(false);

  // Data state
  const [isLoaded, setIsLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [personalCategories, setPersonalCategories] = useState<
    PersonalExpenseCategory[]
  >([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Check if password is available for encryption
  useEffect(() => {
    if (!householdId) {
      return;
    }

    // Check if we have the password in memory
    if (encryptionService.hasHouseholdPassword(householdId)) {
      setEncryptionReady(true);
    } else {
      setEncryptionReady(false);
      setError('Household password required');
    }
  }, [householdId]);

  // Real-time listener for encrypted household data
  useEffect(() => {
    if (!encryptionReady || !householdId) {
      return;
    }

    const password = encryptionService.getHouseholdPassword(householdId);
    if (!password) {
      setError('No password available for household');
      return;
    }

    const householdDocRef = doc(db, 'households', householdId);

    const unsubscribe = onSnapshot(
      householdDocRef,
      async (docSnap) => {
        try {
          setIsLoading(true);

          if (docSnap.exists()) {
            const householdData = docSnap.data() as HouseholdData;

            // Decrypt the data using password
            const decryptedState = await encryptionService.decryptHouseholdData(
              householdData,
              password
            );

            // In password-only system, we don't need to verify user exists in users array
            // Users can be added manually in the Users page for budget calculations

            // Update state from decrypted Firebase data (no saves should trigger from this)
            setCategories(decryptedState.categories || []);
            setPersonalCategories(decryptedState.personalCategories || []);
            setLoans(decryptedState.loans || []);
            setAssets(decryptedState.assets || []);
            setUsers(decryptedState.users || []);
          } else {
            // No data exists yet - use initial state
            const defaultState = getInitialState();
            setCategories(defaultState.categories);
            setPersonalCategories(defaultState.personalCategories);
            setLoans(defaultState.loans);
            setAssets(defaultState.assets);
            setUsers(defaultState.users);
          }

          // Only a successful read may unlock editing, since a save overwrites everything.
          setIsLoaded(true);
          setError(null);
        } catch (error) {
          console.error(`❌ Error processing real-time encrypted data:`, error);
          setError(
            `Failed to decrypt real-time data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error(`❌ Real-time listener error:`, error);
        setError(`Real-time sync error: ${error.message}`);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [householdId, encryptionReady]);

  // Helper function to encrypt and save data to Firebase
  const saveEncryptedData = useCallback(
    async (dataToSave: Partial<AppState>) => {
      if (!encryptionReady) {
        throw new Error('Encryption not ready');
      }

      const password = encryptionService.getHouseholdPassword(householdId);
      if (!password) {
        throw new Error('No password available for household');
      }

      try {
        const budgetData = {
          categories,
          personalCategories,
          loans,
          assets,
          users,
          version: '1.0.0',
          ...dataToSave, // Override with any specific data to save
        };

        // Encrypt the entire household data
        const encryptedHouseholdData =
          await encryptionService.encryptHouseholdData(budgetData, password);

        // Save to Firebase
        const householdDocRef = doc(db, 'households', householdId);
        await setDoc(householdDocRef, encryptedHouseholdData, { merge: true });
      } catch (error) {
        console.error('❌ Error saving encrypted data:', error);
        throw error;
      }
    },
    [
      encryptionReady,
      currentUserId,
      categories,
      personalCategories,
      loans,
      assets,
      users,
      householdId,
    ]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>) => {
      try {
        // Update the local users state
        const updatedUsers = users.map((user) =>
          user.id === userId ? { ...user, ...updates } : user
        );

        // If the name changed, update the personal category name too
        let updatedCategories = categories;
        if (updates.name) {
          const updatedUser = updatedUsers.find((u) => u.id === userId);
          if (updatedUser) {
            updatedCategories = categories.map((category) => {
              if (category.id === `personal-${userId}`) {
                return {
                  ...category,
                  name: `Personal - ${updatedUser.name}`,
                };
              }
              return category;
            });
          }
        }

        // Save the updated data to Firebase - real-time listener will update local state
        await saveEncryptedData({
          users: updatedUsers,
          categories: updatedCategories,
        });
      } catch (error) {
        console.error(`❌ Failed to update user ${userId}:`, error);
        throw error;
      }
    },
    [users, categories, saveEncryptedData]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        // Calculate all the updated data synchronously

        // Clean up categories (remove personal category and shared expenses paid by user)
        const updatedCategories = categories
          .map((category) => {
            if (category.id === 'shared') {
              const filteredExpenses = category.expenses.filter((expense) => {
                const shouldRemove = expense.paidBy === userId;
                if (shouldRemove) {
                } else {
                }
                return !shouldRemove;
              });

              return {
                ...category,
                expenses: filteredExpenses,
              };
            }
            return category;
          })
          .filter((category) => category.id !== `personal-${userId}`);

        // Clean up loans
        const updatedLoans = loans.filter((loan) => loan.paidBy !== userId);

        // Remove the user from the users array
        const updatedUsers = users.filter((user) => user.id !== userId);

        // Save the updated data to Firebase first, then update local state
        await saveEncryptedData({
          categories: updatedCategories,
          loans: updatedLoans,
          users: updatedUsers,
        });

        // Update local state (real-time listener will also update, but this prevents UI flicker)
        setCategories(updatedCategories);
        setLoans(updatedLoans);
        setUsers(updatedUsers);
      } catch (error) {
        console.error(`❌ Failed to remove member ${userId}:`, error);
        throw error;
      }
    },
    [categories, loans, users, saveEncryptedData]
  );

  const addUser = useCallback(
    async (userData: Omit<User, 'id'>) => {
      try {
        // Generate a unique user ID for each new user
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newUser: User = {
          ...userData,
          id: newUserId,
        };

        const updatedUsers = [...users, newUser];

        // Add personal expense category for the new user
        const personalCategory = {
          id: `personal-${newUser.id}`,
          name: `Personal - ${newUser.name}`,
          collapsed: false,
          expenses: [],
        };

        const updatedCategories = [...categories, personalCategory];

        // Update state and save
        setUsers(updatedUsers);
        setCategories(updatedCategories);

        await saveEncryptedData({
          users: updatedUsers,
          categories: updatedCategories,
        });
      } catch (error) {
        console.error(`❌ Failed to add user:`, error);
        throw error;
      }
    },
    [users, categories, saveEncryptedData]
  );

  // All the other methods remain the same, but now they trigger encrypted auto-save
  const addExpense = useCallback(
    async (categoryId: string, expense: Omit<Expense, 'id'>) => {
      const newExpense: Expense = {
        ...expense,
        id: uuidv4(),
      };

      let updatedCategories: ExpenseCategory[];
      const existingCategory = categories.find((cat) => cat.id === categoryId);

      if (existingCategory) {
        updatedCategories = categories.map((cat) =>
          cat.id === categoryId
            ? { ...cat, expenses: [...cat.expenses, newExpense] }
            : cat
        );
      } else {
        const newCategory: ExpenseCategory = {
          id: categoryId,
          name: categoryId === 'shared' ? 'Household Expenses' : 'New Category',
          expenses: [newExpense],
        };
        updatedCategories = [...categories, newCategory];
      }

      setCategories(updatedCategories);
      await saveEncryptedData({ categories: updatedCategories });
    },
    [categories, saveEncryptedData]
  );

  const updateExpense = useCallback(
    async (expenseId: string, updates: Partial<Expense>) => {
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        expenses: cat.expenses.map((exp) =>
          exp.id === expenseId ? { ...exp, ...updates } : exp
        ),
      }));
      setCategories(updatedCategories);
      await saveEncryptedData({ categories: updatedCategories });
    },
    [categories, saveEncryptedData]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        expenses: cat.expenses.filter((exp) => exp.id !== expenseId),
      }));
      setCategories(updatedCategories);
      await saveEncryptedData({ categories: updatedCategories });
    },
    [categories, saveEncryptedData]
  );

  const addLoan = useCallback(
    async (loan: Omit<Loan, 'id'>) => {
      const newLoan: Loan = {
        ...loan,
        id: uuidv4(),
      };
      const updatedLoans = [...loans, newLoan];
      setLoans(updatedLoans);
      await saveEncryptedData({ loans: updatedLoans });
    },
    [loans, saveEncryptedData]
  );

  const updateLoan = useCallback(
    async (loanId: string, updates: Partial<Loan>) => {
      const updatedLoans = loans.map((loan) =>
        loan.id === loanId ? { ...loan, ...updates } : loan
      );
      setLoans(updatedLoans);
      await saveEncryptedData({ loans: updatedLoans });
    },
    [loans, saveEncryptedData]
  );

  const updateLoans = useCallback(
    async (updatesByLoanId: Record<string, Partial<Loan>>) => {
      const updatedLoans = loans.map((loan) =>
        updatesByLoanId[loan.id]
          ? { ...loan, ...updatesByLoanId[loan.id] }
          : loan
      );
      setLoans(updatedLoans);
      await saveEncryptedData({ loans: updatedLoans });
    },
    [loans, saveEncryptedData]
  );

  const deleteLoan = useCallback(
    async (loanId: string) => {
      const updatedLoans = loans.filter((loan) => loan.id !== loanId);
      setLoans(updatedLoans);
      await saveEncryptedData({ loans: updatedLoans });
    },
    [loans, saveEncryptedData]
  );

  const addAsset = useCallback(
    async (asset: Omit<Asset, 'id'>) => {
      const newAsset: Asset = {
        ...asset,
        id: uuidv4(),
      };
      const updatedAssets = [...assets, newAsset];
      setAssets(updatedAssets);
      await saveEncryptedData({ assets: updatedAssets });
    },
    [assets, saveEncryptedData]
  );

  const updateAsset = useCallback(
    async (assetId: string, updates: Partial<Asset>) => {
      const updatedAssets = assets.map((asset) =>
        asset.id === assetId ? { ...asset, ...updates } : asset
      );
      setAssets(updatedAssets);
      await saveEncryptedData({ assets: updatedAssets });
    },
    [assets, saveEncryptedData]
  );

  const deleteAsset = useCallback(
    async (assetId: string) => {
      const updatedAssets = assets.filter((asset) => asset.id !== assetId);
      setAssets(updatedAssets);
      await saveEncryptedData({ assets: updatedAssets });
    },
    [assets, saveEncryptedData]
  );

  const addPersonalCategory = useCallback(
    async (name: string): Promise<string> => {
      const newCategory: PersonalExpenseCategory = {
        id: uuidv4(),
        name,
      };
      const updatedPersonalCategories = [...personalCategories, newCategory];
      setPersonalCategories(updatedPersonalCategories);
      await saveEncryptedData({
        personalCategories: updatedPersonalCategories,
      });
      return newCategory.id;
    },
    [personalCategories, saveEncryptedData]
  );

  const updatePersonalCategory = useCallback(
    async (categoryId: string, updates: Partial<PersonalExpenseCategory>) => {
      const updatedPersonalCategories = personalCategories.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category
      );
      setPersonalCategories(updatedPersonalCategories);
      await saveEncryptedData({
        personalCategories: updatedPersonalCategories,
      });
    },
    [personalCategories, saveEncryptedData]
  );

  const deletePersonalCategory = useCallback(
    async (categoryId: string) => {
      const updatedPersonalCategories = personalCategories.filter(
        (category) => category.id !== categoryId
      );
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        expenses: cat.expenses.map((exp) =>
          exp.personalCategoryId === categoryId
            ? { ...exp, personalCategoryId: undefined }
            : exp
        ),
      }));
      setPersonalCategories(updatedPersonalCategories);
      setCategories(updatedCategories);
      await saveEncryptedData({
        personalCategories: updatedPersonalCategories,
        categories: updatedCategories,
      });
    },
    [personalCategories, categories, saveEncryptedData]
  );

  // Calculation methods remain the same...
  const calculateDetailedBalances = useCallback(
    () => getUserBalances({ users, categories, assets, loans }),
    [users, categories, assets, loans]
  );

  const calculateSettlements = useCallback(
    (): Settlement[] => getSettlements(calculateDetailedBalances()),
    [calculateDetailedBalances]
  );

  const calculateBudgetSummary = useCallback((): BudgetSummary => {
    const totalIncome = users.reduce(
      (sum, user) => sum + user.monthlyIncome,
      0
    );

    const allExpenses = categories.flatMap((cat) => cat.expenses);

    // Calculate fixed expenses (non-budgeted)
    const totalSharedExpenses = allExpenses
      .filter((exp) => exp.isShared && !exp.isBudgeted)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    const totalPersonalExpenses = allExpenses
      .filter((exp) => !exp.isShared && !exp.isBudgeted)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    // Calculate budgeted expenses separately
    const totalBudgetedSharedExpenses = allExpenses
      .filter((exp) => exp.isShared && exp.isBudgeted)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    const totalBudgetedPersonalExpenses = allExpenses
      .filter((exp) => !exp.isShared && exp.isBudgeted)
      .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

    // Calculate total asset expenses (only fixed costs for main budget)
    const totalAssetExpenses = assets.reduce(
      (sum, asset) =>
        sum +
        getAssetExpenses(asset)
          .filter((exp) => !exp.isBudgeted)
          .reduce((expSum, exp) => expSum + getMonthlyAmount(exp), 0),
      0
    );

    // Calculate budgeted asset expenses separately
    const totalBudgetedAssetExpenses = assets.reduce(
      (sum, asset) =>
        sum +
        getAssetExpenses(asset)
          .filter((exp) => exp.isBudgeted)
          .reduce((expSum, exp) => expSum + getMonthlyAmount(exp), 0),
      0
    );

    // Calculate total loan costs (interest + repayment payments)
    const totalLoanCosts = loans.reduce((sum, loan) => {
      const monthlyInterest = getLoanInterest(loan);
      return sum + monthlyInterest + getLoanRepayment(loan);
    }, 0);

    const afterTaxIncome = users.reduce((sum, user) => {
      if (user.municipalityCode) {
        const result = calculateAfterTaxIncomeWithTablesSync(
          user.monthlyIncome * 12,
          user.municipalityCode
        );
        return sum + result.monthlyAfterTax;
      }
      return sum;
    }, 0);
    // Calculate total household expenses (shared expenses + asset costs + loan costs)
    const totalHouseholdExpenses =
      totalSharedExpenses + totalAssetExpenses + totalLoanCosts;

    const afterHouseholdExpenses = afterTaxIncome - totalHouseholdExpenses;
    const afterPersonalExpenses =
      afterHouseholdExpenses - totalPersonalExpenses;
    const percentageRemaining =
      afterTaxIncome > 0 ? (afterPersonalExpenses / afterTaxIncome) * 100 : 0;

    return {
      totalIncome,
      totalSharedExpenses: totalHouseholdExpenses, // Now includes all household costs
      totalPersonalExpenses,
      totalBudgetedSharedExpenses:
        totalBudgetedSharedExpenses + totalBudgetedAssetExpenses,
      totalBudgetedPersonalExpenses,
      afterTaxIncome,
      afterSharedExpenses: afterHouseholdExpenses, // Now the accurate household surplus
      afterPersonalExpenses,
      remainingIncome: afterPersonalExpenses,
      percentageRemaining,
    };
  }, [users, categories, personalCategories, assets, loans]);

  const calculateUserBreakdowns = useCallback((): UserBudgetBreakdown[] => {
    return users.map((user) => {
      const income = user.municipalityCode
        ? calculateAfterTaxIncomeWithTablesSync(
            user.monthlyIncome * 12,
            user.municipalityCode
          ).monthlyAfterTax
        : 0;

      const costs = getUserCosts({ users, categories, assets, loans }, user.id);
      const sharedExpensesOwed =
        costs.household +
        costs.assets.reduce((sum, asset) => sum + asset.amount, 0) +
        costs.loanInterest +
        costs.loanRepayment;

      const personalExpenses = categories
        .flatMap((cat) => cat.expenses)
        .filter(
          (exp) => !exp.isShared && exp.userId === user.id && !exp.isBudgeted
        )
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
            !exp.isShared &&
            exp.userId === user.id &&
            !exp.personalCategoryId &&
            !exp.isBudgeted
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
              exp.personalCategoryId === category.id &&
              !exp.isBudgeted
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
        householdExpenses: costs.household,
        assetCosts: costs.assets,
        loanInterest: costs.loanInterest,
        loanRepayment: costs.loanRepayment,
      };
    });
  }, [users, categories, personalCategories, assets, loans]);

  const getCurrentState = useCallback((): AppState => {
    return {
      users,
      categories,
      personalCategories,
      loans,
      assets,
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }, [users, categories, personalCategories, loans, assets]);

  const importAppState = useCallback((state: AppState) => {
    setCategories(state.categories);
    setPersonalCategories(state.personalCategories);
    setLoans(state.loans);
    setAssets(state.assets);
  }, []);

  return {
    users,
    categories,
    personalCategories,
    loans,
    assets,
    addUser,
    updateUser,
    deleteUser,
    addExpense,
    updateExpense,
    deleteExpense,
    addPersonalCategory,
    updatePersonalCategory,
    deletePersonalCategory,
    addLoan,
    updateLoan,
    updateLoans,
    deleteLoan,
    addAsset,
    updateAsset,
    deleteAsset,
    calculateSettlements,
    calculateDetailedBalances,
    calculateBudgetSummary,
    calculateUserBreakdowns,
    getCurrentState,
    importAppState,
    isLoaded,
    isLoading,
    isSaving: false,
    error,
    encryptionReady, // Export encryption readiness
  };
}
