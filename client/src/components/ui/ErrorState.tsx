import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 border border-rose-900/60 rounded-xl bg-rose-950/20 my-4">
      <div className="p-3 bg-rose-900/40 rounded-full mb-3 text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-rose-200 mb-1">{title}</h4>
      <p className="text-sm text-rose-300/80 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
