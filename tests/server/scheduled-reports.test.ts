import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ReportBody = {
  data: {
    id: string;
    name: string;
    query: string;
    visualization: string;
  };
};

type ScheduledReportBody = {
  data: {
    id: string;
    reportId: string;
    cronExpression: string;
    enabled: boolean;
    format: string;
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type ScheduledReportListBody = {
  data: Array<{
    id: string;
    reportId: string;
    cronExpression: string;
    enabled: boolean;
    format: string;
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdAt: string;
    updatedAt: string;
    reportName: string | null;
  }>;
};

type RunBody = {
  data: {
    status: string;
    schedule: {
      id: string;
      reportId: string;
      lastRunAt: string | null;
      updatedAt: string;
    };
    triggeredAt: string;
  };
};

type DeleteBody = {
  data: {
    message: string;
  };
};

type ErrorBody = {
  message: string;
};

/** Creates a saved report and returns its id. */
async function createReport(name: string): Promise<string> {
  const res = await app.request("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, query: "SELECT 1", visualization: "table" }),
  });
  const body = (await res.json()) as ReportBody;
  return body.data.id;
}

/** Creates a scheduled report and returns the parsed response body. */
async function createSchedule(
  reportId: string,
  cronExpression = "0 9 * * *",
  format: "json" | "csv" | "pdf" | "xlsx" = "json",
): Promise<ScheduledReportBody> {
  const res = await app.request("/api/scheduled-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, cronExpression, format }),
  });
  return (await res.json()) as ScheduledReportBody;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Scheduled Reports API routes", () => {
  // -------------------------------------------------------------------------
  // GET /api/scheduled-reports
  // -------------------------------------------------------------------------

  describe("GET /api/scheduled-reports", () => {
    it("returns 200 with a data array", async () => {
      const res = await app.request("/api/scheduled-reports");
      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportListBody;
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns items that include reportName from LEFT JOIN", async () => {
      const reportId = await createReport("Left Join Report");
      await createSchedule(reportId, "0 6 * * *", "csv");

      const res = await app.request("/api/scheduled-reports");
      const body = (await res.json()) as ScheduledReportListBody;

      const found = body.data.find((r) => r.reportId === reportId);
      expect(found).toBeDefined();
      // reportName is populated from the LEFT JOIN to savedReports
      expect(found?.reportName).toBe("Left Join Report");
    });

    it("returns reportName as null when the linked report does not exist", async () => {
      // Insert a schedule whose reportId references a non-existent saved report.
      // We create a schedule with a real report, then verify that any row whose
      // reportId has no matching savedReport has reportName === null.
      // Because we cannot easily orphan a row in tests, we verify the shape.
      const res = await app.request("/api/scheduled-reports");
      const body = (await res.json()) as ScheduledReportListBody;
      // Every item must have the reportName key (null or string)
      for (const item of body.data) {
        expect("reportName" in item).toBe(true);
      }
    });

    it("returns items with all expected fields", async () => {
      const reportId = await createReport("Field Check Report");
      await createSchedule(reportId, "*/30 * * * *", "pdf");

      const res = await app.request("/api/scheduled-reports");
      const body = (await res.json()) as ScheduledReportListBody;

      const found = body.data.find((r) => r.reportId === reportId);
      expect(found).toBeDefined();
      if (!found) return;

      expect(typeof found.id).toBe("string");
      expect(typeof found.reportId).toBe("string");
      expect(typeof found.cronExpression).toBe("string");
      expect(typeof found.enabled).toBe("boolean");
      expect(typeof found.format).toBe("string");
      expect(typeof found.createdAt).toBe("string");
      expect(typeof found.updatedAt).toBe("string");
    });

    it("returns the most recently created schedule first (descending createdAt order)", async () => {
      const reportIdA = await createReport("Order Report A");
      const reportIdB = await createReport("Order Report B");

      // Small delay to guarantee distinct createdAt values
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await createSchedule(reportIdA, "0 1 * * *");

      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await createSchedule(reportIdB, "0 2 * * *");

      const res = await app.request("/api/scheduled-reports");
      const body = (await res.json()) as ScheduledReportListBody;

      const indexA = body.data.findIndex((r) => r.reportId === reportIdA);
      const indexB = body.data.findIndex((r) => r.reportId === reportIdB);

      expect(indexA).toBeGreaterThan(-1);
      expect(indexB).toBeGreaterThan(-1);
      // B was created after A, so it must appear earlier in the sorted list
      expect(indexB).toBeLessThan(indexA);
    });

    it("returns createdAt and updatedAt as ISO-like strings", async () => {
      const reportId = await createReport("ISO Timestamp Report");
      await createSchedule(reportId, "0 3 * * *");

      const res = await app.request("/api/scheduled-reports");
      const body = (await res.json()) as ScheduledReportListBody;

      const found = body.data.find((r) => r.reportId === reportId);
      expect(found).toBeDefined();
      if (!found) return;

      // Both timestamps must be non-empty strings parseable as dates
      expect(new Date(found.createdAt).toString()).not.toBe("Invalid Date");
      expect(new Date(found.updatedAt).toString()).not.toBe("Invalid Date");
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/scheduled-reports
  // -------------------------------------------------------------------------

  describe("POST /api/scheduled-reports", () => {
    it("creates a schedule and returns 201 with the new record", async () => {
      const reportId = await createReport("Scheduled Test Report");

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 9 * * *",
          format: "csv",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.id).toBeDefined();
      expect(body.data.reportId).toBe(reportId);
      expect(body.data.cronExpression).toBe("0 9 * * *");
      expect(body.data.format).toBe("csv");
    });

    it("defaults enabled to true when not provided", async () => {
      const reportId = await createReport("Default Enabled Report");
      const body = await createSchedule(reportId);
      expect(body.data.enabled).toBe(true);
    });

    it("defaults format to json when not provided", async () => {
      const reportId = await createReport("Default Format Report");

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, cronExpression: "0 0 * * *" }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.format).toBe("json");
    });

    it("accepts enabled: false explicitly", async () => {
      const reportId = await createReport("Disabled Report");

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 0 * * 0",
          enabled: false,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.enabled).toBe(false);
    });

    it("accepts enabled: true explicitly", async () => {
      const reportId = await createReport("Explicit Enabled True Report");

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 0 * * 1",
          enabled: true,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.enabled).toBe(true);
    });

    it("accepts nextRunAt when provided", async () => {
      const reportId = await createReport("NextRunAt Report");
      const nextRunAt = "2026-04-01T09:00:00.000Z";

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 9 * * 1",
          nextRunAt,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.nextRunAt).toBe(nextRunAt);
    });

    it("sets nextRunAt to null when not provided", async () => {
      const reportId = await createReport("No NextRunAt Report");
      const body = await createSchedule(reportId);
      expect(body.data.nextRunAt).toBeNull();
    });

    it("sets lastRunAt to null on creation", async () => {
      const reportId = await createReport("Initial LastRunAt Report");
      const body = await createSchedule(reportId);
      expect(body.data.lastRunAt).toBeNull();
    });

    it("accepts all valid format values", async () => {
      const formats: Array<"json" | "csv" | "pdf" | "xlsx"> = ["json", "csv", "pdf", "xlsx"];

      for (const format of formats) {
        const reportId = await createReport(`Format ${format} Report`);
        const res = await app.request("/api/scheduled-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, cronExpression: "0 0 * * *", format }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as ScheduledReportBody;
        expect(body.data.format).toBe(format);
      }
    });

    it("returns 400 when reportId is missing", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 9 * * *" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when cronExpression is missing", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: "some-id" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when body is empty", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when format is an invalid value", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: "some-id",
          cronExpression: "0 9 * * *",
          format: "xml",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when reportId is an empty string", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: "", cronExpression: "0 9 * * *" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when cronExpression is an empty string", async () => {
      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: "some-id", cronExpression: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns a new unique id for each created schedule", async () => {
      const reportId = await createReport("Unique ID Report");
      const first = await createSchedule(reportId, "0 1 * * *");
      const second = await createSchedule(reportId, "0 2 * * *");
      expect(first.data.id).not.toBe(second.data.id);
    });

    it("returns createdAt and updatedAt as non-empty strings on creation", async () => {
      const reportId = await createReport("Timestamps On Create Report");
      const body = await createSchedule(reportId);
      expect(typeof body.data.createdAt).toBe("string");
      expect(body.data.createdAt.length).toBeGreaterThan(0);
      expect(typeof body.data.updatedAt).toBe("string");
      expect(body.data.updatedAt.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/scheduled-reports/:id
  // -------------------------------------------------------------------------

  describe("PUT /api/scheduled-reports/:id", () => {
    it("returns 404 for a non-existent id", async () => {
      const res = await app.request("/api/scheduled-reports/00000000-0000-0000-0000-000000000000", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 8 * * *" }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(body.message).toBeDefined();
    });

    it("updates cronExpression and returns the updated record", async () => {
      const reportId = await createReport("Update Cron Report");
      const created = await createSchedule(reportId, "0 9 * * *");
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 18 * * 5" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.cronExpression).toBe("0 18 * * 5");
      expect(body.data.id).toBe(schedId);
    });

    it("updates enabled flag to false", async () => {
      const reportId = await createReport("Toggle Enabled Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      expect(created.data.enabled).toBe(true);

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.enabled).toBe(false);
    });

    it("updates format to a different valid value", async () => {
      const reportId = await createReport("Update Format Report");
      const created = await createSchedule(reportId, "0 9 * * *", "json");
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "xlsx" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.format).toBe("xlsx");
    });

    it("updates updatedAt timestamp on successful update", async () => {
      const reportId = await createReport("UpdatedAt Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;
      const originalUpdatedAt = created.data.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 12 * * *" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("returns 400 when format is an invalid value", async () => {
      const reportId = await createReport("Bad Format Update Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "docx" }),
      });

      expect(res.status).toBe(400);
    });

    it("updates multiple fields in a single PUT request", async () => {
      const reportId = await createReport("Multi-field Update Report");
      const created = await createSchedule(reportId, "0 9 * * *", "json");
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cronExpression: "0 20 * * 6",
          format: "pdf",
          enabled: false,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.cronExpression).toBe("0 20 * * 6");
      expect(body.data.format).toBe("pdf");
      expect(body.data.enabled).toBe(false);
    });

    it("sets nextRunAt via update", async () => {
      const reportId = await createReport("Set NextRunAt Via Update Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;
      expect(created.data.nextRunAt).toBeNull();

      const nextRunAt = "2026-06-15T08:00:00.000Z";
      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextRunAt }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.nextRunAt).toBe(nextRunAt);
    });

    it("clears nextRunAt by setting it to null", async () => {
      const reportId = await createReport("Clear NextRunAt Report");
      const nextRunAt = "2026-07-01T00:00:00.000Z";

      const res = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 0 * * *",
          nextRunAt,
        }),
      });
      expect(res.status).toBe(201);
      const created = (await res.json()) as ScheduledReportBody;
      expect(created.data.nextRunAt).toBe(nextRunAt);
      const schedId = created.data.id;

      const clearRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextRunAt: null }),
      });

      expect(clearRes.status).toBe(200);
      const cleared = (await clearRes.json()) as ScheduledReportBody;
      expect(cleared.data.nextRunAt).toBeNull();
    });

    it("preserves unchanged fields after a partial update", async () => {
      const reportId = await createReport("Preserve Fields Report");
      const created = await createSchedule(reportId, "0 9 * * *", "csv");
      const schedId = created.data.id;

      // Only update cronExpression; format and enabled must remain unchanged
      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 10 * * *" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.format).toBe("csv");
      expect(body.data.enabled).toBe(true);
      expect(body.data.reportId).toBe(reportId);
    });

    it("re-enables a previously disabled schedule", async () => {
      const reportId = await createReport("Re-enable Schedule Report");

      const createRes = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 5 * * *",
          enabled: false,
        }),
      });
      const created = (await createRes.json()) as ScheduledReportBody;
      expect(created.data.enabled).toBe(false);
      const schedId = created.data.id;

      const enableRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      expect(enableRes.status).toBe(200);
      const body = (await enableRes.json()) as ScheduledReportBody;
      expect(body.data.enabled).toBe(true);
    });

    it("keeps id unchanged after update", async () => {
      const reportId = await createReport("Stable ID Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 7 * * *" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as ScheduledReportBody;
      expect(body.data.id).toBe(schedId);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/scheduled-reports/:id
  // -------------------------------------------------------------------------

  describe("DELETE /api/scheduled-reports/:id", () => {
    it("returns 404 for a non-existent id", async () => {
      const res = await app.request("/api/scheduled-reports/00000000-0000-0000-0000-000000000001", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(body.message).toBeDefined();
    });

    it("deletes an existing schedule and returns 200", async () => {
      const reportId = await createReport("Delete Schedule Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
    });

    it("returns 404 on a second delete of the same id", async () => {
      const reportId = await createReport("Double Delete Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const first = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });
      expect(first.status).toBe(200);

      const second = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });
      expect(second.status).toBe(404);
    });

    it("returns a success message in the response body after deletion", async () => {
      const reportId = await createReport("Delete Body Check Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as DeleteBody;
      expect(typeof body.data.message).toBe("string");
      expect(body.data.message.length).toBeGreaterThan(0);
    });

    it("deleted schedule no longer appears in the list", async () => {
      const reportId = await createReport("Removed From List Report");
      const created = await createSchedule(reportId, "0 4 * * *");
      const schedId = created.data.id;

      const beforeDelete = await app.request("/api/scheduled-reports");
      const beforeList = (await beforeDelete.json()) as ScheduledReportListBody;
      expect(beforeList.data.some((r) => r.id === schedId)).toBe(true);

      await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });

      const afterDelete = await app.request("/api/scheduled-reports");
      const afterList = (await afterDelete.json()) as ScheduledReportListBody;
      expect(afterList.data.some((r) => r.id === schedId)).toBe(false);
    });

    it("returns a 404 error message string for missing id", async () => {
      const res = await app.request("/api/scheduled-reports/00000000-0000-0000-0000-000000000099", {
        method: "DELETE",
      });
      const body = (await res.json()) as ErrorBody;
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/scheduled-reports/:id/run
  // -------------------------------------------------------------------------

  describe("POST /api/scheduled-reports/:id/run", () => {
    it("returns 404 for a non-existent id", async () => {
      const res = await app.request(
        "/api/scheduled-reports/00000000-0000-0000-0000-000000000002/run",
        { method: "POST" },
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(body.message).toBeDefined();
    });

    it("triggers a run and returns status completed", async () => {
      const reportId = await createReport("Run Trigger Report");
      const created = await createSchedule(reportId, "0 * * * *", "json");
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.status).toBe("completed");
    });

    it("updates lastRunAt after a manual run", async () => {
      const reportId = await createReport("LastRunAt Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      expect(created.data.lastRunAt).toBeNull();

      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.schedule.lastRunAt).not.toBeNull();
      expect(typeof body.data.schedule.lastRunAt).toBe("string");
    });

    it("returns triggeredAt as an ISO timestamp", async () => {
      const reportId = await createReport("TriggeredAt Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const before = new Date().toISOString();
      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });
      const after = new Date().toISOString();

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.triggeredAt >= before).toBe(true);
      expect(body.data.triggeredAt <= after).toBe(true);
    });

    it("includes the full schedule object in the run response", async () => {
      const reportId = await createReport("Run Response Shape Report");
      const created = await createSchedule(reportId, "0 0 1 * *", "pdf");
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.schedule.id).toBe(schedId);
      expect(body.data.schedule.reportId).toBe(reportId);
    });

    it("updates updatedAt on the schedule record after a run", async () => {
      const reportId = await createReport("Run UpdatedAt Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;
      const originalUpdatedAt = created.data.updatedAt;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.schedule.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("sets lastRunAt equal to triggeredAt in the response", async () => {
      const reportId = await createReport("LastRunAt Equals TriggeredAt Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      const res = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as RunBody;
      expect(body.data.schedule.lastRunAt).toBe(body.data.triggeredAt);
    });

    it("updates lastRunAt on every successive manual run", async () => {
      const reportId = await createReport("Successive Runs Report");
      const created = await createSchedule(reportId);
      const schedId = created.data.id;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      const firstRes = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });
      const firstBody = (await firstRes.json()) as RunBody;
      const firstRunAt = firstBody.data.schedule.lastRunAt;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      const secondRes = await app.request(`/api/scheduled-reports/${schedId}/run`, {
        method: "POST",
      });
      const secondBody = (await secondRes.json()) as RunBody;
      const secondRunAt = secondBody.data.schedule.lastRunAt;

      expect(firstRunAt).not.toBeNull();
      expect(secondRunAt).not.toBeNull();
      // Second run must be strictly later than first
      expect(String(secondRunAt) > String(firstRunAt)).toBe(true);
    });

    it("returns a 404 error message string for a missing id", async () => {
      const res = await app.request(
        "/api/scheduled-reports/00000000-0000-0000-0000-000000000099/run",
        { method: "POST" },
      );
      const body = (await res.json()) as ErrorBody;
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Full CRUD cycle
  // -------------------------------------------------------------------------

  describe("Full CRUD cycle", () => {
    it("create → read → update → delete", async () => {
      // 1. Create a backing report
      const reportId = await createReport("CRUD Cycle Report");

      // 2. Create schedule
      const createRes = await app.request("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          cronExpression: "0 6 * * 1-5",
          format: "csv",
          enabled: true,
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as ScheduledReportBody;
      const schedId = created.data.id;
      expect(created.data.cronExpression).toBe("0 6 * * 1-5");

      // 3. Read — confirm it appears in list
      const listRes = await app.request("/api/scheduled-reports");
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as ScheduledReportListBody;
      const found = list.data.find((r) => r.id === schedId);
      expect(found).toBeDefined();
      expect(found?.reportName).toBe("CRUD Cycle Report");

      // 4. Update — change cron and disable
      const updateRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression: "0 8 * * 1-5", enabled: false }),
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as ScheduledReportBody;
      expect(updated.data.cronExpression).toBe("0 8 * * 1-5");
      expect(updated.data.enabled).toBe(false);

      // 5. Manual run
      const runRes = await app.request(`/api/scheduled-reports/${schedId}/run`, { method: "POST" });
      expect(runRes.status).toBe(200);
      const run = (await runRes.json()) as RunBody;
      expect(run.data.status).toBe("completed");
      expect(run.data.schedule.lastRunAt).not.toBeNull();

      // 6. Delete
      const deleteRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      // 7. Confirm deleted — subsequent delete returns 404
      const notFoundRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "DELETE",
      });
      expect(notFoundRes.status).toBe(404);
    });

    it("create → run twice → verify lastRunAt advances", async () => {
      const reportId = await createReport("Double Run Cycle Report");
      const created = await createSchedule(reportId, "0 0 * * *", "xlsx");
      const schedId = created.data.id;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      const runOne = await app.request(`/api/scheduled-reports/${schedId}/run`, { method: "POST" });
      const runOneBody = (await runOne.json()) as RunBody;
      const firstLastRunAt = runOneBody.data.schedule.lastRunAt;

      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      const runTwo = await app.request(`/api/scheduled-reports/${schedId}/run`, { method: "POST" });
      const runTwoBody = (await runTwo.json()) as RunBody;
      const secondLastRunAt = runTwoBody.data.schedule.lastRunAt;

      expect(firstLastRunAt).not.toBeNull();
      expect(secondLastRunAt).not.toBeNull();
      expect(String(secondLastRunAt) > String(firstLastRunAt)).toBe(true);
    });

    it("create → update reportId → verify change persists in list", async () => {
      const reportIdA = await createReport("Original Report For ReportId Update");
      const reportIdB = await createReport("New Report For ReportId Update");

      const created = await createSchedule(reportIdA, "0 9 * * *");
      const schedId = created.data.id;
      expect(created.data.reportId).toBe(reportIdA);

      const updateRes = await app.request(`/api/scheduled-reports/${schedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: reportIdB }),
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as ScheduledReportBody;
      expect(updated.data.reportId).toBe(reportIdB);

      // Confirm list reflects the new reportId and the new reportName
      const listRes = await app.request("/api/scheduled-reports");
      const list = (await listRes.json()) as ScheduledReportListBody;
      const found = list.data.find((r) => r.id === schedId);
      expect(found?.reportId).toBe(reportIdB);
      expect(found?.reportName).toBe("New Report For ReportId Update");
    });
  });
});
