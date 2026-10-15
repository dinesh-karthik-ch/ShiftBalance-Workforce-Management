const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "src", "App.jsx"), "utf8");

test("destructive API routes are present and protected", () => {
  assert.match(server, /app\.delete\("\/api\/employees\/:id", requireAuth, requireRole\("manager"\)/);
  assert.match(server, /app\.delete\("\/api\/shifts\/templates\/:id", requireAuth, requireRole\("manager"\)/);
  assert.match(server, /app\.delete\("\/api\/shifts\/:id", requireAuth, requireRole\("manager"\)/);
  assert.match(server, /app\.delete\("\/api\/attendance\/:shiftId\/:employeeId", requireAuth, requireRole\("manager"\)/);
  assert.match(server, /app\.delete\("\/api\/notifications\/:id", requireAuth/);
  assert.match(server, /app\.delete\("\/api\/leave\/:id", requireAuth/);
  assert.match(server, /app\.delete\("\/api\/availability\/:id", requireAuth/);
});

test("employee deletion protects the signed-in manager and last active manager", () => {
  assert.match(server, /You cannot delete your own manager account/);
  assert.match(server, /The last active manager cannot be deleted/);
});

test("leave deletion limits employee deletion to their own pending request", () => {
  assert.match(server, /You can only delete your own leave request/);
  assert.match(server, /Only pending leave requests can be deleted by an employee/);
});

test("UI exposes confirmed deletion for core records", () => {
  for (const handler of [
    "handleDeleteEmployee",
    "handleDeleteAvailability",
    "handleDeleteLeaveRequest",
    "handleDeleteShiftTemplate",
    "handleDeleteShift",
    "handleDeleteAttendanceRecord",
    "handleDeleteNotification",
  ]) {
    assert.ok(app.includes(handler), `Missing UI handler: ${handler}`);
  }
  assert.match(app, /Permanently delete \$\{employee\.name\}/);
  assert.match(app, /handleDeleteShift\(shift\)/);
});
