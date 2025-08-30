type SplitType = 'equal' | 'percentage' | 'fixed';

interface SplitMethodSelectorProps {
  value: SplitType;
  onChange: (value: SplitType) => void;
  showFixed?: boolean;
}

export function SplitMethodSelector({
  value,
  onChange,
  showFixed = true,
}: SplitMethodSelectorProps) {
  const options = [
    {
      key: 'equal' as const,
      label: 'Equal Split',
      description: 'Split equally between all parties',
    },
    {
      key: 'percentage' as const,
      label: 'Split by Income %',
      description: 'Split proportionally by income',
    },
  ];

  if (showFixed) {
    options.push({
      key: 'fixed' as any,
      label: 'Fixed Amount',
      description: 'Paid by one person only',
    });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Split Method
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.key} className="flex items-start">
            <input
              type="radio"
              name="splitMethod"
              value={option.key}
              checked={value === option.key}
              onChange={(e) => onChange(e.target.value as any)}
              className="mt-0.5 mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {option.label}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
