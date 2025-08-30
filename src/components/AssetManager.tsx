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
import { FormActionButtons } from './FormActionButtons';
import { SplitMethodSelector } from './SplitMethodSelector';
import { SplitInfoBox } from './SplitInfoBox';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const addExpenseToAsset = (
    assetId: string,
    expense: Omit<Expense, 'id'>,
    type: 'fixed' | 'variable'
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const newExpense: Expense = {
      ...expense,
      id: `${assetId}-${type}-${Date.now()}`,
      isVariable: type === 'variable',
    };

    const updatedAsset: Partial<Asset> = {
      [type === 'fixed' ? 'fixedCosts' : 'variableCosts']: [
        ...(type === 'fixed' ? asset.fixedCosts : asset.variableCosts),
        newExpense,
      ],
    };

    onUpdateAsset(assetId, updatedAsset);
  };

  const updateAssetExpense = (
    assetId: string,
    expenseId: string,
    updates: Partial<Expense>
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const updatedFixedCosts = asset.fixedCosts.map((exp) =>
      exp.id === expenseId ? { ...exp, ...updates } : exp
    );
    const updatedVariableCosts = asset.variableCosts.map((exp) =>
      exp.id === expenseId ? { ...exp, ...updates } : exp
    );

    onUpdateAsset(assetId, {
      fixedCosts: updatedFixedCosts,
      variableCosts: updatedVariableCosts,
    });
  };

  const deleteAssetExpense = (assetId: string, expenseId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    const updatedFixedCosts = asset.fixedCosts.filter(
      (exp) => exp.id !== expenseId
    );
    const updatedVariableCosts = asset.variableCosts.filter(
      (exp) => exp.id !== expenseId
    );

    onUpdateAsset(assetId, {
      fixedCosts: updatedFixedCosts,
      variableCosts: updatedVariableCosts,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Car className="w-5 h-5" />
          Assets & Household Costs
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {isAdding && (
        <AssetForm
          onSubmit={(asset) => {
            onAddAsset(asset);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className="space-y-4">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            users={users}
            isExpanded={expandedAssets.has(asset.id)}
            isEditing={editingId === asset.id}
            onToggleExpansion={() => toggleAssetExpansion(asset.id)}
            onStartEdit={() => setEditingId(asset.id)}
            onStopEdit={() => setEditingId(null)}
            onUpdate={(updates) => {
              onUpdateAsset(asset.id, updates);
              setEditingId(null);
            }}
            onDelete={() => onDeleteAsset(asset.id)}
            onAddExpense={addExpenseToAsset}
            onUpdateExpense={updateAssetExpense}
            onDeleteExpense={deleteAssetExpense}
          />
        ))}
      </div>

      {assets.length === 0 && !isAdding && (
        <div className="text-center py-12 text-gray-500">
          <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No assets added yet. Click "Add Asset" to get started.</p>
          <p className="text-sm mt-2">
            Assets can include cars, boats, or other household belongings with
            costs.
          </p>
        </div>
      )}
    </div>
  );
}

interface AssetFormProps {
  initialData?: Asset;
  onSubmit: (asset: Omit<Asset, 'id'>) => void;
  onCancel: () => void;
}

function AssetForm({ initialData, onSubmit, onCancel }: AssetFormProps) {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      fixedCosts: initialData?.fixedCosts || [],
      variableCosts: initialData?.variableCosts || [],
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-300 rounded-lg p-6 bg-gray-50 mb-4"
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asset Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Family Car, Boat"
          required
        />
      </div>

      <FormActionButtons
        submitType="submit"
        submitLabel={`${initialData ? 'Update' : 'Add'} Asset`}
        onCancel={onCancel}
      />
    </form>
  );
}

interface AssetCardProps {
  asset: Asset;
  users: User[];
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpansion: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<Asset>) => void;
  onDelete: () => void;
  onAddExpense: (
    assetId: string,
    expense: Omit<Expense, 'id'>,
    type: 'fixed' | 'variable'
  ) => void;
  onUpdateExpense: (
    assetId: string,
    expenseId: string,
    updates: Partial<Expense>
  ) => void;
  onDeleteExpense: (assetId: string, expenseId: string) => void;
}

