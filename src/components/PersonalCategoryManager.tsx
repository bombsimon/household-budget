import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag,
} from 'lucide-react';
import type { PersonalExpenseCategory } from '../types';

interface PersonalCategoryManagerProps {
  personalCategories: PersonalExpenseCategory[];
  personalCategoriesSectionCollapsed: boolean;
  onAddPersonalCategory: (name: string) => void;
  onUpdatePersonalCategory: (
    categoryId: string,
    updates: Partial<PersonalExpenseCategory>
  ) => void;
  onDeletePersonalCategory: (categoryId: string) => void;
  onTogglePersonalCategoryCollapse: (categoryId: string) => void;
  onTogglePersonalCategoriesSectionCollapse: () => void;
}

export function PersonalCategoryManager({
  personalCategories,
  personalCategoriesSectionCollapsed,
  onAddPersonalCategory,
  onUpdatePersonalCategory,
  onDeletePersonalCategory,
  onTogglePersonalCategoriesSectionCollapse,
}: PersonalCategoryManagerProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Use the prop from global state instead of local state
  const isCollapsed = personalCategoriesSectionCollapsed;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddPersonalCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategory = (categoryId: string) => {
    if (editingName.trim()) {
      onUpdatePersonalCategory(categoryId, { name: editingName.trim() });
      setEditingCategory(null);
      setEditingName('');
    }
  };

  const startEditingCategory = (category: PersonalExpenseCategory) => {
    setEditingCategory(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditingName('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Mobile: 3-row layout, Desktop: single row */}
          <button
            onClick={onTogglePersonalCategoriesSectionCollapse}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
          >
            {!isCollapsed ? (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <h2 className="text-base font-semibold text-gray-900 leading-tight truncate">
                  Categories
                </h2>
                <span className="text-sm text-gray-500 flex-shrink-0">
                  ({personalCategories.length})
                </span>
              </div>
            </div>
          </button>

          {/* Desktop: inline button */}
          <button
            onClick={() => setIsAddingCategory(true)}
            className="hidden sm:flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Mobile: Add button on separate row - hide when collapsed */}
        {!isCollapsed && (
          <div className="sm:hidden mt-2">
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        )}
      </div>

      {isAddingCategory && !isCollapsed && (
        <form
          onSubmit={handleAddCategory}
          className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Streaming, Charity, Hobbies"
              required
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryName('');
              }}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isCollapsed && (
        <div className="p-4 space-y-1">
          {personalCategories.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No personal categories yet</p>
              <p className="text-xs text-gray-400">
                Click "Add" to create your first category
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...personalCategories]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => (
                  <div key={category.id}>
                    {editingCategory === category.id ? (
                      <div className="flex items-center justify-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0 min-w-0 h-6">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="min-w-0 flex-1 px-1 py-0 text-xs text-center border-none bg-transparent focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateCategory(category.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCategory(category.id)}
                          className="text-green-500 hover:text-green-700 flex-shrink-0"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => onDeletePersonalCategory(category.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingCategory(category)}
                        className="flex items-center justify-center bg-green-50 border border-green-200 rounded-full px-2 py-0 text-xs text-green-700 hover:bg-green-100 transition-colors cursor-pointer h-6"
                      >
                        <span className="text-center">{category.name}</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
