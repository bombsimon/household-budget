import React, { useId, useState } from 'react';
import { Edit2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExpenseCategory, Loan, User } from '../types';
import { MunicipalitySelector } from './MunicipalitySelector';
import { UserTaxInfo } from './UserTaxInfo';
import { formatMoney } from '../utils/expenseCalculations';
import { Avatar } from './Avatar';
import { SegmentedBar, CostLegend } from './CostCharts';
import { DeleteButton } from './DeleteButton';

const USER_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

const USER_COLOR_NAMES: Record<string, string> = {
  '#EF4444': 'Red',
  '#F59E0B': 'Amber',
  '#10B981': 'Green',
  '#3B82F6': 'Blue',
  '#8B5CF6': 'Purple',
  '#EC4899': 'Pink',
};

function ColorPicker({
  selectedColor,
  onColorChange,
  usedColors = [],
}: {
  selectedColor: string;
  onColorChange: (color: string) => void;
  usedColors?: string[];
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {USER_COLORS.map((color) => {
        const isUsed = usedColors.includes(color);
        const isSelected = selectedColor === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={`w-8 h-8 rounded-full border-2  ${
              isSelected
                ? 'border-ink scale-110'
                : 'border-line-strong hover:border-field-line'
            } ${isUsed && !isSelected ? 'opacity-50' : ''}`}
            style={{ backgroundColor: color }}
            aria-pressed={isSelected}
            aria-label={`${USER_COLOR_NAMES[color]}${isUsed && !isSelected ? ', already in use' : ''}`}
          >
            {isSelected && (
              <div className="w-full h-full rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
const countOf = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

interface UserManagementProps {
  householdPath: string;
  categories: ExpenseCategory[];
  loans: Loan[];
  users: User[];
  onAddUser?: (userData: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser?: (userId: string) => Promise<void>;
}

export function UserManagement({
  householdPath,
  categories,
  loans,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const fieldId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserIncome, setNewUserIncome] = useState('');
  const [newUserMunicipalityCode, setNewUserMunicipalityCode] = useState('');
  const [newUserMunicipalityName, setNewUserMunicipalityName] = useState('');

  const [newUserColor, setNewUserColor] = useState(USER_COLORS[0]);

  const handleUpdateUser = (
    userId: string,
    name: string,
    income: string,
    municipalityCode: string,
    municipalityName: string,
    color: string
  ) => {
    if (name.trim() && income.trim()) {
      onUpdateUser(userId, {
        name: name.trim(),
        monthlyIncome: parseFloat(income),
        municipalityCode: municipalityCode || undefined,
        municipalityName: municipalityName || undefined,
        color,
      });
      setEditingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!onDeleteUser) return;

    setDeletingId(userId);
    try {
      await onDeleteUser(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const totalIncome = users.reduce((sum, user) => sum + user.monthlyIncome, 0);

  const incomeParts = users.map((user) => ({
    label: user.name,
    amount: user.monthlyIncome,
    color: user.color,
  }));

  const describeRemoval = (userId: string): string => {
    const sharedCount =
      categories
        .find((category) => category.id === 'shared')
        ?.expenses.filter((expense) => expense.paidBy === userId).length ?? 0;
    const personalCount =
      categories.find((category) => category.id === `personal-${userId}`)
        ?.expenses.length ?? 0;
    const loanCount = loans.filter((loan) => loan.paidBy === userId).length;

    return `This also deletes ${countOf(personalCount, 'personal expense')}, ${countOf(sharedCount, 'household expense')} and ${countOf(loanCount, 'loan')} they pay. This cannot be undone.`;
  };

  const handleAddUser = async () => {
    if (!onAddUser || !newUserName.trim() || !newUserIncome.trim()) return;

    try {
      await onAddUser({
        name: newUserName.trim(),
        email: '',
        photoURL: '',
        color: newUserColor,
        monthlyIncome: parseFloat(newUserIncome),
        municipalityCode: newUserMunicipalityCode || '',
        municipalityName: newUserMunicipalityName || '',
      });

      // Reset form
      setNewUserName('');
      setNewUserIncome('');
      setNewUserMunicipalityCode('');
      setNewUserMunicipalityName('');
      setNewUserColor(USER_COLORS[0]);
      setIsAddingUser(false);
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">People</h1>
        {onAddUser && (
          <button
            type="button"
            onClick={() => setIsAddingUser(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add person
          </button>
        )}
      </div>

      {/* Add User Form */}
      {isAddingUser && (
        <div className="form-panel mb-6">
          <h3 className="section-title mb-4">Add a person</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor={`${fieldId}-1`} className="field-label">
                Name
              </label>
              <input
                id={`${fieldId}-1`}
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="field"
                placeholder="Enter name"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-2`} className="field-label">
                Monthly income (kr)
              </label>
              <input
                id={`${fieldId}-2`}
                type="number"
                value={newUserIncome}
                onChange={(e) => setNewUserIncome(e.target.value)}
                className="field"
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-3`} className="field-label">
                Municipality
              </label>
              <MunicipalitySelector
                id={`${fieldId}-3`}
                selectedMunicipalityCode={newUserMunicipalityCode}
                selectedMunicipalityName={newUserMunicipalityName}
                onMunicipalityChange={(code, name) => {
                  setNewUserMunicipalityCode(code);
                  setNewUserMunicipalityName(name);
                }}
              />
            </div>
          </div>

          <div role="group" aria-label="Color" className="mt-4">
            <p className="field-label">Color</p>
            <ColorPicker
              selectedColor={newUserColor}
              onColorChange={setNewUserColor}
              usedColors={users.map((user) => user.color)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setIsAddingUser(false);
                setNewUserName('');
                setNewUserIncome('');
                setNewUserMunicipalityCode('');
                setNewUserMunicipalityName('');
                setNewUserColor(USER_COLORS[0]);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              disabled={!newUserName.trim() || !newUserIncome.trim()}
              className="btn-primary"
            >
              Add person
            </button>
          </div>
        </div>
      )}

      {users.length > 1 && totalIncome > 0 && (
        <section className="panel mb-5 p-6">
          <h2 className="section-title mb-4">
            {formatMoney(totalIncome)} kr before tax
          </h2>
          <SegmentedBar parts={incomeParts} />
          <div className="mt-3">
            <CostLegend parts={incomeParts} />
          </div>
        </section>
      )}

      <ul className="panel divide-y divide-line">
        {users.map((user) => (
          <li key={user.id} className="p-6">
            {editingId === user.id ? (
              <EditUserForm
                user={user}
                onSave={handleUpdateUser}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 basis-56">
                  <h2 className="section-title mb-3 flex items-center gap-3 break-words">
                    <Avatar user={user} size="medium" />
                    {user.name}
                  </h2>
                  <UserTaxInfo user={user} />
                  {totalIncome > 0 && users.length > 1 && (
                    <p className="text-sm text-muted">
                      {((user.monthlyIncome / totalIncome) * 100).toFixed(1)}%
                      of household income
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <Link
                    to={`${householdPath}/users/${user.id}`}
                    className="btn-secondary mr-2"
                  >
                    Open budget
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingId(user.id)}
                    className="icon-btn"
                    aria-label={`Edit ${user.name}`}
                    title={`Edit ${user.name}`}
                  >
                    <Edit2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {user.role !== 'owner' && onDeleteUser && (
                    <DeleteButton
                      name={user.name}
                      description={describeRemoval(user.id)}
                      disabled={deletingId === user.id}
                      onDelete={() => handleDeleteUser(user.id)}
                    />
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EditUserFormProps {
  user: User;
  onSave: (
    userId: string,
    name: string,
    income: string,
    municipalityCode: string,
    municipalityName: string,
    color: string
  ) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onSave, onCancel }: EditUserFormProps) {
  const fieldId = useId();
  const [name, setName] = useState(user.name);
  const [income, setIncome] = useState(user.monthlyIncome.toString());
  const [municipalityCode, setMunicipalityCode] = useState(
    user.municipalityCode || ''
  );
  const [municipalityName, setMunicipalityName] = useState(
    user.municipalityName || ''
  );

  const [color, setColor] = useState(user.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, name, income, municipalityCode, municipalityName, color);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor={`${fieldId}-4`} className="field-label">
            Name
          </label>
          <input
            id={`${fieldId}-4`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="User name"
            required
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-5`} className="field-label">
            Monthly income (kr)
          </label>
          <input
            id={`${fieldId}-5`}
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="field"
            placeholder="Monthly income"
            required
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-6`} className="field-label">
            Municipality
          </label>
          <MunicipalitySelector
            id={`${fieldId}-6`}
            selectedMunicipalityCode={municipalityCode}
            selectedMunicipalityName={municipalityName}
            onMunicipalityChange={(code, name) => {
              setMunicipalityCode(code);
              setMunicipalityName(name);
            }}
          />
        </div>
      </div>

      <div role="group" aria-label="Color" className="mt-4">
        <p className="field-label">Color</p>
        <ColorPicker selectedColor={color} onColorChange={setColor} />
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
