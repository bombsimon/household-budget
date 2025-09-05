import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
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
import { getMonthlyAmount } from '../utils/expenseCalculations';
import {
  calculateMonthlyAfterTaxIncome,
  getDefaultMunicipalTaxRate,
} from '../utils/swedishTaxCalculation';

interface FirestoreBudgetData extends AppState {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface HouseholdMember {
  role: 'owner' | 'member';
  addedAt: Timestamp;
  displayName?: string;
  email?: string;
  photoURL?: string;
  // Financial fields (previously from User interface)
  monthlyIncome: number;
  municipalTaxRate: number;
  color: string;
}

// Helper function to convert HouseholdMember to User for component compatibility
const memberToUser = (member: HouseholdMember, memberId: string): User => ({
  id: memberId,
  name: member.displayName || member.email?.split('@')[0] || 'User',
  monthlyIncome: member.monthlyIncome,
  color: member.color,
  municipalTaxRate: member.municipalTaxRate,
  firebaseUid: memberId,
  email: member.email,
  photoURL: member.photoURL,
  role: member.role,
});

// No sample data - everything starts empty

const getInitialState = (): AppState => {
  return {
    users: [], // Users are now managed via Firebase members collection
    categories: [], // Start completely empty - no sample data
    personalCategories: [],
    personalCategoriesSectionCollapsed: false,
    loans: [],
    assets: [],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  };
};

export function useManualFirebaseBudgetData(householdId: string) {
  const { user, loading: authLoading } = useAuth();
  // Firebase state - for real-time sync feedback
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);

  // Document reference moved to individual functions where needed

  // Load initial state - NO AUTOMATIC SAVING ANYWHERE
  const [isLoaded, setIsLoaded] = useState(false);
  const [members, setMembers] = useState<{
    [memberId: string]: HouseholdMember;
  }>({});
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

