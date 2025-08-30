interface FormActionButtonsProps {
  onSubmit?: () => void;
  onCancel: () => void;
  submitLabel?: string;
  submitType?: 'button' | 'submit';
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function FormActionButtons({
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitType = 'submit',
  isSubmitting = false,
  disabled = false,
}: FormActionButtonsProps) {
  return (
    <div className="flex gap-2 mt-6">
      <button
        type={submitType}
        onClick={submitType === 'button' ? onSubmit : undefined}
        disabled={disabled || isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
