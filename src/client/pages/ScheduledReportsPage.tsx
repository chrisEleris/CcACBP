import { Calendar, Clock, FileText, Play, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useFetch } from "../lib/use-fetch";

type ExportFormat = "csv" | "json" | "pdf" | "xlsx";

type ScheduledReport = {
  id: string;
  reportId: string;
  reportName: string;
  cronExpression: string;
  enabled: boolean;
  format: ExportFormat;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
};

type ReportOption = {
  id: string;
  name: string;
};

type ScheduleFormState = {
  reportId: string;
  cronExpression: string;
  format: ExportFormat;
  enabled: boolean;
};

const DEFAULT_FORM: ScheduleFormState = {
  reportId: "",
  cronExpression: "0 9 * * 1",
  format: "csv",
  enabled: true,
};

const FORMAT_OPTIONS: ExportFormat[] = ["csv", "json", "pdf", "xlsx"];

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Every day at 9am", value: "0 9 * * *" },
  { label: "Every Monday 9am", value: "0 9 * * 1" },
  { label: "1st of every month", value: "0 9 1 * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
];

export function ScheduledReportsPage() {
  const {
    data: schedules,
    loading,
    error,
    refetch,
  } = useFetch<ScheduledReport[]>("/api/scheduled-reports");

  const { data: reportOptions } = useFetch<ReportOption[]>("/api/reports");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleOpenCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(schedule: ScheduledReport) {
    setEditingId(schedule.id);
    setForm({
      reportId: schedule.reportId,
      cronExpression: schedule.cronExpression,
      format: schedule.format,
      enabled: schedule.enabled,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  }

  function handleFormChange<K extends keyof ScheduleFormState>(
    key: K,
    value: ScheduleFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.reportId) {
      setFormError("Please select a report");
      return;
    }
    if (!form.cronExpression.trim()) {
      setFormError("Cron expression is required");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const method = editingId ? "PUT" : "POST";
      const path = editingId ? `/api/scheduled-reports/${editingId}` : "/api/scheduled-reports";
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }
      handleCloseModal();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleEnabled(schedule: ScheduledReport) {
    setTogglingId(schedule.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/scheduled-reports/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedule, enabled: !schedule.enabled }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update: ${response.statusText}`);
      }
      refetch();
    } catch (err) {
      console.error("Operation failed:", err);
      setActionError("Failed to update schedule. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRunNow(id: string) {
    setRunningId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/scheduled-reports/${id}/run`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Failed to run: ${response.statusText}`);
      }
      refetch();
    } catch (err) {
      console.error("Operation failed:", err);
      setActionError("Failed to run schedule. Please try again.");
    } finally {
      setRunningId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/scheduled-reports/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.statusText}`);
      }
      refetch();
    } catch (err) {
      console.error("Operation failed:", err);
      setActionError("Failed to delete schedule. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const scheduleList = schedules ?? [];
  const reports = reportOptions ?? [];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Scheduled Reports</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {scheduleList.length} schedule{scheduleList.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Schedule
        </button>
      </div>

      {actionError && <p className="text-sm text-red-400 mt-2">{actionError}</p>}

      {/* Table */}
      {scheduleList.length === 0 ? (
        <EmptyState message="No scheduled reports. Create one to automate your reporting." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/50">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Report
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Schedule
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Format
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Last Run
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Next Run
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Enabled
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {scheduleList.map((schedule) => (
                <tr key={schedule.id} className="transition-colors hover:bg-white/[0.02]">
                  {/* Report name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="shrink-0 text-gray-500" />
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(schedule)}
                        className="font-medium text-white hover:text-blue-400"
                      >
                        {schedule.reportName}
                      </button>
                    </div>
                  </td>

                  {/* Cron expression */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={13} className="text-gray-500" />
                      <span className="font-mono text-xs">{schedule.cronExpression}</span>
                    </div>
                  </td>

                  {/* Format */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs font-medium text-gray-300 uppercase">
                      {schedule.format}
                    </span>
                  </td>

                  {/* Last run */}
                  <td className="px-4 py-3 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-600" />
                      <span className="text-xs">{schedule.lastRunAt ?? "Never"}</span>
                    </div>
                  </td>

                  {/* Next run */}
                  <td className="px-4 py-3 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-600" />
                      <span className="text-xs">
                        {schedule.enabled ? (schedule.nextRunAt ?? "—") : "Paused"}
                      </span>
                    </div>
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(schedule)}
                      disabled={togglingId === schedule.id}
                      aria-label={schedule.enabled ? "Disable schedule" : "Enable schedule"}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        schedule.enabled ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          schedule.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRunNow(schedule.id)}
                        disabled={runningId === schedule.id}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                        aria-label="Run now"
                      >
                        {runningId === schedule.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Play size={12} />
                        )}
                        Run
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(schedule.id)}
                        disabled={deletingId === schedule.id}
                        className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        aria-label={`Delete schedule for ${schedule.reportName}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-labelledby="schedule-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCloseModal();
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
            onKeyDown={() => undefined}
            role="presentation"
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 id="schedule-modal-title" className="text-lg font-semibold text-white">
                {editingId ? "Edit Schedule" : "Create Schedule"}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Report selector */}
              <div>
                <label
                  htmlFor="sched-report"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Report <span className="text-red-400">*</span>
                </label>
                <select
                  id="sched-report"
                  value={form.reportId}
                  onChange={(e) => handleFormChange("reportId", e.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a report...</option>
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cron expression */}
              <div>
                <label
                  htmlFor="sched-cron"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Cron Expression <span className="text-red-400">*</span>
                </label>
                <input
                  id="sched-cron"
                  type="text"
                  value={form.cronExpression}
                  onChange={(e) => handleFormChange("cronExpression", e.target.value)}
                  placeholder="0 9 * * 1"
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CRON_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleFormChange("cronExpression", preset.value)}
                      className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <p className="mb-1.5 block text-sm font-medium text-gray-300">Export Format</p>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleFormChange("format", fmt)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium uppercase transition-colors ${
                        form.format === fmt
                          ? "border-blue-500 bg-blue-500/10 text-blue-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Enabled</p>
                  <p className="text-xs text-gray-500">
                    Schedule will run automatically when enabled
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFormChange("enabled", !form.enabled)}
                  aria-label={form.enabled ? "Disable schedule" : "Enable schedule"}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    form.enabled ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      form.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update"
                ) : (
                  "Create Schedule"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