  // Load state from Firebase - wait for auth to complete first
  useEffect(() => {
    // Don't load data until authentication is resolved
    if (authLoading) {
      return;
    }

    const loadData = async () => {
      console.log(
        `🔄 Loading data for household: ${householdId}, user: ${user?.uid || 'anonymous'}`
      );
      setIsLoading(true);

      try {
        const householdDocRef = doc(db, 'households', householdId);
        const docSnap = await getDoc(householdDocRef);

        if (docSnap.exists()) {
          const firebaseState = docSnap.data() as FirestoreBudgetData;
          console.log(
            `✅ Loaded existing data from Firebase for household: ${householdId}`
          );

          const appState = {
            users: firebaseState.users || [],
            categories: firebaseState.categories || [],
            personalCategories: firebaseState.personalCategories || [],
            personalCategoriesSectionCollapsed:
              firebaseState.personalCategoriesSectionCollapsed || false,
            loans: firebaseState.loans || [],
            assets: firebaseState.assets || [],
            version: firebaseState.version || '1.0.0',
            lastUpdated: firebaseState.lastUpdated || new Date().toISOString(),
          };

          // Load existing data (users will be loaded by the members listener)
          setCategories(appState.categories);
          setPersonalCategories(appState.personalCategories);
          setPersonalCategoriesSectionCollapsed(
            appState.personalCategoriesSectionCollapsed || false
          );
          setLoans(appState.loans);
          setAssets(appState.assets);
        } else {
          console.log(
            `🆕 No data found for household ${householdId}, creating initial data and adding creator as owner`
          );

          // Create the household creator as owner member
          if (user) {
            try {
              const memberDocRef = doc(
                db,
                'households',
                householdId,
                'members',
                user.uid
              );
              const memberData: HouseholdMember = {
                role: 'owner',
                addedAt: serverTimestamp() as Timestamp,
                displayName: user.displayName || undefined,
                email: user.email || undefined,
                photoURL: user.photoURL || undefined,
                // Financial defaults
                monthlyIncome: 0,
                municipalTaxRate: getDefaultMunicipalTaxRate(),
                color: '#3B82F6',
              };
              await setDoc(memberDocRef, memberData);
              console.log(
                `✅ Added household creator ${user.displayName || user.email} as owner`
              );
            } catch (memberError) {
              console.error(
                'Error creating household owner member:',
                memberError
              );
            }
          }

          const defaultState = getInitialState();
          // Users will be created by the members listener, just set other data
          setCategories(defaultState.categories);
          setPersonalCategories(defaultState.personalCategories);
          setPersonalCategoriesSectionCollapsed(
            defaultState.personalCategoriesSectionCollapsed || false
          );
          setLoans(defaultState.loans);
          setAssets(defaultState.assets);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load: ${errorMessage}`);
        console.error(
          `❌ Error loading data for household ${householdId}:`,
          err
        );

        // Fall back to initial data on error
        const defaultState = getInitialState();
        // Users will be created by the members listener, just set other data
        setCategories(defaultState.categories);
        setPersonalCategories(defaultState.personalCategories);
        setPersonalCategoriesSectionCollapsed(
          defaultState.personalCategoriesSectionCollapsed || false
        );
        setLoans(defaultState.loans);
        setAssets(defaultState.assets);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [householdId, user, authLoading]); // Include user and authLoading in dependencies

  // Listen to household members and sync them with budget users
  // Real-time listener for household document (budget data)
  useEffect(() => {
    if (!householdId) return;

    console.log(
      `🔗 Setting up household document listener for: ${householdId}`
    );
    const householdDocRef = doc(db, 'households', householdId);

    const unsubscribe = onSnapshot(
      householdDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log(`📥 Received household data from Firebase`);

          // Update state from Firebase (only if data exists to avoid wiping local changes)
          if (data.categories) {
            console.log(
              `📝 Updating categories from Firebase:`,
              data.categories.length
            );
            setCategories(data.categories);
          }
          if (data.personalCategories) {
            setPersonalCategories(data.personalCategories);
          }
          if (data.personalCategoriesSectionCollapsed !== undefined) {
            setPersonalCategoriesSectionCollapsed(
              data.personalCategoriesSectionCollapsed
            );
          }
          if (data.loans) {
            setLoans(data.loans);
          }
          if (data.assets) {
            setAssets(data.assets);
          }

          setIsLoading(false);
          console.log(`✅ Updated local state from Firebase`);
        } else {
          console.log(
            `📄 Household document doesn't exist yet: ${householdId}`
          );
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to household document:', error);
        setError(`Failed to sync: ${error.message}`);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [householdId]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const membersCollectionRef = collection(
      db,
      'households',
      householdId,
      'members'
    );

    console.log(`🔗 Setting up household members listener for: ${householdId}`);

    const unsubscribe = onSnapshot(
      membersCollectionRef,
      (snapshot) => {
        console.log(`👥 Household members changed, syncing to budget users...`);

        const colors = [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#8B5CF6',
          '#EC4899',
          '#06B6D4',
        ];
        const membersData: { [memberId: string]: HouseholdMember } = {};

        snapshot.forEach((doc) => {
          const memberData = doc.data() as HouseholdMember;
          const memberId = doc.id;

          // If this member doesn't have financial fields yet (old data), add defaults
          const completeMemberData: HouseholdMember = {
            ...memberData,
            monthlyIncome: memberData.monthlyIncome ?? 0,
            municipalTaxRate:
              memberData.municipalTaxRate ?? getDefaultMunicipalTaxRate(),
            color:
              memberData.color ??
              colors[Object.keys(membersData).length % colors.length],
          };

          membersData[memberId] = completeMemberData;
        });

        // Update members state
        setMembers(membersData);

        // Convert to users for compatibility with existing components
        const usersFromMembers = Object.entries(membersData).map(
          ([memberId, member]) => memberToUser(member, memberId)
        );

        // Ensure basic category structure exists for all users
        setCategories((prevCategories) => {
          const newCategories = [...prevCategories];

          // Ensure shared category exists
          if (!newCategories.find((cat) => cat.id === 'shared')) {
            newCategories.push({
              id: 'shared',
              name: 'Household Expenses',
              collapsed: false,
              expenses: [],
            });
          }

          // Ensure personal category exists for each user and update names
          usersFromMembers.forEach((user) => {
            const personalCategoryId = `personal-${user.id}`;
            const existingCategoryIndex = newCategories.findIndex(
              (cat) => cat.id === personalCategoryId
            );

            if (existingCategoryIndex >= 0) {
              // Update existing category name in case user name changed
              newCategories[existingCategoryIndex] = {
                ...newCategories[existingCategoryIndex],
                name: `Personal - ${user.name}`,
              };
            } else {
              // Create new category if it doesn't exist
              newCategories.push({
                id: personalCategoryId,
                name: `Personal - ${user.name}`,
                collapsed: false,
                expenses: [],
              });
            }
          });

          return newCategories;
        });

        console.log(
          `✅ Updated household members: ${Object.keys(membersData).length} members`
        );
      },
      (error) => {
        console.error('Error listening to household members:', error);
      }
    );

    return unsubscribe;
  }, [householdId, user, authLoading]);

  // Helper function to clean data by removing undefined values
  const cleanData = useCallback((obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => cleanData(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = cleanData(value);
        }
      }
      return cleaned;
    }

    return obj;
  }, []);

