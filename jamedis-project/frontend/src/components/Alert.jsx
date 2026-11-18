import { AlertCircle, CheckCircle2, X } from 'lucide-react';

// A coloured message box. type: 'error' | 'success'. Pass onClose to show a dismiss button.
export default function Alert({ type = 'error', children, onClose }) {
  const isError = type === 'error';
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div role={isError ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${styles}`}>
      <span className="flex items-start gap-2.5">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <span>{children}</span>
      </span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss message" className="opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
