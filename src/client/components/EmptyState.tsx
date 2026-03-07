import { Inbox } from "lucide-react";

type Props = { message?: string };

export function EmptyState({ message = "No data available" }: Props) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Inbox className="mx-auto h-10 w-10 text-gray-500" />
        <p className="mt-3 text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}