  // Auto-sync budget data to Firebase when state changes
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  useEffect(() => {
    if (!householdId || isLoading) return; // Don't sync during initial load

    const autoSyncToFirebase = async () => {
      console.log(`🔄 Auto-syncing budget data to Firebase...`);
      setIsAutoSyncing(true);

      try {
        const householdDocRef = doc(db, 'households', householdId);
        const budgetData = {
          categories,
          personalCategories,
          personalCategoriesSectionCollapsed,
          loans,
          assets,
          version: '1.0.0',
        };

        // Clean the data to remove undefined values
        const cleanedData = cleanData(budgetData);

        // Use merge to only update budget data, not overwrite members
        await setDoc(householdDocRef, cleanedData, { merge: true });
        console.log(`✅ Auto-synced budget data to Firebase`);
      } catch (error) {
        console.error('❌ Error auto-syncing to Firebase:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setError(`Sync failed: ${errorMessage}`);
      } finally {
        setIsAutoSyncing(false);
      }
    };

    // Debounce rapid changes (avoid spam)
    const timeoutId = setTimeout(autoSyncToFirebase, 500);

    return () => clearTimeout(timeoutId);
  }, [
    householdId,
    categories,
    personalCategories,
    personalCategoriesSectionCollapsed,
    loans,
    assets,
    isLoading,
    cleanData,
  ]);

  // Compute users from members for backward compatibility
  const users = useMemo(() => {
    return Object.entries(members).map(([memberId, member]) =>
      memberToUser(member, memberId)
    );
  }, [members]);

  // cleanData function moved earlier to fix dependency order

  // Manual save function removed - now using real-time auto-sync

  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>) => {
      try {
        console.log(`🔄 Updating member ${userId} in Firebase...`);

        // Convert User updates to HouseholdMember updates
        const memberUpdates: Partial<HouseholdMember> = {};

        if (updates.name !== undefined)
          memberUpdates.displayName = updates.name;
        if (updates.monthlyIncome !== undefined)
          memberUpdates.monthlyIncome = updates.monthlyIncome;
        if (updates.municipalTaxRate !== undefined)
          memberUpdates.municipalTaxRate = updates.municipalTaxRate;
        if (updates.color !== undefined) memberUpdates.color = updates.color;

        // Update the Firebase member document
        const memberDocRef = doc(
          db,
          'households',
          householdId,
          'members',
          userId
        );
        await updateDoc(memberDocRef, memberUpdates);

        console.log(`✅ Updated member ${userId} in Firebase`);

        // The real-time listener will automatically update the local state
      } catch (error) {
        console.error(`❌ Failed to update member ${userId}:`, error);
        throw error;
      }
    },
    [householdId]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        console.log(`🗑️ Removing member ${userId} from household...`);

