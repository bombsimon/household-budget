import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface DeleteButtonProps {
  name: string;
  description?: string;
  disabled?: boolean;
  showLabel?: boolean;
  onDelete: () => void;
}

export function DeleteButton({
  name,
  description = 'This cannot be undone.',
  disabled = false,
  showLabel = false,
  onDelete,
}: DeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsConfirming(true)}
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        className={
          showLabel
            ? 'btn text-red-700 hover:bg-red-50'
            : 'icon-btn hover:text-red-700'
        }
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {showLabel && 'Delete'}
      </button>
      {isConfirming && (
        <ConfirmDialog
          title={`Delete ${name}?`}
          description={description}
          confirmLabel="Delete"
          onConfirm={onDelete}
          onClose={() => setIsConfirming(false)}
        />
      )}
    </>
  );
}
