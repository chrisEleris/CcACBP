import { BookOpen, ChevronDown, ChevronRight, Play, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useFetch } from "../lib/use-fetch";

type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
};

type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
  rowCount?: number;
};

type QueryResultRow = Record<string, string | number | boolean | null>;

type QueryResult = {
  columns: string[];
  rows: QueryResultRow[];
  rowCount: number;
  executionTimeMs: number;
};

type SavedSnippet = {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
};

export function QueryExplorerPage() {
  const {
    data: schemaTables,
    loading: schemaLoading,
    error: schemaError,
  } = useFetch<SchemaTable[]>("/api/query/schema");

  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [queryText, setQueryText] = useState("SELECT * FROM users LIMIT 100;");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>([]);
  const [snippetName, setSnippetName] = useState("");

  function toggleTable(tableName: string) {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }

  async function handleRunQuery() {
    if (!queryText.trim()) return;
    setIsRunning(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const response = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: queryText }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? `Query failed: ${response.statusText}`);
      }
      const body = (await response.json()) as { data: QueryResult };
      setQueryResult(body.data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Query execution failed");
    } finally {
      setIsRunning(false);
    }
  }

  function handleSaveSnippet() {
    if (!snippetName.trim() || !queryText.trim()) return;
    const snippet: SavedSnippet = {
      id: `snippet-${Date.now()}`,
      name: snippetName.trim(),
      sql: queryText,
      createdAt: new Date().toISOString(),
    };
    setSavedSnippets((prev) => [snippet, ...prev]);
    setSnippetName("");
  }

  function handleLoadSnippet(snippet: SavedSnippet) {
    setQueryText(snippet.sql);
    setQueryResult(null);
    setQueryError(null);
  }

  function handleDeleteSnippet(id: string) {
    setSavedSnippets((prev) => prev.filter((s) => s.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRunQuery();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Main split layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Schema browser */}
        <div className="flex w-60 shrink-0 flex-col rounded-xl border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2 border-b border-gray-700/50 px-4 py-3">
            <BookOpen size={15} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Schema</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {schemaLoading && (
              <div className="py-6">
                <LoadingState />
              </div>
            )}
            {schemaError && <p className="p-2 text-xs text-red-400">{schemaError}</p>}
            {!schemaLoading && !schemaError && (schemaTables ?? []).length === 0 && (
              <p className="p-2 text-xs text-gray-500">No tables found</p>
            )}
            {(schemaTables ?? []).map((table) => {
              const isExpanded = expandedTables.has(table.name);
              return (
                <div key={table.name}>
                  <button
                    type="button"
                    onClick={() => toggleTable(table.name)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                  >
                    {isExpanded ? (
                      <ChevronDown size={13} className="shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight size={13} className="shrink-0 text-gray-500" />
                    )}
                    <span className="truncate font-mono">{table.name}</span>
                    {table.rowCount !== undefined && (
                      <span className="ml-auto shrink-0 text-xs text-gray-600">
                        {table.rowCount}
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700/50 pl-3">
                      {table.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between gap-2 py-1"
                        >
                          <span className="truncate font-mono text-xs text-gray-400">
                            {col.name}
                          </span>
                          <span className="shrink-0 text-xs text-gray-600">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Editor + results */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          {/* Query editor */}
          <div className="flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/50">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
              <span className="text-sm font-medium text-gray-300">SQL Editor</span>
              <span className="text-xs text-gray-600">Ctrl+Enter to run</span>
            </div>
            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={8}
              spellCheck={false}
              placeholder="SELECT * FROM users LIMIT 100;"
              className="resize-none bg-transparent px-4 py-3 font-mono text-sm text-gray-200 placeholder-gray-700 focus:outline-none"
            />
            <div className="flex items-center gap-3 border-t border-gray-700/50 px-4 py-3">
              <button
                type="button"
                onClick={handleRunQuery}
                disabled={isRunning || !queryText.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Play size={14} />
                {isRunning ? "Running..." : "Run Query"}
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  placeholder="Snippet name..."
                  className="w-40 rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveSnippet}
                  disabled={!snippetName.trim() || !queryText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {queryError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="font-mono text-sm text-red-400">{queryError}</p>
            </div>
          )}

          {queryResult && (
            <div className="flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/50">
              <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
                <span className="text-sm font-medium text-gray-300">Results</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {queryResult.rowCount} row{queryResult.rowCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-gray-500">{queryResult.executionTimeMs}ms</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      {queryResult.columns.map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-4 py-2 text-xs font-medium tracking-wider text-gray-400 uppercase"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {queryResult.rows.map((row, rowIdx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: query results have no stable id
                      <tr key={rowIdx} className="transition-colors hover:bg-white/[0.02]">
                        {queryResult.columns.map((col) => (
                          <td
                            key={col}
                            className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-300"
                          >
                            {row[col] === null ? (
                              <span className="text-gray-600">NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queryResult.rows.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    Query returned no rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved snippets */}
      {savedSnippets.length > 0 && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2 border-b border-gray-700/50 px-4 py-3">
            <BookOpen size={15} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Saved Snippets</span>
            <span className="ml-auto text-xs text-gray-600">{savedSnippets.length}</span>
          </div>
          <div className="divide-y divide-gray-700/30">
            {savedSnippets.map((snippet) => (
              <div key={snippet.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{snippet.name}</p>
                  <p className="truncate font-mono text-xs text-gray-500">{snippet.sql}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSnippet(snippet)}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                  >
                    <Plus size={12} />
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                    aria-label={`Delete snippet ${snippet.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
