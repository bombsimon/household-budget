type SplitType = 'equal' | 'percentage';

interface SplitMethodSelectorProps {
  value: SplitType;
  onChange: (value: SplitType) => void;
  name?: string;
}

export function SplitMethodSelector({
  value,
  onChange,
  name = 'splitMethod',
}: SplitMethodSelectorProps) {
  const options = [
    {
      key: 'equal' as const,
      label: 'Equally',
      description: 'Everyone pays the same',
    },
    {
      key: 'percentage' as const,
      label: 'By income',
      description: 'Higher income pays more',
    },
  ];

  return (
    <fieldset>
      <legend className="field-label">How to split it</legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.key} className="flex items-start">
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={value === option.key}
              onChange={() => onChange(option.key)}
              className="mt-0.5 mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                {option.label}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
