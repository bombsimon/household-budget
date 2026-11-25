import { useState } from 'react';
import {
  Home,
  Users,
  Receipt,
  Landmark,
  Car,
  ArrowRightLeft,
  MoreHorizontal,
  LogOut,
} from 'lucide-react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useManualFirebaseBudgetData } from '../hooks/useManualFirebaseBudgetData';
import { encryptionService } from '../services/encryptionService';
import { Dashboard } from './Dashboard';
import { UserManagement } from './UserManagement';
import { ExpenseManager } from './ExpenseManager';
import { UserBudgetPage } from './IndividualBudget';
import { LoanTracker } from './LoanTracker';
import { formatMoney } from '../utils/expenseCalculations';
import { Avatar } from './Avatar';
import { AssetManager } from './AssetManager';
import { SettlementVisualizer } from './SettlementVisualizer';

interface HouseholdAppProps {
  householdId: string;
}

export function HouseholdApp({ householdId }: HouseholdAppProps) {
  const { '*': view = '' } = useParams();
  const activeTab = view.replace(/\/$/, '');
  const householdPath = `/${householdId}`;
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);

  const handleLeaveHousehold = () => {
    encryptionService.clearHouseholdPassword(householdId);
    navigate('/');
  };

  const {
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
    isLoaded,
    error,
  } = useManualFirebaseBudgetData(householdId);

  const settlements = calculateSettlements();
  const detailedBalances = calculateDetailedBalances();
  const budgetSummary = calculateBudgetSummary();
  const userBreakdowns = calculateUserBreakdowns();

  const trackOrThrow =
    <Args extends unknown[], Result>(
      save: (...args: Args) => Promise<Result>
    ) =>
    async (...args: Args): Promise<Result> => {
      setPendingSaves((count) => count + 1);

      try {
        return await save(...args);
      } catch (saveError) {
        setSaveFailed(true);
        throw saveError;
      } finally {
        setPendingSaves((count) => count - 1);
      }
    };

  const track =
    <Args extends unknown[], Result>(
      save: (...args: Args) => Promise<Result>
    ) =>
    (...args: Args): void => {
      trackOrThrow(save)(...args).catch((saveError) => {
        console.error('Failed to save:', saveError);
      });
    };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        {error ? (
          <div role="alert" className="max-w-md">
            <h1 className="page-title">Could not load this household</h1>
            <p className="my-3 text-slate-700">
              Check your connection and try again. ({error})
            </p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : (
          <p role="status" className="text-slate-700">
            Loading your budget…
          </p>
        )}
      </div>
    );
  }

  const allTabs = [
    { path: '', name: 'Overview', icon: Home },
    { path: 'expenses', name: 'Expenses', icon: Receipt },
    { path: 'users', name: 'People', icon: Users },
    { path: 'settlements', name: 'Settlements', icon: ArrowRightLeft },
    { path: 'loans', name: 'Loans', icon: Landmark },
    { path: 'assets', name: 'Assets', icon: Car },
  ];
  const tabs = allTabs.filter(
    (tab) => tab.path !== 'settlements' || users.length > 1
  );
  const phoneTabs = tabs.slice(0, 4);
  const moreTabs = tabs.slice(4);
  const isMoreActive = moreTabs.some((tab) => tab.path === activeTab);

  const renderContent = () => {
    switch (activeTab.startsWith('users/') ? 'person' : activeTab) {
      case '':
        return (
          <Dashboard
            householdPath={householdPath}
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
          <div className="space-y-5">
            <UserManagement
              householdPath={householdPath}
              categories={categories}
              loans={loans}
              users={users}
              onAddUser={trackOrThrow(addUser)}
              onUpdateUser={track(updateUser)}
              onDeleteUser={trackOrThrow(deleteUser)}
            />
            <div className="panel p-6">
              <h3 className="section-title mb-3">Invite someone</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="share-household-id" className="field-label">
                    Household ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="share-household-id"
                      type="text"
                      value={householdId}
                      readOnly
                      className="field min-w-0 flex-1 font-mono text-sm"
                    />
                    <CopyButton value={householdId} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-700">
                    Give them the Household ID and the household password. They
                    enter both at{' '}
                    <span className="font-mono">
                      {window.location.origin}
                      {import.meta.env.BASE_URL}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'expenses':
        return (
          <ExpenseManager
            users={users}
            categories={categories}
            personalCategories={personalCategories}
            onAddExpense={track(addExpense)}
            onUpdateExpense={track(updateExpense)}
            onDeleteExpense={track(deleteExpense)}
            onAddPersonalCategory={trackOrThrow(addPersonalCategory)}
          />
        );
      case 'loans':
        return (
          <LoanTracker
            users={users}
            loans={loans}
            onAddLoan={track(addLoan)}
            onUpdateLoan={track(updateLoan)}
            onUpdateLoans={track(updateLoans)}
            onDeleteLoan={track(deleteLoan)}
          />
        );
      case 'assets':
        return (
          <AssetManager
            users={users}
            assets={assets}
            onAddAsset={track(addAsset)}
            onUpdateAsset={track(updateAsset)}
            onDeleteAsset={track(deleteAsset)}
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
      case 'person': {
        const userId = activeTab.replace('users/', '');
        const user = users.find((u) => u.id === userId);
        const breakdown = userBreakdowns.find((b) => b.userId === userId);
        if (user && breakdown) {
          return (
            <UserBudgetPage
              user={user}
              breakdown={breakdown}
              users={users}
              categories={categories}
              personalCategories={personalCategories}
              assets={assets}
              loans={loans}
              onAddExpense={track(addExpense)}
              onUpdateExpense={track(updateExpense)}
              onDeleteExpense={track(deleteExpense)}
              onAddPersonalCategory={trackOrThrow(addPersonalCategory)}
            />
          );
        }
        return <NotFound householdPath={householdPath} />;
      }
      default:
        return <NotFound householdPath={householdPath} />;
    }
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-6 lg:flex">
        <p className="px-3 text-lg font-bold tracking-tight">
          Household Budget
        </p>
        <p className="truncate px-3 text-sm text-slate-600">{householdId}</p>
        <nav aria-label="Main" className="mt-6 flex-1">
          {tabs.map(({ path, name, icon: Icon }) => (
            <div key={path}>
              <NavLink
                to={path ? `${householdPath}/${path}` : householdPath}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 mt-1 rounded-lg px-3 py-2.5 text-sm ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {name}
              </NavLink>
              {path === 'users' &&
                users.map((user) => (
                  <NavLink
                    key={user.id}
                    to={`${householdPath}/users/${user.id}`}
                    className={({ isActive }) =>
                      `ml-4 mt-0.5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                        isActive
                          ? 'bg-blue-50 font-semibold text-blue-800'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Avatar user={user} size="small" />
                    <span className="truncate">{user.name.split(' ')[0]}</span>
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        {users.length > 0 && (
          <dl className="mb-3 border-t border-slate-200 px-3 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Income</dt>
              <dd className="money">
                {formatMoney(budgetSummary.totalIncome)} kr
              </dd>
            </div>
            <div className="mt-1 flex justify-between">
              <dt className="text-slate-600">Left</dt>
              <dd className="money font-semibold">
                {users.every((user) => user.municipalityCode)
                  ? `${formatMoney(budgetSummary.remainingIncome)} kr`
                  : '–'}
              </dd>
            </div>
          </dl>
        )}
        <button
          onClick={handleLeaveHousehold}
          className="btn justify-start px-3 text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {(saveFailed || error) && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-300 text-sm"
            >
              <p>
                {saveFailed
                  ? 'Your last change was not saved and will disappear on reload. Check your connection, then make it again.'
                  : `Updates have stopped arriving. ${error}`}
              </p>
              <button
                className="btn-secondary"
                onClick={() => window.location.reload()}
              >
                Reload saved data
              </button>
            </div>
          )}
          {pendingSaves > 0 && (
            <p
              role="status"
              className="fixed right-4 top-4 z-20 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
            >
              Saving…
            </p>
          )}
          {renderContent()}
        </div>
      </main>

      {isMoreOpen && (
        <div
          id="more-menu"
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-slate-300 bg-white p-3 lg:hidden"
        >
          {moreTabs.map(({ path, name, icon: Icon }) => (
            <NavLink
              key={path}
              to={path ? `${householdPath}/${path}` : householdPath}
              onClick={() => setIsMoreOpen(false)}
              className="flex min-h-12 items-center gap-3 px-3"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {name}
            </NavLink>
          ))}
          <p className="truncate border-t border-slate-200 px-3 pt-3 text-sm text-slate-600">
            {householdId}
          </p>
          <button
            onClick={handleLeaveHousehold}
            className="flex min-h-12 w-full items-center gap-3 px-3"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}

      <nav
        aria-label="Main"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsMoreOpen(false);
        }}
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {phoneTabs.map(({ path, name, icon: Icon }) => (
          <NavLink
            key={path}
            to={path ? `${householdPath}/${path}` : householdPath}
            end={path === ''}
            onClick={() => setIsMoreOpen(false)}
            className={({ isActive }) =>
              `flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-4 text-xs ${
                isActive
                  ? 'border-blue-700 font-semibold text-blue-800'
                  : 'border-transparent text-slate-700'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="max-w-full truncate">{name}</span>
          </NavLink>
        ))}
        <button
          aria-expanded={isMoreOpen}
          aria-controls="more-menu"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-4 text-xs ${
            isMoreActive
              ? 'border-blue-700 font-semibold text-blue-800'
              : 'border-transparent text-slate-700'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}

function NotFound({ householdPath }: { householdPath: string }) {
  return (
    <div>
      <h1 className="page-title">This page does not exist</h1>
      <Link to={householdPath} className="text-blue-800 underline">
        Go to the overview
      </Link>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState('Copy');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
  };

  return (
    <button type="button" className="btn-secondary" onClick={handleCopy}>
      {status}
    </button>
  );
}
