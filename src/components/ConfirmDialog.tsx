import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 shadow-2xl text-left text-slate-900 backdrop:bg-slate-900/50"
    >
      <h2 id="confirm-title" className="section-title">
        {title}
      </h2>
      <p id="confirm-description" className="mt-2 text-sm text-slate-700">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          autoFocus
          className="btn-secondary"
          onClick={() => dialogRef.current?.close()}
        >
          Cancel
        </button>
        <button
          type="button"
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          onClick={() => {
            onConfirm();
            dialogRef.current?.close();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
