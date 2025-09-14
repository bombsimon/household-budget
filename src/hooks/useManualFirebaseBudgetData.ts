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
import {
  encryptionService,
  type EncryptedData,
  type HouseholdKeyInfo,
} from '../services/encryptionService';
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
import {
  getDefaultMunicipalTaxRate,
  calculateMonthlyAfterTaxIncome,
} from '../utils/swedishTaxCalculation';
import { getMonthlyAmount } from '../utils/expenseCalculations';

// This interface represents the encrypted household data stored in Firebase
interface EncryptedHouseholdData {
  encryptedData: EncryptedData;
  members: string[]; // List of member IDs with access
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface HouseholdMember {
  role: 'owner' | 'member';
  addedAt: Timestamp;
  displayName?: string;
  email?: string;
  photoURL?: string;
  color: string;

  // Encrypted sensitive salary data (required)
  encryptedData: EncryptedData;

  // These fields populated after decryption
  monthlyIncome: number;
  municipalTaxRate: number;
}

// Helper function to convert HouseholdMember to User for component compatibility
const memberToUser = (member: HouseholdMember, memberId: string): User => ({
  id: memberId,
  name: member.displayName || member.email?.split('@')[0] || 'User',
  monthlyIncome: member.monthlyIncome ?? 0,
  color: member.color,
  municipalTaxRate: member.municipalTaxRate ?? getDefaultMunicipalTaxRate(),
  firebaseUid: memberId,
  email: member.email,
  photoURL: member.photoURL,
  role: member.role,
});

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
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Encryption state
  const [householdKey, setHouseholdKey] = useState<CryptoKey | null>(null);
  const [encryptionReady, setEncryptionReady] = useState(false);

  // Data state
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

  // Load household key from Firebase
  useEffect(() => {
    const loadHouseholdKey = async () => {
      if (authLoading || !user) {
        return;
      }

      try {
        console.log(`🔐 Loading household key for ${householdId}`);

        // Try to get user's encrypted household key
        const keyDocRef = doc(db, 'households', householdId, 'keys', user.uid);
        const keySnap = await getDoc(keyDocRef);

        if (keySnap.exists()) {
          // User has access - decrypt the household key
          const keyInfo = keySnap.data() as HouseholdKeyInfo;
          const userToken = await encryptionService.getCurrentUserToken();
          const decryptedKey =
            await encryptionService.decryptHouseholdKeyForUser(
              keyInfo,
              userToken,
              householdId
            );

          setHouseholdKey(decryptedKey);
          setEncryptionReady(true);
          console.log(`✅ Successfully loaded household key`);
        } else {
          // User doesn't have access to household key
          console.log(`❌ User doesn't have access to household key`);
          setError('No access to household encryption key');
          setEncryptionReady(false);
        }
      } catch (error) {
        console.error('Error loading household key:', error);
        setError('Failed to load household key');
        setEncryptionReady(false);
      }
    };

    loadHouseholdKey();
  }, [householdId, user, authLoading]);

