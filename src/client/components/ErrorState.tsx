import { AlertTriangle } from "lucide-react";

type Props = { message: string; onRetry?: () => void };

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-red-400">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
