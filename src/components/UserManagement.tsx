import React, { useState } from 'react';
import { Edit2, User as UserIcon, DollarSign, Trash2 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { User } from '../types';
import { formatMoney } from '../utils/expenseCalculations';
import {
  calculateMonthlyAfterTaxIncome,
  getDefaultMunicipalTaxRate,
  formatTaxRate,
} from '../utils/swedishTaxCalculation';

interface UserManagementProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser?: (userId: string) => Promise<void>;
}

export function UserManagement({
  users,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpdateUser = (
    userId: string,
    name: string,
    income: string,
    taxRate: string
  ) => {
    if (name.trim() && income.trim()) {
      onUpdateUser(userId, {
        name: name.trim(),
        monthlyIncome: parseFloat(income),
        municipalTaxRate: parseFloat(taxRate) / 100,
      });
      setEditingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!onDeleteUser) return;

    if (
      !confirm(
        `Are you sure you want to remove ${userName} from the household? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(userId);
    try {
      await onDeleteUser(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to remove user. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Household Members & Income
          </h2>
        </div>
      </div>

      {/* Household Income Summary */}
      {users.length > 0 &&
        (() => {
          const totalIncome = users.reduce(
            (sum, user) => sum + user.monthlyIncome,
            0
          );
          const totalAfterTax = users.reduce(
            (sum, user) =>
              sum +
              calculateMonthlyAfterTaxIncome(
                user.monthlyIncome * 12,
                user.municipalTaxRate
              ),
            0
          );

          const chartData = users.map((user) => ({
            name: user.name,
            value: user.monthlyIncome,
            percentage:
              totalIncome > 0
                ? ((user.monthlyIncome / totalIncome) * 100).toFixed(1)
                : '0',
            color: user.color,
          }));

          return (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Household Income Overview
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Stats */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Monthly Income
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatMoney(totalIncome)} kr
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">
                      After Tax (Swedish Calculation)
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatMoney(totalAfterTax)} kr
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-2">
                      Income Distribution
                    </div>
                    <div className="space-y-2">
                      {users.map((user) => {
                        const percentage =
                          totalIncome > 0
                            ? (
                                (user.monthlyIncome / totalIncome) *
                                100
                              ).toFixed(1)
                            : '0';
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: user.color }}
                              />
                              <span className="text-sm font-medium">
                                {user.name}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-700 mb-4 text-center">
                    Income Distribution
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          label={({ percentage }) => `${percentage}%`}
                          labelLine={false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${formatMoney(value)} kr`,
                            name,
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
          >
            {editingId === user.id ? (
              <EditUserForm
                user={user}
                onSave={handleUpdateUser}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                        {user.role === 'owner' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                            Owner
                          </span>
                        )}
                      </div>
                      {user.email && (
                        <p className="text-xs text-gray-400 truncate mb-1">{user.email}</p>
                      )}
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <p>Monthly Income: {formatMoney(user.monthlyIncome)} kr</p>
                        <p>
                          After Tax ({formatTaxRate(user.municipalTaxRate || getDefaultMunicipalTaxRate())} municipal): {formatMoney(calculateMonthlyAfterTaxIncome(user.monthlyIncome * 12, user.municipalTaxRate))} kr
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile: buttons on separate row */}
                  <div className="flex gap-2 sm:flex-shrink-0 justify-end sm:justify-start">
                    <button
                      onClick={() => setEditingId(user.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit income and tax rate"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.role !== 'owner' && onDeleteUser && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingId === user.id}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Remove from household"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface EditUserFormProps {
  user: User;
  onSave: (
    userId: string,
    name: string,
    income: string,
    taxRate: string
  ) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onSave, onCancel }: EditUserFormProps) {
  const [name, setName] = useState(user.name);
  const [income, setIncome] = useState(user.monthlyIncome.toString());
  const [taxRate, setTaxRate] = useState(
    ((user.municipalTaxRate || getDefaultMunicipalTaxRate()) * 100).toString()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, name, income, taxRate);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="User name"
            required
          />
        </div>
        <div>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Monthly income"
            required
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tax rate (%)"
            required
            min="0"
            max="60"
            step="0.1"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
