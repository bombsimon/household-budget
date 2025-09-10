import { useState } from 'react';
import {
  Home,
  Users,
  Receipt,
  Calculator,
  Car,
  ArrowRightLeft,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useManualFirebaseBudgetData } from '../hooks/useManualFirebaseBudgetData';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { UserManagement } from './UserManagement';
import { ExpenseManager } from './ExpenseManager';
import { IndividualBudget } from './IndividualBudget';
import { LoanTracker } from './LoanTracker';
import { AssetManager } from './AssetManager';
import { SettlementVisualizer } from './SettlementVisualizer';
import { ApplicationManager } from './ApplicationManager';
import { formatMoney } from '../utils/expenseCalculations';

type TabType =
  | 'dashboard'
  | 'users'
  | 'expenses'
  | 'individual'
  | 'loans'
  | 'assets'
  | 'settlements';

interface HouseholdAppProps {
  householdId: string;
}

export function HouseholdApp({ householdId }: HouseholdAppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const {
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
    isLoaded,
    isSaving, // Now represents auto-sync status
    error,
  } = useManualFirebaseBudgetData(householdId);

  const settlements = calculateSettlements();
  const detailedBalances = calculateDetailedBalances();
  const budgetSummary = calculateBudgetSummary();
  const userBreakdowns = calculateUserBreakdowns();

  // Show loading state while data is being loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your budget data...</p>
        </div>
      </div>
    );
  }

  const allTabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'expenses', name: 'Expenses', icon: Receipt },
    { id: 'individual', name: 'Individual', icon: BarChart3 },
    { id: 'loans', name: 'Loans', icon: Calculator },
    { id: 'assets', name: 'Assets', icon: Car },
    { id: 'settlements', name: 'Settlements', icon: ArrowRightLeft },
  ] as const;

  // Hide settlements tab if there's only one user
  const tabs = allTabs.filter(
    (tab) => tab.id !== 'settlements' || users.length > 1
  );

  // Switch away from settlements if we're on it and there's only one user
  if (activeTab === 'settlements' && users.length <= 1) {
    setActiveTab('dashboard');
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            users={users}
            budgetSummary={budgetSummary}
            userBreakdowns={userBreakdowns}
            categories={categories}
            assets={assets}
            loans={loans}
            settlements={settlements}
          />
        );
      case 'users':
        return (
          <div className="space-y-6">
            <UserManagement
              users={users}
              onUpdateUser={updateUser}
              onDeleteUser={deleteUser}
            />
            <ApplicationManager
              householdId={householdId}
              isOwner={users.find((u) => u.id === user?.uid)?.role === 'owner'}
            />
          </div>
        );
      case 'expenses':
        return (
          <ExpenseManager
            users={users}
            categories={categories}
            personalCategories={personalCategories}
            personalCategoriesSectionCollapsed={
              personalCategoriesSectionCollapsed
            }
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
            onToggleCategoryCollapse={toggleCategoryCollapse}
            onAddPersonalCategory={addPersonalCategory}
            onUpdatePersonalCategory={updatePersonalCategory}
            onDeletePersonalCategory={deletePersonalCategory}
            onTogglePersonalCategoryCollapse={togglePersonalCategoryCollapse}
            onTogglePersonalCategoriesSectionCollapse={
              togglePersonalCategoriesSectionCollapse
            }
          />
        );
      case 'individual':
        return (
          <IndividualBudget
            users={users}
            breakdowns={userBreakdowns}
            categories={categories}
            personalCategories={personalCategories}
            assets={assets}
            loans={loans}
          />
        );
      case 'loans':
        return (
          <LoanTracker
            users={users}
            loans={loans}
            onAddLoan={addLoan}
            onUpdateLoan={updateLoan}
            onDeleteLoan={deleteLoan}
          />
        );
      case 'assets':
        return (
          <AssetManager
            users={users}
            assets={assets}
            onAddAsset={addAsset}
            onUpdateAsset={updateAsset}
            onDeleteAsset={deleteAsset}
          />
        );
      case 'settlements':
        return (
          <SettlementVisualizer
            users={users}
            settlements={settlements}
            detailedBalances={detailedBalances}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-y-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header - Fixed at top */}
          <div className="flex items-center justify-between min-h-16 px-4 border-b border-gray-200 flex-shrink-0 py-3">
            <div className="min-w-0 flex-1 pr-2">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Household Budget
              </h1>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {householdId}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 mt-6 overflow-y-auto">
            <div className="px-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-3 py-2 mt-1 text-sm font-medium rounded-md transition-colors duration-150
                      ${
                        isActive
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}

              {/* Auto-sync Status */}
              {isSaving && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                    Syncing to Firebase...
                  </div>
                </div>
              )}
              {error && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 px-3">
                    Sync error: {error}
                  </p>
                </div>
              )}
            </div>
          </nav>

          {/* Quick stats in sidebar - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className="text-xs text-gray-500 space-y-1 mb-4">
              <div className="flex justify-between">
                <span>Users:</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Income:</span>
                <span className="font-medium">
                  {formatMoney(budgetSummary.totalIncome)} kr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span
                  className={`font-medium ${budgetSummary.remainingIncome > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatMoney(budgetSummary.remainingIncome)} kr
                </span>
              </div>
            </div>

            {/* User info and sign out */}
            <div className="text-xs text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                {user?.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="truncate">
                  {user?.displayName || user?.email}
                </span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 overflow-x-hidden h-screen">
        {/* Mobile header - only show on mobile */}
        <div className="lg:hidden flex items-center justify-between h-16 px-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 truncate px-2">
            {tabs.find((tab) => tab.id === activeTab)?.name}
          </h1>
          <div className="w-9" />
        </div>

        {/* Page content */}
        <main className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
          <div className="max-w-full">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}

// No default export - using named export HouseholdApp
