import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Car,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Asset, Expense, User } from '../types';
import { formatMoney, getMonthlyAmount } from '../utils/expenseCalculations';
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
      {/* Add Asset Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <AssetForm
            onSubmit={(assetData) => {
              onAddAsset(assetData);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Add Asset Button */}
      {!isAdding && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
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
            <div key={asset.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Asset Header - same pattern as category header */}
                  <button
                    onClick={() => toggleAssetExpansion(asset.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {!isExpanded ? (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Car className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                        <h2 className="text-base font-semibold text-gray-900 leading-tight truncate">
                          {asset.name}
                        </h2>
                        <span className="text-sm text-gray-500 flex-shrink-0">
                          ({migratedAsset.expenses.length})
                        </span>
                      </div>
                      {totalExpenses > 0 && (
                        <div className="text-sm font-medium mt-1 sm:mt-0">
                          <span className="text-gray-700">
                            {formatMoney(fixedExpenses)} kr/month
                          </span>
                          {budgetedExpenses > 0 && (
                            <>
                              <span className="text-gray-400"> + </span>
                              <span className="text-orange-600">
                                {formatMoney(budgetedExpenses)} kr budgeted
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Desktop: Action buttons */}
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => setAddingExpenseToAsset(asset.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={() => setEditingAsset(asset.id)}
                      className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors flex-shrink-0"
                      title="Edit asset"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteAsset(asset.id)}
                      className="flex items-center gap-1 px-3 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile: Action buttons */}
                {!isExpanded && (
                  <div className="sm:hidden mt-2 flex gap-2">
                    <button
                      onClick={() => setAddingExpenseToAsset(asset.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Expense
                    </button>
                    <button
                      onClick={() => setEditingAsset(asset.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteAsset(asset.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-red-500 bg-red-50 hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Asset Content */}
              {isExpanded && (
                <div className="p-4">
                  {/* Edit Asset Form */}
                  {editingAsset === asset.id && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    <div className="space-y-2">
                      {migratedAsset.expenses.map((expense) => (
                        <ExpenseItem
                          key={expense.id}
                          expense={expense}
                          users={users}
                          personalCategories={[]}
                          isEditing={editingExpense === expense.id}
                          isSharedCategory={false}
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
                    <div className="text-center py-8 text-gray-500">
                      <Car className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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

      {/* Empty State */}
      {assets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Car className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No assets yet
          </h3>
          <p className="mb-4">Add your first asset to start tracking costs.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {initialData ? 'Edit Asset' : 'Add Asset'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asset Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., My Car, House, etc."
          required
        />
      </div>

      <FormActionButtons
        onCancel={onCancel}
        submitType="submit"
        submitLabel={initialData ? 'Update Asset' : 'Add Asset'}
      />
    </form>
  );
}
