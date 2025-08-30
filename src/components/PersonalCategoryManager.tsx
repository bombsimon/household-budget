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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onTogglePersonalCategoriesSectionCollapse}
            className="flex items-center gap-2 text-left flex-1"
          >
            {!isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Categories
              </h2>
              <span className="text-sm text-gray-500">
                ({personalCategories.length})
              </span>
            </div>
          </button>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
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
              {personalCategories.map((category) => (
                <div key={category.id} className="group">
                  {editingCategory === category.id ? (
                    <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-20 px-1 py-0 text-sm border-none bg-transparent focus:outline-none"
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
                        className="text-green-600 hover:text-green-700 text-xs"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-sm text-green-700 group-hover:bg-green-100 transition-colors">
                      <Tag className="w-3 h-3" />
                      <span>{category.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-1 transition-opacity">
                        <button
                          onClick={() => startEditingCategory(category)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeletePersonalCategory(category.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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
