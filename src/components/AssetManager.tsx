import React, { useId, useState } from 'react';
import { Plus, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Asset, Expense, User } from '../types';
import { formatMoney, getMonthlyAmount } from '../utils/expenseCalculations';
import { DeleteButton } from './DeleteButton';
import { FormActionButtons } from './FormActionButtons';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';

// Helper function to migrate legacy asset data structure
const migrateAssetData = (asset: Asset): Asset => {
  if (
    !asset.expenses &&
    ((asset as any).fixedCosts || (asset as any).variableCosts)
  ) {
    return {
      ...asset,
      expenses: [
        ...((asset as any).fixedCosts || []).map((exp: any) => ({
          ...exp,
          isBudgeted: false,
        })),
        ...((asset as any).variableCosts || []).map((exp: any) => ({
          ...exp,
          isBudgeted: true,
        })),
      ],
    };
  }
  return {
    ...asset,
    expenses: asset.expenses || [],
  };
};

interface AssetManagerProps {
  users: User[];
  assets: Asset[];
  onAddAsset: (asset: Omit<Asset, 'id'>) => void;
  onUpdateAsset: (assetId: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (assetId: string) => void;
}

export function AssetManager({
  users,
  assets,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}: AssetManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [addingExpenseToAsset, setAddingExpenseToAsset] = useState<
    string | null
  >(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(
    new Set(assets.map((a) => a.id))
  );

  const toggleAssetExpansion = (assetId: string) => {
    setExpandedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleAddExpense = (assetId: string, expense: Omit<Expense, 'id'>) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const migratedAsset = migrateAssetData(asset);
    const newExpense = {
      ...expense,
      id: crypto.randomUUID(),
    };

    onUpdateAsset(assetId, {
      expenses: [...migratedAsset.expenses, newExpense],
    });
    setAddingExpenseToAsset(null);
  };

  const handleUpdateExpense = (
    assetId: string,
    expenseId: string,
    updates: Partial<Expense>
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const migratedAsset = migrateAssetData(asset);
    const updatedExpenses = migratedAsset.expenses.map((exp) =>
      exp.id === expenseId ? { ...exp, ...updates } : exp
    );

    onUpdateAsset(assetId, { expenses: updatedExpenses });
  };

  const handleDeleteExpense = (assetId: string, expenseId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const migratedAsset = migrateAssetData(asset);
    const updatedExpenses = migratedAsset.expenses.filter(
      (exp) => exp.id !== expenseId
    );

    onUpdateAsset(assetId, { expenses: updatedExpenses });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Assets</h1>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add asset
          </button>
        )}
      </div>

      {/* Add Asset Form */}
      {isAdding && (
        <div>
          <AssetForm
            onSubmit={(assetData) => {
              onAddAsset(assetData);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Assets List - using same structure as ExpenseManager */}
      <div className="space-y-6">
        {assets.map((asset) => {
          const migratedAsset = migrateAssetData(asset);
          const fixedExpenses = migratedAsset.expenses
            .filter((expense) => !expense.isBudgeted)
            .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
          const budgetedExpenses = migratedAsset.expenses
            .filter((expense) => expense.isBudgeted)
            .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
          const totalExpenses = fixedExpenses + budgetedExpenses;
          const isExpanded = expandedAssets.has(asset.id);

          return (
            <div key={asset.id} className="panel overflow-hidden">
              <div className="bg-slate-50 px-5 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Asset Header - same pattern as category header */}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleAssetExpansion(asset.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {!isExpanded ? (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className="section-title truncate">{asset.name}</h2>
                        <span className="text-sm text-slate-600 flex-shrink-0">
                          ({migratedAsset.expenses.length})
                        </span>
                      </div>
                      {totalExpenses > 0 && (
                        <div className="text-sm font-medium mt-1 sm:mt-0">
                          <span className="text-slate-700">
                            {formatMoney(fixedExpenses)} kr/month
                          </span>
                          {budgetedExpenses > 0 && (
                            <>
                              <span className="text-slate-600"> + </span>
                              <span className="text-slate-600">
                                {formatMoney(budgetedExpenses)} kr budgeted
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingExpenseToAsset(asset.id);
                        setExpandedAssets((prev) =>
                          new Set(prev).add(asset.id)
                        );
                      }}
                      className="btn-secondary"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add cost
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAsset(asset.id);
                        setExpandedAssets((prev) =>
                          new Set(prev).add(asset.id)
                        );
                      }}
                      className="icon-btn"
                      aria-label={`Edit ${asset.name}`}
                      title={`Edit ${asset.name}`}
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <DeleteButton
                      name={asset.name}
                      description={`Its ${migratedAsset.expenses.length} costs are deleted too. This cannot be undone.`}
                      onDelete={() => onDeleteAsset(asset.id)}
                    />
                  </div>
                </div>
              </div>

              {/* Asset Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 px-5 py-3">
                  {/* Edit Asset Form */}
                  {editingAsset === asset.id && (
                    <div className="mb-4">
                      <AssetForm
                        initialData={asset}
                        onSubmit={(updates) => {
                          onUpdateAsset(asset.id, updates);
                          setEditingAsset(null);
                        }}
                        onCancel={() => setEditingAsset(null)}
                      />
                    </div>
                  )}

                  {/* Add Expense Form */}
                  {addingExpenseToAsset === asset.id && (
                    <div className="mb-4">
                      <ExpenseForm
                        users={users}
                        personalCategories={[]}
                        isSharedCategory={false}
                        category={null}
                        onSubmit={(expenseData) =>
                          handleAddExpense(asset.id, expenseData)
                        }
                        onCancel={() => setAddingExpenseToAsset(null)}
                        showCategorySelector={false}
                        isAssetExpense={true}
                      />
                    </div>
                  )}

                  {/* Expenses List - using ExpenseItem component */}
                  {migratedAsset.expenses.length > 0 && (
                    <div className="divide-y divide-slate-200">
                      {migratedAsset.expenses.map((expense) => (
                        <ExpenseItem
                          key={expense.id}
                          expense={expense}
                          users={users}
                          isEditing={editingExpense === expense.id}
                          onUpdate={(updates) =>
                            handleUpdateExpense(asset.id, expense.id, updates)
                          }
                          onDelete={() =>
                            handleDeleteExpense(asset.id, expense.id)
                          }
                          onStartEdit={() => setEditingExpense(expense.id)}
                          onStopEdit={() => setEditingExpense(null)}
                          renderEditForm={(expense, onSubmit, onCancel) => (
                            <ExpenseForm
                              users={users}
                              personalCategories={[]}
                              isSharedCategory={false}
                              category={null}
                              initialData={expense}
                              onSubmit={onSubmit}
                              onCancel={onCancel}
                              showCategorySelector={false}
                              isAssetExpense={true}
                            />
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {migratedAsset.expenses.length === 0 && (
                    <div className="py-4 text-slate-700">
                      <p>No expenses added for this asset yet.</p>
                      <button
                        onClick={() => setAddingExpenseToAsset(asset.id)}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                      >
                        Add your first expense
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {assets.length === 0 && !isAdding && (
        <p className="panel p-8 text-slate-700">
          No assets yet. Add a car, boat or house to track what it costs.
        </p>
      )}
    </div>
  );
}

// Asset Form Component - simplified version
interface AssetFormProps {
  initialData?: Asset;
  onSubmit: (assetData: Omit<Asset, 'id'>) => void;
  onCancel: () => void;
}

function AssetForm({ initialData, onSubmit, onCancel }: AssetFormProps) {
  const fieldId = useId();
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assetData: Omit<Asset, 'id'> = {
      name: name.trim(),
      expenses: initialData ? migrateAssetData(initialData).expenses : [],
    };

    onSubmit(assetData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-panel space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {initialData ? 'Edit Asset' : 'Add Asset'}
      </h3>

      <div>
        <label htmlFor={`${fieldId}-1`} className="field-label">
          Asset name
        </label>
        <input
          id={`${fieldId}-1`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          placeholder="e.g., My Car, House, etc."
          required
        />
      </div>

      <FormActionButtons
        onCancel={onCancel}
        submitType="submit"
        submitLabel={initialData ? 'Save asset' : 'Add asset'}
      />
    </form>
  );
}