function AssetCard({
  asset,
  users,
  isExpanded,
  isEditing,
  onToggleExpansion,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: AssetCardProps) {
  const totalFixedCosts = asset.fixedCosts.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );
  const totalVariableCosts = asset.variableCosts.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  if (isEditing) {
    return (
      <AssetForm
        initialData={asset}
        onSubmit={onUpdate}
        onCancel={onStopEdit}
      />
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="p-4 bg-gray-50 flex items-center justify-between">
        <button
          onClick={onToggleExpansion}
          className="flex items-center gap-2 text-left flex-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <h3 className="font-medium text-gray-900">{asset.name}</h3>
          <span className="text-sm text-gray-500">
            (Fixed: {totalFixedCosts.toLocaleString()} kr, Variable:{' '}
            {totalVariableCosts.toLocaleString()} kr)
          </span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={onStartEdit}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseSection
              title="Fixed Costs"
              description="Regular monthly costs (insurance, registration, etc.)"
              expenses={asset.fixedCosts}
              users={users}
              onAddExpense={(expense) =>
                onAddExpense(asset.id, expense, 'fixed')
              }
              onUpdateExpense={(expenseId, updates) =>
                onUpdateExpense(asset.id, expenseId, updates)
              }
              onDeleteExpense={(expenseId) =>
                onDeleteExpense(asset.id, expenseId)
              }
              color="blue"
            />
            <ExpenseSection
              title="Variable Costs"
              description="Costs that vary month to month (fuel, maintenance, etc.)"
              expenses={asset.variableCosts}
              users={users}
              onAddExpense={(expense) =>
                onAddExpense(asset.id, expense, 'variable')
              }
              onUpdateExpense={(expenseId, updates) =>
                onUpdateExpense(asset.id, expenseId, updates)
              }
              onDeleteExpense={(expenseId) =>
                onDeleteExpense(asset.id, expenseId)
              }
              color="orange"
              allowVariable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ExpenseSectionProps {
  title: string;
  description: string;
  expenses: Expense[];
  users: User[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  color: 'blue' | 'orange';
  allowVariable?: boolean;
}

function ExpenseSection({
  title,
  description,
  expenses,
  users,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  color,
  allowVariable = false,
}: ExpenseSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-blue-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      button: 'bg-orange-600 hover:bg-orange-700',
      text: 'text-orange-600',
    },
  };

  const classes = colorClasses[color];
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-medium ${classes.text}`}>{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
          <p className="text-sm text-gray-600 mt-1">
            Total: {totalAmount.toLocaleString()} kr ({expenses.length}{' '}
            expenses)
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`flex items-center gap-1 px-3 py-1 text-sm text-white rounded ${classes.button} transition-colors`}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {expenses.map((expense) => (
          <AssetExpenseItem
            key={expense.id}
            expense={expense}
            users={users}
            isEditing={editingId === expense.id}
            onStartEdit={() => setEditingId(expense.id)}
            onStopEdit={() => setEditingId(null)}
            onUpdate={(updates) => {
              onUpdateExpense(expense.id, updates);
              setEditingId(null);
            }}
            onDelete={() => onDeleteExpense(expense.id)}
            allowVariable={allowVariable}
          />
        ))}

        {isAdding && (
          <AssetExpenseForm
            users={users}
            allowVariable={allowVariable}
            onSubmit={(expense) => {
              onAddExpense(expense);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

interface AssetExpenseItemProps {
  expense: Expense;
  users: User[];
  isEditing: boolean;
  allowVariable: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<Expense>) => void;
  onDelete: () => void;
}

function AssetExpenseItem({
  expense,
  users,
  isEditing,
  allowVariable,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
}: AssetExpenseItemProps) {
  const paidByUser = users.find((u) => u.id === expense.paidBy);

  if (isEditing) {
    return (
      <AssetExpenseForm
        users={users}
        allowVariable={allowVariable}
        initialData={expense}
        onSubmit={onUpdate}
        onCancel={onStopEdit}
      />
    );
  }

  const getSplitDescription = () => {
    if (expense.splitType === 'equal') {
      return `Split equally (${(expense.amount / users.length).toLocaleString()} kr each)`;
    } else if (expense.splitType === 'percentage' && expense.splitData) {
      return `Split by percentage (${Object.entries(expense.splitData)
        .map(([userId, percentage]) => {
          const user = users.find((u) => u.id === userId);
          return `${user?.name}: ${Math.round(percentage * 100)}%`;
        })
        .join(', ')})`;
    }
    return 'Fixed amount';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h5 className="font-medium text-gray-900">{expense.name}</h5>
          <span className="text-sm text-gray-500">
            {expense.amount.toLocaleString()} kr
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {users.length > 1 && (
            <div>Paid by: {paidByUser?.name || 'Unknown'}</div>
          )}
          {users.length > 1 && <div>{getSplitDescription()}</div>}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onStartEdit}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface AssetExpenseFormProps {
  users: User[];
  allowVariable: boolean;
  initialData?: Expense;
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

function AssetExpenseForm({
  users,
  allowVariable,
  initialData,
  onSubmit,
  onCancel,
}: AssetExpenseFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [splitType, setSplitType] = useState(initialData?.splitType || 'equal');
  const [paidBy, setPaidBy] = useState(
    initialData?.paidBy || users[0]?.id || ''
  );
  const [isVariable, setIsVariable] = useState(
    initialData?.isVariable || false
  );
  // Calculate income-based percentages
  const totalIncome = users.reduce((sum, user) => sum + user.monthlyIncome, 0);
  const incomeBasedSplit = users.reduce(
    (acc, user) => {
      acc[user.id] =
        totalIncome > 0 ? user.monthlyIncome / totalIncome : 1 / users.length;
      return acc;
    },
    {} as { [userId: string]: number }
  );

  const [splitData] = useState<{ [userId: string]: number }>(
    initialData?.splitData || incomeBasedSplit
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) return;

    let finalSplitData: { [userId: string]: number } | undefined;

    if (splitType === 'percentage') {
      const totalPercentage = Object.values(splitData).reduce(
        (sum, val) => sum + val,
        0
      );
      if (Math.abs(totalPercentage - 1) > 0.001) {
        alert('Percentages must add up to 100%');
        return;
      }
      finalSplitData = splitData;
    }

    onSubmit({
      name: name.trim(),
      amount: parseFloat(amount),
      isShared: true,
      splitType,
      splitData: finalSplitData,
      paidBy,
      isVariable: allowVariable ? isVariable : false,
    });
  };

  // Percentages are now automatically calculated based on income, no manual changes needed

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border border-gray-300 rounded-md bg-gray-50"
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Expense name"
            required
          />
        </div>
        <div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amount"
            required
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {users.length > 1 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  Paid by {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs">
              <SplitMethodSelector
                value={splitType as any}
                onChange={(value) => setSplitType(value)}
                showFixed={false}
              />
            </div>
          </div>
        </div>
      )}
      {allowVariable && (
        <div className="mb-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isVariable}
              onChange={(e) => setIsVariable(e.target.checked)}
              className="mr-1"
            />
            Variable
          </label>
        </div>
      )}

      {splitType === 'percentage' && users.length > 1 && (
        <div className="mb-3">
          <SplitInfoBox users={users} splitData={splitData} />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {initialData ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
