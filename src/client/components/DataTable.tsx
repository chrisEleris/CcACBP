import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
};

export function DataTable<T>({ columns, data, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/50">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-700/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/30">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="transition-colors hover:bg-white/[0.02]">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-gray-300 ${col.className ?? ""}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-gray-500">No data available</div>
      )}
    </div>
  );
}
