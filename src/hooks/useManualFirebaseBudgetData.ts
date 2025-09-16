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
import { calculateMonthlyAfterTaxIncome } from '../utils/swedishTaxCalculation';
import { getMonthlyAmount } from '../utils/expenseCalculations';

const getInitialState = (): AppState => {
  return {
    users: [],
    categories: [],
    personalCategories: [],
    personalCategoriesSectionCollapsed: false,
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
  const [
    personalCategoriesSectionCollapsed,
    setPersonalCategoriesSectionCollapsed,
  ] = useState(false);
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
            setPersonalCategoriesSectionCollapsed(
              decryptedState.personalCategoriesSectionCollapsed || false
            );
            setLoans(decryptedState.loans || []);
            setAssets(decryptedState.assets || []);
            setUsers(decryptedState.users || []);
          } else {
            // No data exists yet - use initial state
            const defaultState = getInitialState();
            setCategories(defaultState.categories);
            setPersonalCategories(defaultState.personalCategories);
            setPersonalCategoriesSectionCollapsed(
              defaultState.personalCategoriesSectionCollapsed || false
            );
            setLoans(defaultState.loans);
            setAssets(defaultState.assets);
            setUsers(defaultState.users);
          }
        } catch (error) {
          console.error(`❌ Error processing real-time encrypted data:`, error);
          setError(
            `Failed to decrypt real-time data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        } finally {
          setIsLoading(false);
          setIsLoaded(true);
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
          personalCategoriesSectionCollapsed,
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
      personalCategoriesSectionCollapsed,
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
          collapsed: false,
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

  const toggleCategoryCollapse = useCallback((categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
      )
    );
  }, []);

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
    // Also remove the personalCategoryId from any expenses that reference it
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

  // Calculation methods remain the same...
  const calculateSettlements = useCallback((): Settlement[] => {
    const userBalances: { [userId: string]: number } = {};

    users.forEach((user) => {
      userBalances[user.id] = 0;
    });

    categories.forEach((category) => {
      category.expenses.forEach((expense) => {
        if (expense.isShared && !expense.isBudgeted) {
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
                    getMonthlyAmount(expense) * (percentage as number);
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
      asset.expenses
        .filter((expense: any) => !expense.isBudgeted)
        .forEach((expense: any) => {
          if (expense.isShared) {
            const paidBy = expense.paidBy || users[0]?.id;
            userBalances[paidBy] =
              (userBalances[paidBy] || 0) + getMonthlyAmount(expense);

            if (expense.splitType === 'equal') {
              const perPerson = getMonthlyAmount(expense) / users.length;
              users.forEach((user) => {
                userBalances[user.id] -= perPerson;
              });
            } else if (
              expense.splitType === 'percentage' &&
              expense.splitData
            ) {
              Object.entries(expense.splitData).forEach(
                ([userId, percentage]) => {
                  if (userBalances[userId] !== undefined) {
                    // Only process if user still exists
                    userBalances[userId] -=
                      getMonthlyAmount(expense) * (percentage as number);
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
  }, [users, categories, personalCategories, assets, loans]);

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
        if (expense.isShared && !expense.isBudgeted) {
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
      asset.expenses
        .filter((expense: any) => !expense.isBudgeted)
        .forEach((expense: any) => {
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
                      const userAmount = amount * (percentage as number);
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
  }, [users, categories, personalCategories, assets, loans]);

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
        asset.expenses
          .filter((exp) => !exp.isBudgeted)
          .reduce((expSum, exp) => expSum + getMonthlyAmount(exp), 0),
      0
    );

    // Calculate budgeted asset expenses separately
    const totalBudgetedAssetExpenses = assets.reduce(
      (sum, asset) =>
        sum +
        asset.expenses
          .filter((exp) => exp.isBudgeted)
          .reduce((expSum, exp) => expSum + getMonthlyAmount(exp), 0),
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
      const income = calculateMonthlyAfterTaxIncome(
        user.monthlyIncome * 12,
        user.municipalTaxRate
      );

      const sharedExpenses = categories
        .flatMap((cat) => cat.expenses)
        .filter((exp) => exp.isShared && !exp.isBudgeted);

      const assetExpenses = assets.flatMap((asset) =>
        asset.expenses.filter((exp) => !exp.isBudgeted && exp.isShared)
      );

      const allSharedExpenses = [...sharedExpenses, ...assetExpenses];

      let sharedExpensesOwed = 0;
      allSharedExpenses.forEach((expense) => {
        if (expense.splitType === 'equal') {
          sharedExpensesOwed += getMonthlyAmount(expense) / users.length;
        } else if (expense.splitType === 'percentage') {
          if (expense.splitData?.[user.id] !== undefined) {
            sharedExpensesOwed +=
              getMonthlyAmount(expense) * expense.splitData[user.id];
          } else {
            // Fallback: calculate income-based percentage
            const totalIncome = users.reduce(
              (sum, u) => sum + u.monthlyIncome,
              0
            );
            const userPercentage =
              totalIncome > 0
                ? user.monthlyIncome / totalIncome
                : 1 / users.length;
            sharedExpensesOwed += getMonthlyAmount(expense) * userPercentage;
          }
        }
      });

      // Add loan expenses
      loans.forEach((loan) => {
        const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
        const monthlyPrincipal = loan.monthlyPayment;

        // Interest allocation (shared equally for now)
        if (loan.isInterestShared) {
          sharedExpensesOwed += monthlyInterest / users.length;
        }

        // Mortgage allocation (shared equally for now)
        if (loan.isMortgageShared) {
          sharedExpensesOwed += monthlyPrincipal / users.length;
        }
      });

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
      };
    });
  }, [users, categories, personalCategories, assets, loans]);

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
    getCurrentState,
    importAppState,
    isLoaded,
    isLoading,
    isSaving: false,
    error,
    encryptionReady, // Export encryption readiness
  };
}
