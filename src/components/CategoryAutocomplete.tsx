import { useState, useRef, useEffect } from 'react';
import type { PersonalExpenseCategory } from '../types';

interface CategoryAutocompleteProps {
  personalCategories: PersonalExpenseCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<string>;
}

export function CategoryAutocomplete({
  personalCategories,
  value,
  onChange,
  onCreateCategory,
}: CategoryAutocompleteProps) {
  const selectedCategory = personalCategories.find((c) => c.id === value);
  const [inputValue, setInputValue] = useState(selectedCategory?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const cat = personalCategories.find((c) => c.id === value);
    setInputValue(cat?.name || '');
  }, [value, personalCategories]);

  const filteredCategories = personalCategories
    .filter((c) => c.name.toLowerCase().includes(inputValue.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const exactMatch = personalCategories.some(
    (c) => c.name.toLowerCase() === inputValue.trim().toLowerCase()
  );
  const showCreate = inputValue.trim() && !exactMatch;

  const options: {
    type: 'uncategorized' | 'existing' | 'create';
    id: string;
    label: string;
  }[] = [
    { type: 'uncategorized', id: '', label: 'Uncategorized' },
    ...filteredCategories.map((c) => ({
      type: 'existing' as const,
      id: c.id,
      label: c.name,
    })),
    ...(showCreate
      ? [
          {
            type: 'create' as const,
            id: '__create__',
            label: `Create "${inputValue.trim()}"`,
          },
        ]
      : []),
  ];

  const selectOption = async (option: (typeof options)[number]) => {
    if (option.type === 'create') {
      setIsCreating(true);
      try {
        const newId = await onCreateCategory(inputValue.trim());
        onChange(newId);
      } finally {
        setIsCreating(false);
      }
    } else {
      onChange(option.id);
      setInputValue(option.id ? option.label : '');
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          selectOption(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        const cat = personalCategories.find((c) => c.id === value);
        setInputValue(cat?.name || '');
        break;
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      const cat = personalCategories.find((c) => c.id === value);
      setInputValue(cat?.name || '');
    }, 200);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Uncategorized"
        disabled={isCreating}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {options.map((option, index) => (
            <li
              key={option.id || '__uncategorized__'}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-700'
              } ${option.type === 'create' ? 'border-t border-gray-100 text-blue-600 font-medium' : ''} ${
                option.type === 'uncategorized' ? 'text-gray-400 italic' : ''
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
