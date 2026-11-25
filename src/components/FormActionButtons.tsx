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
    <div className="flex flex-col sm:flex-row gap-2 mt-6">
      <button
        type={submitType}
        onClick={submitType === 'button' ? onSubmit : undefined}
        disabled={disabled || isSubmitting}
        className="btn-primary"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="btn-secondary"
      >
        Cancel
      </button>
    </div>
  );
}
