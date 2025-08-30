import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  User as UserIcon,
  DollarSign,
} from 'lucide-react';
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
  onAddUser: (name: string, income: number, municipalTaxRate?: number) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserManagement({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserIncome, setNewUserIncome] = useState('');
  const [newUserTaxRate, setNewUserTaxRate] = useState(
    (getDefaultMunicipalTaxRate() * 100).toString()
  );

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim() && newUserIncome.trim()) {
      onAddUser(
        newUserName.trim(),
        parseFloat(newUserIncome),
        parseFloat(newUserTaxRate) / 100
      );
      setNewUserName('');
      setNewUserIncome('');
      setNewUserTaxRate((getDefaultMunicipalTaxRate() * 100).toString());
      setIsAdding(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Users & Income
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
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
            percentage: ((user.monthlyIncome / totalIncome) * 100).toFixed(1),
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
                        const percentage = (
                          (user.monthlyIncome / totalIncome) *
                          100
                        ).toFixed(1);
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
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">
                      Monthly Income: {formatMoney(user.monthlyIncome)} kr
                    </p>
                    <p className="text-sm text-gray-500">
                      After Tax (
                      {formatTaxRate(
                        user.municipalTaxRate || getDefaultMunicipalTaxRate()
                      )}{' '}
                      municipal):{' '}
                      {formatMoney(
                        calculateMonthlyAfterTaxIncome(
                          user.monthlyIncome * 12,
                          user.municipalTaxRate
                        )
                      )}{' '}
                      kr
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(user.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {users.length > 1 && (
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {isAdding && (
          <form
            onSubmit={handleAddUser}
            className="p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Income (kr)
                </label>
                <input
                  type="number"
                  value={newUserIncome}
                  onChange={(e) => setNewUserIncome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter monthly income"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Municipal Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={newUserTaxRate}
                  onChange={(e) => setNewUserTaxRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="32.0"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewUserName('');
                  setNewUserIncome('');
                  setNewUserTaxRate(
                    (getDefaultMunicipalTaxRate() * 100).toString()
                  );
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
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
