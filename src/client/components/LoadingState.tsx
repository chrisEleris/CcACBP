export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
        <p className="mt-3 text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