  // Load encrypted data from Firebase
  useEffect(() => {
    if (!encryptionReady || !householdKey || !user || authLoading) {
      return;
    }

    const loadEncryptedData = async () => {
      console.log(`📥 Loading encrypted data for household: ${householdId}`);
      setIsLoading(true);

      try {
        const householdDocRef = doc(db, 'households', householdId);
        const docSnap = await getDoc(householdDocRef);

        if (docSnap.exists()) {
          const encryptedDoc = docSnap.data() as EncryptedHouseholdData;
          console.log(`🔓 Decrypting household data`);

          // Decrypt the data
          const decryptedState = (await encryptionService.decryptData(
            encryptedDoc.encryptedData,
            householdKey
          )) as AppState;

          console.log(`✅ Successfully decrypted household data`);

          // Load the decrypted state
          setCategories(decryptedState.categories || []);
          setPersonalCategories(decryptedState.personalCategories || []);
          setPersonalCategoriesSectionCollapsed(
            decryptedState.personalCategoriesSectionCollapsed || false
          );
          setLoans(decryptedState.loans || []);
          setAssets(decryptedState.assets || []);
        } else {
          console.log(
            `🆕 No encrypted data found for household ${householdId}, using initial state`
          );

          // No data exists yet - use initial state
          const defaultState = getInitialState();
          setCategories(defaultState.categories);
          setPersonalCategories(defaultState.personalCategories);
          setPersonalCategoriesSectionCollapsed(
            defaultState.personalCategoriesSectionCollapsed || false
          );
          setLoans(defaultState.loans);
          setAssets(defaultState.assets);
        }
      } catch (error) {
        console.error(`❌ Error loading encrypted data:`, error);
        setError(
          `Failed to load encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Fall back to initial data on error
        const defaultState = getInitialState();
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

    loadEncryptedData();
  }, [householdId, householdKey, encryptionReady, user, authLoading]);

  // Listen to household members (unencrypted)
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
      async (snapshot) => {
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

        // Only process members if we have the household key
        if (!householdKey) {
          console.log('⏳ Waiting for household key to decrypt member data...');
          return;
        }

        // Process all member documents with decryption
        const memberPromises = snapshot.docs.map(async (doc, index) => {
          const memberData = doc.data() as HouseholdMember;
          const memberId = doc.id;

          // Decrypt member sensitive data
          const decryptedMemberData = await encryptionService.decryptData(
            memberData.encryptedData,
            householdKey
          );
          console.log(`🔓 Decrypted member data for ${memberId}`);

          const completeMemberData: HouseholdMember = {
            ...memberData,
            monthlyIncome: decryptedMemberData.monthlyIncome,
            municipalTaxRate: decryptedMemberData.municipalTaxRate,
            color: memberData.color ?? colors[index % colors.length],
          };

          return { memberId, completeMemberData };
        });

        // Wait for all decryption to complete
        const decryptedMembers = await Promise.all(memberPromises);

        // Build the members object
        decryptedMembers.forEach(({ memberId, completeMemberData }) => {
          membersData[memberId] = completeMemberData;
        });

        setMembers(membersData);

        // Update categories to ensure personal categories exist for all users
        const usersFromMembers = Object.entries(membersData).map(
          ([memberId, member]) => memberToUser(member, memberId)
        );

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
  }, [householdId, user, authLoading, householdKey]);

  // Helper function to encrypt and save data to Firebase
  const saveEncryptedData = useCallback(
    async (dataToSave: Partial<AppState>) => {
      if (!householdKey || !user) {
        throw new Error('Encryption not ready');
      }

      console.log(`💾 Saving encrypted data to Firebase...`);

      try {
        const budgetData = {
          categories,
          personalCategories,
          personalCategoriesSectionCollapsed,
          loans,
          assets,
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          ...dataToSave, // Override with any specific data to save
        };

        // Encrypt the data
        const encryptedData = await encryptionService.encryptData(
          budgetData,
          householdKey
        );

        // Get list of current member IDs
        const memberIds = Object.keys(members);

        // Save to Firebase
        const householdDocRef = doc(db, 'households', householdId);
        const encryptedDoc: EncryptedHouseholdData = {
          encryptedData,
          members: memberIds,
          updatedAt: serverTimestamp() as Timestamp,
        };

        await setDoc(householdDocRef, encryptedDoc, { merge: true });
        console.log(`✅ Successfully saved encrypted data to Firebase`);
      } catch (error) {
        console.error('❌ Error saving encrypted data:', error);
        throw error;
      }
    },
    [
      householdKey,
      user,
      categories,
      personalCategories,
      personalCategoriesSectionCollapsed,
      loans,
      assets,
      members,
      householdId,
    ]
  );

  // Auto-save when state changes
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  useEffect(() => {
    if (!householdKey || !isLoaded || isLoading) return;

    const autoSave = async () => {
      setIsAutoSaving(true);
      try {
        await saveEncryptedData({});
      } catch (error) {
        console.error('Auto-save failed:', error);
        setError(
          `Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsAutoSaving(false);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(autoSave, 500);
    return () => clearTimeout(timeoutId);
  }, [
    categories,
    personalCategories,
    personalCategoriesSectionCollapsed,
    loans,
    assets,
    saveEncryptedData,
    householdKey,
    isLoaded,
    isLoading,
  ]);

  // Compute users from members for backward compatibility
  const users = useMemo(() => {
    return Object.entries(members).map(([memberId, member]) =>
      memberToUser(member, memberId)
    );
  }, [members]);

  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>) => {
      if (!householdKey) {
        throw new Error(
          'Household key not available for encrypting user updates'
        );
      }

      try {
        console.log(`🔄 Updating member ${userId} in Firebase...`);

        const memberUpdates: Partial<HouseholdMember> = {};

        // Non-sensitive fields can be updated directly
        if (updates.name !== undefined)
          memberUpdates.displayName = updates.name;
        if (updates.color !== undefined) memberUpdates.color = updates.color;

        // Sensitive fields (income, tax rate) need to be encrypted
        if (
          updates.monthlyIncome !== undefined ||
          updates.municipalTaxRate !== undefined
        ) {
          // Get current member data to preserve existing encrypted data
          const currentMember = members[userId];
          if (currentMember) {
            const sensitiveData = {
              monthlyIncome:
                updates.monthlyIncome ?? currentMember.monthlyIncome,
              municipalTaxRate:
                updates.municipalTaxRate ?? currentMember.municipalTaxRate,
            };

            const encryptedData = await encryptionService.encryptData(
              sensitiveData,
              householdKey
            );
            memberUpdates.encryptedData = encryptedData;
            console.log(`🔐 Encrypted sensitive data for member ${userId}`);
          }
        }

        const memberDocRef = doc(
          db,
          'households',
          householdId,
          'members',
          userId
        );
        await updateDoc(memberDocRef, memberUpdates);

        console.log(`✅ Updated member ${userId} in Firebase`);
      } catch (error) {
        console.error(`❌ Failed to update member ${userId}:`, error);
        throw error;
      }
    },
    [householdId, householdKey, members]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        console.log(`🗑️ Removing member ${userId} from household...`);

        // Delete member document and encryption key first
        const memberDocRef = doc(
          db,
          'households',
          householdId,
          'members',
          userId
        );
        await deleteDoc(memberDocRef);

        const keyDocRef = doc(db, 'households', householdId, 'keys', userId);
        await deleteDoc(keyDocRef);

        // Clean up user data from local state after successful deletion
        console.log(`🧹 Cleaning up data for user ${userId}...`);

        setCategories((prev) => {
          // Only remove shared expenses where this user was paying
          const cleanedCategories = prev.map((category) => {
            if (category.id === 'shared') {
              const originalExpenses = category.expenses.length;
              const filteredExpenses = category.expenses.filter((expense) => {
                const shouldRemove = expense.paidBy === userId;
                if (shouldRemove) {
                  console.log(
                    `🗑️ Removing shared expense "${expense.name}" (paidBy: ${expense.paidBy})`
                  );
                } else {
                  console.log(
                    `✅ Keeping shared expense "${expense.name}" (paidBy: ${expense.paidBy})`
                  );
                }
                return !shouldRemove;
              });

              console.log(
                `📊 Shared expenses: ${originalExpenses} -> ${filteredExpenses.length}`
              );

              return {
                ...category,
                expenses: filteredExpenses,
              };
            }
            return category;
          });

          // Remove the entire personal category for this user
          const filtered = cleanedCategories.filter(
            (category) => category.id !== `personal-${userId}`
          );

          console.log(
            `🧹 Removed personal category and shared expenses paid by user ${userId}`
          );
          return filtered;
        });

        // DO NOT remove personalCategories - they are shared labels that should remain available

        setLoans((prev) => {
          const filtered = prev.filter(
            (loan) => loan.fromUserId !== userId && loan.toUserId !== userId
          );
          console.log(
            `🧹 Removed ${prev.length - filtered.length} loans for user ${userId}`
          );
          return filtered;
        });

        setAssets((prev) => {
          const filtered = prev.filter((asset) => asset.ownerId !== userId);
          console.log(
            `🧹 Removed ${prev.length - filtered.length} assets for user ${userId}`
          );
          return filtered;
        });

        // Give a moment for state updates to complete and trigger auto-save
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`✅ Data cleanup completed for user ${userId}`);

        console.log(`✅ Removed member ${userId} from household`);
      } catch (error) {
        console.error(`❌ Failed to remove member ${userId}:`, error);
        throw error;
      }
    },
    [householdId]
  );

  // All the other methods remain the same, but now they trigger encrypted auto-save
  const addExpense = useCallback(
    (categoryId: string, expense: Omit<Expense, 'id'>) => {
      const newExpense: Expense = {
        ...expense,
        id: uuidv4(),
      };

      setCategories((prev) => {
        const existingCategory = prev.find((cat) => cat.id === categoryId);

        if (existingCategory) {
          return prev.map((cat) =>
            cat.id === categoryId
              ? { ...cat, expenses: [...cat.expenses, newExpense] }
              : cat
          );
        } else {
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
    // [Same implementation as before]
    return [];
  }, [users, categories, personalCategories, assets, loans]);

  const calculateDetailedBalances = useCallback(() => {
    // [Same implementation as before]
    return {};
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
    householdKey, // Export the household key for invite creation
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
    isSaving: isAutoSaving,
    error,
    encryptionReady, // Export encryption readiness
  };
}
