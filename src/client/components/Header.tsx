import { Bell, Search, User } from "lucide-react";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-aws-dark flex items-center justify-between border-b border-white/10 px-6 py-3">
      <h1 className="text-xl font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search resources..."
            className="w-64 rounded-lg bg-white/10 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
          <User size={18} className="text-gray-300" />
          <span className="text-sm text-gray-200">Admin</span>
        </div>
      </div>
    </header>
  );
}