        // Delete the Firebase member document
        const memberDocRef = doc(
          db,
          'households',
          householdId,
          'members',
          userId
        );
        await deleteDoc(memberDocRef);

        console.log(`✅ Removed member ${userId} from household`);

        // The real-time listener will automatically update the local state
      } catch (error) {
        console.error(`❌ Failed to remove member ${userId}:`, error);
        throw error;
      }
    },
    [householdId]
  );

  const addExpense = useCallback(
    (categoryId: string, expense: Omit<Expense, 'id'>) => {
      const newExpense: Expense = {
        ...expense,
        id: uuidv4(),
      };

      setCategories((prev) => {
        // Check if category exists
        const existingCategory = prev.find((cat) => cat.id === categoryId);

        if (existingCategory) {
          // Add expense to existing category
          return prev.map((cat) =>
            cat.id === categoryId
              ? { ...cat, expenses: [...cat.expenses, newExpense] }
              : cat
          );
        } else {
          // Auto-create the category and add the expense
          const newCategory: ExpenseCategory = {
            id: categoryId,
            name:
              categoryId === 'shared' ? 'Household Expenses' : 'New Category',
            collapsed: false,
            expenses: [newExpense],
          };
          return [...prev, newCategory];
        }
      });
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
    const percentageRemaining =
      afterTaxIncome > 0 ? (afterPersonalExpenses / afterTaxIncome) * 100 : 0;

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
        } else if (expense.splitType === 'percentage') {
          // Handle percentage split with fallback for missing splitData
          if (expense.splitData?.[user.id] !== undefined) {
            // Use existing splitData
            sharedExpensesOwed +=
              getMonthlyAmount(expense) * expense.splitData[user.id];
          } else {
            // Fallback: calculate income-based percentage on the fly
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
          } else if (interestSplitType === 'percentage') {
            if (interestSplitData?.[user.id] !== undefined) {
              // Use existing splitData
              sharedExpensesOwed +=
                monthlyInterest * interestSplitData[user.id];
            } else {
              // Fallback: calculate income-based percentage on the fly
              const totalIncome = users.reduce(
                (sum, u) => sum + u.monthlyIncome,
                0
              );
              const userPercentage =
                totalIncome > 0
                  ? user.monthlyIncome / totalIncome
                  : 1 / users.length;
              sharedExpensesOwed += monthlyInterest * userPercentage;
            }
          }
        }

        // Mortgage allocation
        if (isMortgageShared) {
          if (mortgageSplitType === 'equal') {
            sharedExpensesOwed += monthlyPrincipal / users.length;
          } else if (mortgageSplitType === 'percentage') {
            if (mortgageSplitData?.[user.id] !== undefined) {
              // Use existing splitData
              sharedExpensesOwed +=
                monthlyPrincipal * mortgageSplitData[user.id];
            } else {
              // Fallback: calculate income-based percentage on the fly
              const totalIncome = users.reduce(
                (sum, u) => sum + u.monthlyIncome,
                0
              );
              const userPercentage =
                totalIncome > 0
                  ? user.monthlyIncome / totalIncome
                  : 1 / users.length;
              sharedExpensesOwed += monthlyPrincipal * userPercentage;
            }
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
      lastUpdated: '2024-01-01T00:00:00.000Z',
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
    // Legacy import - users data will be ignored, members should be managed through Firebase
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
    // Real-time Firebase sync status
    isLoading,
    isSaving: isAutoSyncing, // Now represents auto-sync status
    error,
  };
}
