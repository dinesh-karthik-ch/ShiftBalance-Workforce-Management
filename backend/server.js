const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Employee = require("./models/Employee");
const Availability = require("./models/Availability");
const LeaveRequest = require("./models/LeaveRequest");
const ShiftTemplate = require("./models/ShiftTemplate");
const ShiftAssignment = require("./models/ShiftAssignment");
const Attendance = require("./models/Attendance");
const Notification = require("./models/Notification");
const { requireAuth, requireRole } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_LIFETIME = "8h";

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const validTime = (time) => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const validDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const asPublicEmployee = (employee) => employee ? employee.toJSON() : null;

app.disable("x-powered-by");
const allowedOrigins = (process.env.FRONTEND_URL || "").split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS."));
} }));
app.use(express.json({ limit: "100kb" }));

async function createNotifications(recipientIds, { title, body, type = "general", relatedId = null }) {
  const recipients = [...new Set((recipientIds || []).filter(Boolean).map((id) => id.toString()))];
  if (!recipients.length) return;
  try {
    await Notification.insertMany(recipients.map((recipient) => ({ recipient, title, body, type, relatedId })));
  } catch (error) {
    // A secondary notification failure must never turn a successful primary action into a false API failure.
    console.error("Notification creation failed:", error.message);
  }
}

app.get("/", (_req, res) => res.status(200).send("ShiftBalance backend is running!"));

// AUTHENTICATION -------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const employee = await Employee.findOne({ email }).select("+passwordHash");
    // Use the same message when an account is missing or the password is incorrect.
    if (!employee || !employee.passwordHash || !(await bcrypt.compare(password, employee.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (employee.isActive === false) {
      return res.status(403).json({ message: "This account is inactive. Contact a manager." });
    }
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
      console.error("JWT_SECRET is missing or too short.");
      return res.status(500).json({ message: "Authentication is not configured on the server." });
    }

    const token = jwt.sign({ sub: employee._id.toString() }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
    return res.status(200).json({
      message: "Login successful.",
      token,
      expiresIn: TOKEN_LIFETIME,
      user: asPublicEmployee(employee),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.status(200).json(asPublicEmployee(req.user));
});

app.post("/api/auth/logout", requireAuth, (_req, res) => {
  // JWTs are stateless; the frontend removes the token on logout.
  res.status(200).json({ message: "Logged out. Remove the access token from this client." });
});

// EMPLOYEE MANAGEMENT: manager-only list/create/update/status; users can view self.
app.get("/api/employees", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Status must be either active or inactive." });
    }
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "inactive") filter.isActive = false;
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(employees);
  } catch (error) {
    console.error("Error retrieving employees:", error.message);
    return res.status(500).json({ message: "Failed to retrieve employees." });
  }
});

app.get("/api/employees/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    if (req.user.role !== "manager" && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "You can only view your own employee profile." });
    }
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    return res.status(200).json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error.message);
    return res.status(500).json({ message: "Failed to retrieve employee." });
  }
});

app.put("/api/employees/:id", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    const { name, email, role, department } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Name cannot be empty." });
      updates.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) return res.status(400).json({ message: "Email cannot be empty." });
      updates.email = email.trim().toLowerCase();
    }
    if (role !== undefined) {
      if (!["employee", "manager"].includes(role)) return res.status(400).json({ message: "Role must be employee or manager." });
      updates.role = role;
    }
    if (department !== undefined) {
      if (typeof department !== "string" || !department.trim()) return res.status(400).json({ message: "Department cannot be empty." });
      updates.department = department.trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide at least one field to update." });

    const employee = await Employee.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    return res.status(200).json(employee);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An employee with this email already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error updating employee:", error.message);
    return res.status(500).json({ message: "Failed to update employee." });
  }
});

app.post("/api/employees", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Name and email are required." });
    }
    const employee = await Employee.create({
      name: name.trim(), email: email.trim().toLowerCase(), role, department, isActive: true,
    });
    return res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An employee with this email already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error adding employee:", error.message);
    return res.status(500).json({ message: "Failed to add employee." });
  }
});

app.delete("/api/employees/:id", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    if (req.user._id.toString() === id) return res.status(409).json({ message: "You cannot delete your own manager account." });

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (employee.role === "manager") {
      const activeManagers = await Employee.countDocuments({ role: "manager", isActive: { $ne: false } });
      if (employee.isActive !== false && activeManagers <= 1) {
        return res.status(409).json({ message: "The last active manager cannot be deleted. Promote another active manager first." });
      }
    }

    // Explicit deletion cleans up dependent records and removes the employee from
    // remaining schedules. The UI requires confirmation because this is irreversible.
    await Promise.all([
      Availability.deleteMany({ employee: id }),
      LeaveRequest.deleteMany({ employee: id }),
      Attendance.deleteMany({ employee: id }),
      Notification.deleteMany({ recipient: id }),
      ShiftAssignment.updateMany({ assignedEmployees: id }, { $pull: { assignedEmployees: id } }),
    ]);
    await employee.deleteOne();
    return res.status(200).json({ message: "Employee and associated personal records deleted. Remaining shifts were retained and may now need staffing." });
  } catch (error) {
    console.error("Error deleting employee:", error.message);
    return res.status(500).json({ message: "Failed to delete employee." });
  }
});

app.patch("/api/employees/:id/status", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean (true or false)." });

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (employee._id.equals(req.user._id) && !isActive) {
      return res.status(400).json({ message: "Managers cannot deactivate their own account from this endpoint." });
    }

    employee.isActive = isActive;
    await employee.save();
    let availabilityFlaggedForReview = 0;
    if (!isActive) {
      const result = await Availability.updateMany({ employee: employee._id }, { $set: { needsReview: true } });
      availabilityFlaggedForReview = result.modifiedCount ?? 0;
    }
    return res.status(200).json({
      message: isActive
        ? "Employee reactivated. Review existing availability before scheduling."
        : "Employee deactivated. Existing availability was retained and flagged for review.",
      employee,
      availabilityFlaggedForReview,
    });
  } catch (error) {
    console.error("Error changing employee status:", error.message);
    return res.status(500).json({ message: "Failed to change employee status." });
  }
});

// AVAILABILITY: managers can manage all records; employees can manage their own.
app.get("/api/availability", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "manager") {
      if (req.query.employeeId) {
        if (!mongoose.isValidObjectId(req.query.employeeId)) return res.status(400).json({ message: "Invalid employee ID." });
        filter.employee = req.query.employeeId;
      }
    } else {
      if (req.query.employeeId && req.query.employeeId !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only view your own availability." });
      }
      filter.employee = req.user._id;
    }
    const records = await Availability.find(filter).populate("employee", "name email isActive").sort({ day: 1 });
    return res.status(200).json(records);
  } catch (error) {
    console.error("Error retrieving availability:", error.message);
    return res.status(500).json({ message: "Failed to retrieve availability." });
  }
});

app.post("/api/availability", requireAuth, async (req, res) => {
  try {
    const { day, startTime, endTime } = req.body;
    let { employeeId } = req.body;
    if (req.user.role !== "manager") {
      if (employeeId && employeeId !== req.user._id.toString()) return res.status(403).json({ message: "You can only submit your own availability." });
      employeeId = req.user._id.toString();
    }

    if (!employeeId || !day || !startTime || !endTime) return res.status(400).json({ message: "All fields are required." });
    if (!mongoose.isValidObjectId(employeeId)) return res.status(400).json({ message: "Invalid employee ID." });
    if (!VALID_DAYS.includes(day)) return res.status(400).json({ message: "Invalid day." });
    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
      return res.status(400).json({ message: "Enter valid times in HH:mm format; end time must be later than start time." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (employee.isActive === false) return res.status(409).json({ message: "Cannot submit availability for an inactive employee. Reactivate the employee first." });
    const record = await Availability.create({ employee: employeeId, day, startTime, endTime, needsReview: false });
    return res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Availability for this employee and day already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error submitting availability:", error.message);
    return res.status(500).json({ message: "Failed to submit availability." });
  }
});

app.put("/api/availability/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid availability ID." });
    const existingRecord = await Availability.findById(id);
    if (!existingRecord) return res.status(404).json({ message: "Availability record not found." });
    if (req.user.role !== "manager" && !existingRecord.employee.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own availability." });
    }

    const { day, startTime, endTime } = req.body;
    let { employeeId } = req.body;
    if (!employeeId) employeeId = existingRecord.employee.toString();
    if (req.user.role !== "manager" && employeeId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot reassign availability to another employee." });
    }
    if (!employeeId || !day || !startTime || !endTime) return res.status(400).json({ message: "All fields are required." });
    if (!mongoose.isValidObjectId(employeeId)) return res.status(400).json({ message: "Invalid employee ID." });
    if (!VALID_DAYS.includes(day)) return res.status(400).json({ message: "Invalid day." });
    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
      return res.status(400).json({ message: "Enter valid times in HH:mm format; end time must be later than start time." });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (employee.isActive === false) return res.status(409).json({ message: "Cannot update availability for an inactive employee. Reactivate the employee first." });

    const updatedRecord = await Availability.findByIdAndUpdate(id, {
      $set: { employee: employeeId, day, startTime, endTime, needsReview: false },
    }, { new: true, runValidators: true });
    return res.status(200).json({ message: "Availability updated successfully.", availability: updatedRecord });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Availability for this employee and day already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error updating availability:", error.message);
    return res.status(500).json({ message: "Failed to update availability." });
  }
});

app.delete("/api/availability/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid availability ID." });
    const record = await Availability.findById(id);
    if (!record) return res.status(404).json({ message: "Availability record not found." });
    if (req.user.role !== "manager" && !record.employee.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own availability." });
    }
    await record.deleteOne();
    return res.status(200).json({ message: "Availability deleted successfully.", deletedAvailabilityId: record._id.toString() });
  } catch (error) {
    console.error("Error deleting availability:", error.message);
    return res.status(500).json({ message: "Failed to delete availability." });
  }
});

// LEAVE MANAGEMENT -----------------------------------------------------------
app.get("/api/leave", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== "manager") filter.employee = req.user._id;
    if (req.query.status) {
      if (!["pending", "approved", "rejected"].includes(req.query.status)) {
        return res.status(400).json({ message: "Status must be pending, approved, or rejected." });
      }
      filter.status = req.query.status;
    }
    const requests = await LeaveRequest.find(filter)
      .populate("employee", "name email role")
      .populate("decisionBy", "name email role")
      .sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error retrieving leave requests:", error.message);
    return res.status(500).json({ message: "Failed to retrieve leave requests." });
  }
});

app.post("/api/leave", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!validDateOnly(startDate) || !validDateOnly(endDate)) {
      return res.status(400).json({ message: "Start date and end date must be valid dates in YYYY-MM-DD format." });
    }
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    if (end < start) return res.status(400).json({ message: "End date must be on or after the start date." });
    if (typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 500) {
      return res.status(400).json({ message: "Reason must be between 5 and 500 characters." });
    }
    if (req.user.isActive === false) return res.status(403).json({ message: "Inactive employees cannot request leave." });

    const overlap = await LeaveRequest.findOne({
      employee: req.user._id,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (overlap) return res.status(409).json({ message: "You already have a pending or approved leave request that overlaps these dates." });

    const leaveRequest = await LeaveRequest.create({ employee: req.user._id, startDate: start, endDate: end, reason: reason.trim() });
    await leaveRequest.populate("employee", "name email role");
    return res.status(201).json({ message: "Leave request submitted successfully.", leaveRequest });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error submitting leave request:", error.message);
    return res.status(500).json({ message: "Failed to submit leave request." });
  }
});

app.delete("/api/leave/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid leave request ID." });
    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Leave request not found." });
    if (req.user.role !== "manager") {
      if (!request.employee.equals(req.user._id)) return res.status(403).json({ message: "You can only delete your own leave request." });
      if (request.status !== "pending") return res.status(409).json({ message: "Only pending leave requests can be deleted by an employee. Contact a manager to correct a reviewed request." });
    }
    await Promise.all([
      request.deleteOne(),
      Notification.deleteMany({ relatedId: request._id }),
    ]);
    return res.status(200).json({ message: "Leave request deleted successfully." });
  } catch (error) {
    console.error("Error deleting leave request:", error.message);
    return res.status(500).json({ message: "Failed to delete leave request." });
  }
});

app.patch("/api/leave/:id/decision", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerNote = "" } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid leave request ID." });
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Decision status must be approved or rejected." });
    if (typeof managerNote !== "string" || managerNote.length > 500) return res.status(400).json({ message: "Manager note must be 500 characters or fewer." });

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) return res.status(404).json({ message: "Leave request not found." });
    if (leaveRequest.status !== "pending") return res.status(409).json({ message: "Only pending leave requests can be reviewed." });

    leaveRequest.status = status;
    leaveRequest.managerNote = managerNote.trim();
    leaveRequest.decisionBy = req.user._id;
    leaveRequest.decisionAt = new Date();
    await leaveRequest.save();
    await leaveRequest.populate("employee", "name email role");
    await leaveRequest.populate("decisionBy", "name email role");
    await createNotifications([leaveRequest.employee?._id], {
      title: `Leave request ${status}`,
      body: `Your leave request for ${toDateKey(leaveRequest.startDate)} to ${toDateKey(leaveRequest.endDate)} was ${status} by ${req.user.name}.`,
      type: "leave",
      relatedId: leaveRequest._id,
    });
    return res.status(200).json({ message: `Leave request ${status}.`, leaveRequest });
  } catch (error) {
    console.error("Error deciding leave request:", error.message);
    return res.status(500).json({ message: "Failed to process leave decision." });
  }
});


// SHIFT SCHEDULING -----------------------------------------------------------
// A template defines reusable shift hours and minimum staffing. Managers own
// template changes and weekly schedule generation; employees can only see shifts
// assigned to their own account.
const validShiftTemplateInput = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const { startTime, endTime, daysOfWeek, requiredStaff } = body;
  if (name.length < 2 || name.length > 60) return "Shift name must be between 2 and 60 characters.";
  if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
    return "Enter valid shift times in HH:mm format; end time must be later than start time.";
  }
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || daysOfWeek.some((day) => !VALID_DAYS.includes(day))) {
    return "Choose at least one valid day for this shift.";
  }
  if (!Number.isInteger(Number(requiredStaff)) || Number(requiredStaff) < 1 || Number(requiredStaff) > 100) {
    return "Required staff must be a whole number from 1 to 100.";
  }
  return null;
};

const isMondayDate = (value) => {
  if (!validDateOnly(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1;
};
const plusUtcDays = (value, days) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const weekdayForDate = (value) => VALID_DAYS[(new Date(`${value}T00:00:00.000Z`).getUTCDay() + 6) % 7];
const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

app.get("/api/shifts/templates", requireAuth, requireRole("manager"), async (_req, res) => {
  try {
    const templates = await ShiftTemplate.find().sort({ active: -1, name: 1 });
    return res.status(200).json(templates);
  } catch (error) {
    console.error("Error retrieving shift templates:", error.message);
    return res.status(500).json({ message: "Failed to retrieve shift templates." });
  }
});

app.post("/api/shifts/templates", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const validationError = validShiftTemplateInput(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const template = await ShiftTemplate.create({
      name: req.body.name.trim(),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      daysOfWeek: [...new Set(req.body.daysOfWeek)],
      requiredStaff: Number(req.body.requiredStaff),
      active: true,
      createdBy: req.user._id,
    });
    return res.status(201).json({ message: "Shift template created successfully.", template });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A shift template with this name already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error creating shift template:", error.message);
    return res.status(500).json({ message: "Failed to create shift template." });
  }
});

app.put("/api/shifts/templates/:id", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid shift template ID." });
    const validationError = validShiftTemplateInput(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const template = await ShiftTemplate.findByIdAndUpdate(req.params.id, { $set: {
      name: req.body.name.trim(),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      daysOfWeek: [...new Set(req.body.daysOfWeek)],
      requiredStaff: Number(req.body.requiredStaff),
    } }, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: "Shift template not found." });
    return res.status(200).json({ message: "Shift template updated successfully.", template });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A shift template with this name already exists." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error updating shift template:", error.message);
    return res.status(500).json({ message: "Failed to update shift template." });
  }
});

app.patch("/api/shifts/templates/:id/status", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid shift template ID." });
    if (typeof req.body.active !== "boolean") return res.status(400).json({ message: "active must be true or false." });
    const template = await ShiftTemplate.findByIdAndUpdate(req.params.id, { $set: { active: req.body.active } }, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: "Shift template not found." });
    return res.status(200).json({ message: req.body.active ? "Shift template activated." : "Shift template deactivated.", template });
  } catch (error) {
    console.error("Error changing shift template status:", error.message);
    return res.status(500).json({ message: "Failed to change shift template status." });
  }
});

app.delete("/api/shifts/templates/:id", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid shift template ID." });
    const template = await ShiftTemplate.findById(id);
    if (!template) return res.status(404).json({ message: "Shift template not found." });

    const shifts = await ShiftAssignment.find({ template: id });
    const shiftIds = shifts.map((shift) => shift._id);
    const recipients = shifts.filter((shift) => shift.published).flatMap((shift) => shift.assignedEmployees.map((employeeId) => employeeId.toString()));
    if (shiftIds.length) {
      await Attendance.deleteMany({ shiftAssignment: { $in: shiftIds } });
      await ShiftAssignment.deleteMany({ _id: { $in: shiftIds } });
    }
    await template.deleteOne();
    await createNotifications(recipients, {
      title: "Shift cancelled",
      body: `The "${template.name}" shift template and its generated shifts were deleted by a manager.`,
      type: "schedule",
    });
    return res.status(200).json({ message: "Shift template and its generated shifts deleted successfully.", deletedShifts: shiftIds.length });
  } catch (error) {
    console.error("Error deleting shift template:", error.message);
    return res.status(500).json({ message: "Failed to delete shift template." });
  }
});

app.get("/api/shifts", requireAuth, async (req, res) => {
  try {
    const weekStart = req.query.weekStart;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "weekStart must be a valid Monday date in YYYY-MM-DD format." });
    const filter = { weekStart };
    if (req.user.role !== "manager") {
      filter.assignedEmployees = req.user._id;
      filter.published = true;
    }
    const shifts = await ShiftAssignment.find(filter)
      .populate("assignedEmployees", "name email role department")
      .populate("generatedBy", "name email")
      .sort({ date: 1, startTime: 1, shiftName: 1 });
    return res.status(200).json(shifts);
  } catch (error) {
    console.error("Error retrieving shift schedule:", error.message);
    return res.status(500).json({ message: "Failed to retrieve shift schedule." });
  }
});

app.delete("/api/shifts/:id", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid shift assignment ID." });
    const shift = await ShiftAssignment.findById(id);
    if (!shift) return res.status(404).json({ message: "Shift assignment not found." });
    const recipients = shift.published ? shift.assignedEmployees.map((employeeId) => employeeId.toString()) : [];
    await Promise.all([
      Attendance.deleteMany({ shiftAssignment: shift._id }),
      shift.deleteOne(),
    ]);
    if (recipients.length) {
      await createNotifications(recipients, {
        title: "Shift cancelled",
        body: `Your ${shift.shiftName} shift on ${shift.date} (${shift.startTime}–${shift.endTime}) was cancelled by a manager.`,
        type: "schedule",
      });
    }
    return res.status(200).json({ message: "Shift assignment deleted successfully." });
  } catch (error) {
    console.error("Error deleting shift assignment:", error.message);
    return res.status(500).json({ message: "Failed to delete shift assignment." });
  }
});

app.post("/api/shifts/generate", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { weekStart } = req.body;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "Choose a valid Monday as the week start (YYYY-MM-DD)." });
    const templates = await ShiftTemplate.find({ active: true }).sort({ name: 1 });
    if (templates.length === 0) return res.status(409).json({ message: "Create and activate at least one shift template before generating a schedule." });

    const existingShifts = await ShiftAssignment.find({ weekStart });
    const existingShiftIds = existingShifts.map((shift) => shift._id);
    if (existingShiftIds.length && await Attendance.exists({ shiftAssignment: { $in: existingShiftIds } })) {
      return res.status(409).json({ message: "This week already has attendance records. The schedule cannot be regenerated without preserving those records." });
    }
    const existingWasPublished = existingShifts.some((shift) => shift.published === true);
    const previousEmployeeIds = existingShifts.flatMap((shift) => shift.assignedEmployees.map((id) => id.toString()));

    const weekEnd = plusUtcDays(weekStart, 6);
    const employees = await Employee.find({ role: "employee", isActive: { $ne: false } }).sort({ name: 1 });
    const employeeIds = employees.map((employee) => employee._id);
    const [availabilityRecords, approvedLeaves] = await Promise.all([
      Availability.find({ employee: { $in: employeeIds }, needsReview: { $ne: true } }),
      LeaveRequest.find({ status: "approved", startDate: { $lte: new Date(`${weekEnd}T23:59:59.999Z`) }, endDate: { $gte: new Date(`${weekStart}T00:00:00.000Z`) } }),
    ]);

    const availabilityByEmployeeDay = new Map();
    for (const record of availabilityRecords) {
      availabilityByEmployeeDay.set(`${record.employee.toString()}|${record.day}`, record);
    }
    const leaveDatesByEmployee = new Map();
    for (const leave of approvedLeaves) {
      const id = leave.employee.toString();
      if (!leaveDatesByEmployee.has(id)) leaveDatesByEmployee.set(id, new Set());
      const leaveStart = toDateKey(leave.startDate);
      const leaveEnd = toDateKey(leave.endDate);
      const start = leaveStart < weekStart ? weekStart : leaveStart;
      const end = leaveEnd > weekEnd ? weekEnd : leaveEnd;
      for (let date = start; date <= end; date = plusUtcDays(date, 1)) {
        leaveDatesByEmployee.get(id).add(date);
      }
    }

    // Scheduling rules: only active employee accounts are eligible; availability
    // must cover the full shift; approved leave is excluded; an employee is assigned
    // at most one shift per day; employees with fewer weekly assignments are preferred.
    const assignedDates = new Map();
    const assignmentCount = new Map(employeeIds.map((id) => [id.toString(), 0]));
    const assignedMinutes = new Map(employeeIds.map((id) => [id.toString(), 0]));
    const generatedRecords = [];
    const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

    for (let offset = 0; offset < 7; offset += 1) {
      const date = plusUtcDays(weekStart, offset);
      const day = weekdayForDate(date);
      for (const template of templates.filter((item) => item.daysOfWeek.includes(day))) {
        const candidates = employees.filter((employee) => {
          const employeeId = employee._id.toString();
          const availability = availabilityByEmployeeDay.get(`${employeeId}|${day}`);
          if (!availability || availability.needsReview === true) return false;
          if (availability.startTime > template.startTime || availability.endTime < template.endTime) return false;
          if (leaveDatesByEmployee.get(employeeId)?.has(date)) return false;
          if (assignedDates.get(employeeId)?.has(date)) return false;
          return true;
        }).sort((a, b) => {
          const aId = a._id.toString();
          const bId = b._id.toString();
          return (assignmentCount.get(aId) - assignmentCount.get(bId))
            || (assignedMinutes.get(aId) - assignedMinutes.get(bId))
            || a.name.localeCompare(b.name);
        });

        const chosen = candidates.slice(0, template.requiredStaff);
        for (const employee of chosen) {
          const employeeId = employee._id.toString();
          assignmentCount.set(employeeId, assignmentCount.get(employeeId) + 1);
          assignedMinutes.set(employeeId, assignedMinutes.get(employeeId) + (toMinutes(template.endTime) - toMinutes(template.startTime)));
          if (!assignedDates.has(employeeId)) assignedDates.set(employeeId, new Set());
          assignedDates.get(employeeId).add(date);
        }

        generatedRecords.push({
          template: template._id,
          weekStart,
          date,
          day,
          shiftName: template.name,
          startTime: template.startTime,
          endTime: template.endTime,
          requiredStaff: template.requiredStaff,
          assignedEmployees: chosen.map((employee) => employee._id),
          generatedBy: req.user._id,
        });
      }
    }

    await ShiftAssignment.deleteMany({ weekStart });
    const savedShifts = generatedRecords.length ? await ShiftAssignment.insertMany(generatedRecords) : [];
    const hydratedShifts = await ShiftAssignment.find({ weekStart })
      .populate("assignedEmployees", "name email role department")
      .populate("generatedBy", "name email")
      .sort({ date: 1, startTime: 1, shiftName: 1 });
    const fullyStaffed = savedShifts.filter((shift) => shift.assignedEmployees.length >= shift.requiredStaff).length;
    const understaffed = savedShifts.length - fullyStaffed;
    const assignedCount = savedShifts.reduce((total, shift) => total + shift.assignedEmployees.length, 0);
    if (existingWasPublished) {
      const newEmployeeIds = hydratedShifts.flatMap((shift) => shift.assignedEmployees.map((employee) => employee._id.toString()));
      await createNotifications([...previousEmployeeIds, ...newEmployeeIds], {
        title: "Weekly schedule changed",
        body: `The schedule for the week of ${weekStart} was regenerated. The manager must publish the updated version before it appears in your schedule.`,
        type: "schedule",
      });
    }
    if (understaffed > 0) {
      const managerIds = await Employee.find({ role: "manager", isActive: { $ne: false } }).distinct("_id");
      await createNotifications(managerIds, {
        title: "Schedule has staffing gaps",
        body: `${understaffed} shift slot(s) for the week of ${weekStart} do not meet the required staffing level. Review the conflicts page before publishing.`,
        type: "conflict",
      });
    }
    return res.status(201).json({
      message: "Weekly shift schedule generated using availability, approved leave, and workload balancing rules.",
      weekStart,
      weekEnd,
      totalShifts: savedShifts.length,
      fullyStaffed,
      understaffed,
      assignedCount,
      published: false,
      shifts: hydratedShifts,
    });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error generating weekly schedule:", error.message);
    return res.status(500).json({ message: "Failed to generate weekly schedule." });
  }
});

// PUBLISH WEEKLY SCHEDULE -----------------------------------------------------
app.post("/api/shifts/publish", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { weekStart } = req.body;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "Choose a valid Monday as the week start (YYYY-MM-DD)." });
    const shifts = await ShiftAssignment.find({ weekStart });
    if (!shifts.length) return res.status(409).json({ message: "Generate a schedule before publishing it." });
    const now = new Date();
    await ShiftAssignment.updateMany({ weekStart }, { $set: { published: true, publishedAt: now } });
    const recipients = shifts.flatMap((shift) => shift.assignedEmployees.map((id) => id.toString()));
    await createNotifications(recipients, {
      title: "Weekly schedule published",
      body: `Your shift schedule for the week of ${weekStart} is now available in ShiftBalance.`,
      type: "schedule",
    });
    const published = await ShiftAssignment.find({ weekStart })
      .populate("assignedEmployees", "name email role department")
      .populate("generatedBy", "name email")
      .sort({ date: 1, startTime: 1, shiftName: 1 });
    return res.status(200).json({ message: "Weekly schedule published and assigned employees notified.", weekStart, publishedAt: now, notifiedEmployees: new Set(recipients).size, shifts: published });
  } catch (error) {
    console.error("Error publishing weekly schedule:", error.message);
    return res.status(500).json({ message: "Failed to publish weekly schedule." });
  }
});

// NOTIFICATIONS --------------------------------------------------------------
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error retrieving notifications:", error.message);
    return res.status(500).json({ message: "Failed to retrieve notifications." });
  }
});

app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid notification ID." });
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    return res.status(200).json({ message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    return res.status(500).json({ message: "Failed to delete notification." });
  }
});

app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    return res.status(200).json({ message: "Notifications marked as read.", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking notifications as read:", error.message);
    return res.status(500).json({ message: "Failed to update notifications." });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid notification ID." });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    return res.status(200).json({ message: "Notification marked as read.", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error.message);
    return res.status(500).json({ message: "Failed to update notification." });
  }
});

// CONFLICT DETECTION ----------------------------------------------------------
app.get("/api/conflicts", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const weekStart = req.query.weekStart;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "weekStart must be a valid Monday date in YYYY-MM-DD format." });
    const weekEnd = plusUtcDays(weekStart, 6);
    const shifts = await ShiftAssignment.find({ weekStart }).populate("assignedEmployees", "name email role isActive department").sort({ date: 1, startTime: 1 });
    const employees = shifts.flatMap((shift) => shift.assignedEmployees).filter(Boolean);
    const employeeMap = new Map(employees.map((employee) => [employee._id.toString(), employee]));
    const employeeIds = [...employeeMap.keys()];
    const [availabilityRecords, leaves] = await Promise.all([
      Availability.find({ employee: { $in: employeeIds } }),
      LeaveRequest.find({ status: "approved", employee: { $in: employeeIds }, startDate: { $lte: new Date(`${weekEnd}T23:59:59.999Z`) }, endDate: { $gte: new Date(`${weekStart}T00:00:00.000Z`) } }),
    ]);
    const availabilityMap = new Map(availabilityRecords.map((record) => [`${record.employee.toString()}|${record.day}`, record]));
    const leaveDateMap = new Set();
    for (const leave of leaves) {
      const from = toDateKey(leave.startDate) < weekStart ? weekStart : toDateKey(leave.startDate);
      const to = toDateKey(leave.endDate) > weekEnd ? weekEnd : toDateKey(leave.endDate);
      for (let date = from; date <= to; date = plusUtcDays(date, 1)) leaveDateMap.add(`${leave.employee.toString()}|${date}`);
    }
    const conflicts = [];
    const addConflict = (item) => conflicts.push({ id: `${item.type}:${item.shiftId || "none"}:${item.employeeId || "none"}:${item.otherShiftId || "none"}`, ...item });
    for (const shift of shifts) {
      if (shift.assignedEmployees.length < shift.requiredStaff) addConflict({
        type: "understaffed", severity: "high", shiftId: shift._id.toString(), date: shift.date, shiftName: shift.shiftName,
        message: `${shift.shiftName} needs ${shift.requiredStaff - shift.assignedEmployees.length} more employee(s).`,
      });
      for (const employee of shift.assignedEmployees) {
        const employeeId = employee._id.toString();
        if (employee.role !== "employee" || employee.isActive === false) addConflict({
          type: "inactive-employee", severity: "high", shiftId: shift._id.toString(), employeeId, employeeName: employee.name, date: shift.date, shiftName: shift.shiftName,
          message: `${employee.name} is not an active employee eligible for scheduling.`,
        });
        const availability = availabilityMap.get(`${employeeId}|${shift.day}`);
        if (!availability || availability.needsReview || availability.startTime > shift.startTime || availability.endTime < shift.endTime) addConflict({
          type: "availability", severity: "high", shiftId: shift._id.toString(), employeeId, employeeName: employee.name, date: shift.date, shiftName: shift.shiftName,
          message: `${employee.name}'s availability does not cover ${shift.startTime}–${shift.endTime} on ${shift.day}.`,
        });
        if (leaveDateMap.has(`${employeeId}|${shift.date}`)) addConflict({
          type: "approved-leave", severity: "high", shiftId: shift._id.toString(), employeeId, employeeName: employee.name, date: shift.date, shiftName: shift.shiftName,
          message: `${employee.name} is assigned during approved leave.`,
        });
      }
    }
    const byEmployeeDate = new Map();
    for (const shift of shifts) {
      for (const employee of shift.assignedEmployees) {
        const key = `${employee._id.toString()}|${shift.date}`;
        if (!byEmployeeDate.has(key)) byEmployeeDate.set(key, []);
        byEmployeeDate.get(key).push({ shift, employee });
      }
    }
    for (const entries of byEmployeeDate.values()) {
      for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i].shift;
        const b = entries[j].shift;
        if (a.startTime < b.endTime && b.startTime < a.endTime) addConflict({
          type: "overlap", severity: "high", shiftId: a._id.toString(), otherShiftId: b._id.toString(), employeeId: entries[i].employee._id.toString(), employeeName: entries[i].employee.name,
          date: a.date, shiftName: `${a.shiftName} / ${b.shiftName}`, message: `${entries[i].employee.name} is assigned overlapping shifts (${a.startTime}–${a.endTime} and ${b.startTime}–${b.endTime}).`,
        });
      }
    }
    return res.status(200).json({ weekStart, weekEnd, total: conflicts.length, conflicts });
  } catch (error) {
    console.error("Error detecting schedule conflicts:", error.message);
    return res.status(500).json({ message: "Failed to detect scheduling conflicts." });
  }
});

// ATTENDANCE -----------------------------------------------------------------
app.get("/api/attendance", requireAuth, async (req, res) => {
  try {
    const weekStart = req.query.weekStart;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "weekStart must be a valid Monday date in YYYY-MM-DD format." });
    const weekEnd = plusUtcDays(weekStart, 6);
    const filter = { weekStart, date: { $gte: weekStart, $lte: weekEnd } };
    if (req.user.role !== "manager") filter.employee = req.user._id;
    const records = await Attendance.find(filter)
      .populate("employee", "name email role department")
      .populate("shiftAssignment", "date day shiftName startTime endTime")
      .populate("recordedBy", "name email")
      .sort({ date: -1, shiftName: 1 });
    return res.status(200).json(records);
  } catch (error) {
    console.error("Error retrieving attendance:", error.message);
    return res.status(500).json({ message: "Failed to retrieve attendance records." });
  }
});

app.patch("/api/attendance/:shiftId/:employeeId", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { shiftId, employeeId } = req.params;
    const { status, note = "" } = req.body;
    if (!mongoose.isValidObjectId(shiftId) || !mongoose.isValidObjectId(employeeId)) return res.status(400).json({ message: "Invalid shift or employee ID." });
    if (!["present", "late", "absent"].includes(status)) return res.status(400).json({ message: "Status must be present, late, or absent." });
    if (typeof note !== "string" || note.length > 500) return res.status(400).json({ message: "Note must be 500 characters or fewer." });
    const shift = await ShiftAssignment.findById(shiftId);
    if (!shift) return res.status(404).json({ message: "Shift assignment not found." });
    if (shift.published !== true) return res.status(409).json({ message: "Publish this week's schedule before recording attendance." });
    if (!shift.assignedEmployees.some((id) => id.toString() === employeeId)) return res.status(400).json({ message: "The selected employee is not assigned to this shift." });
    const checkInAt = status === "absent" ? null : new Date();
    const record = await Attendance.findOneAndUpdate(
      { shiftAssignment: shift._id, employee: employeeId },
      { $set: { weekStart: shift.weekStart, date: shift.date, shiftName: shift.shiftName, status, note: note.trim(), recordedBy: req.user._id, recordedAt: new Date(), checkInAt, checkOutAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("employee", "name email role department").populate("recordedBy", "name email");
    await createNotifications([employeeId], {
      title: "Attendance recorded",
      body: `Your attendance for ${shift.date} (${shift.shiftName}) was recorded as ${status}.`,
      type: "attendance",
      relatedId: record._id,
    });
    return res.status(200).json({ message: "Attendance saved successfully.", record });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Error recording attendance:", error.message);
    return res.status(500).json({ message: "Failed to record attendance." });
  }
});

// REPORTS --------------------------------------------------------------------
app.delete("/api/attendance/:shiftId/:employeeId", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const { shiftId, employeeId } = req.params;
    if (!mongoose.isValidObjectId(shiftId) || !mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ message: "Invalid shift or employee ID." });
    }
    const record = await Attendance.findOneAndDelete({ shiftAssignment: shiftId, employee: employeeId });
    if (!record) return res.status(404).json({ message: "Attendance record not found." });
    await Notification.deleteMany({ relatedId: record._id });
    return res.status(200).json({ message: "Attendance record deleted. It can be recorded again if needed." });
  } catch (error) {
    console.error("Error deleting attendance record:", error.message);
    return res.status(500).json({ message: "Failed to delete attendance record." });
  }
});

app.get("/api/reports", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const weekStart = req.query.weekStart;
    if (!isMondayDate(weekStart)) return res.status(400).json({ message: "weekStart must be a valid Monday date in YYYY-MM-DD format." });
    const weekEnd = plusUtcDays(weekStart, 6);
    const [shifts, attendance, activeEmployees, leaves] = await Promise.all([
      ShiftAssignment.find({ weekStart }).populate("assignedEmployees", "name email role department"),
      Attendance.find({ weekStart, date: { $gte: weekStart, $lte: weekEnd } }).populate("employee", "name email role department"),
      Employee.find({ role: "employee", isActive: { $ne: false } }).select("name email department"),
      LeaveRequest.find({ startDate: { $lte: new Date(`${weekEnd}T23:59:59.999Z`) }, endDate: { $gte: new Date(`${weekStart}T00:00:00.000Z`) } }),
    ]);
    const workloadMap = new Map(activeEmployees.map((employee) => [employee._id.toString(), {
      employeeId: employee._id.toString(), name: employee.name, email: employee.email, department: employee.department || "General",
      assignedShifts: 0, scheduledMinutes: 0, present: 0, late: 0, absent: 0, attendanceMarked: 0,
    }]));
    const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    let requiredAssignments = 0;
    let assignedAssignments = 0;
    let understaffedShifts = 0;
      for (const shift of shifts) {
      requiredAssignments += shift.requiredStaff;
      assignedAssignments += shift.assignedEmployees.length;
      if (shift.assignedEmployees.length < shift.requiredStaff) understaffedShifts += 1;
      for (const employee of shift.assignedEmployees) {
        const id = employee._id.toString();
        if (!workloadMap.has(id)) workloadMap.set(id, { employeeId: id, name: employee.name, email: employee.email, department: employee.department || "General", assignedShifts: 0, scheduledMinutes: 0, present: 0, late: 0, absent: 0, attendanceMarked: 0 });
        const row = workloadMap.get(id);
        row.assignedShifts += 1;
        row.scheduledMinutes += Math.max(0, toMinutes(shift.endTime) - toMinutes(shift.startTime));
      }
    }
    for (const record of attendance) {
      const id = record.employee?._id?.toString();
      if (!id) continue;
      if (!workloadMap.has(id)) workloadMap.set(id, { employeeId: id, name: record.employee.name, email: record.employee.email, department: record.employee.department || "General", assignedShifts: 0, scheduledMinutes: 0, present: 0, late: 0, absent: 0, attendanceMarked: 0 });
      const row = workloadMap.get(id);
      row.attendanceMarked += 1;
      row[record.status] = (row[record.status] || 0) + 1;
    }
    const statusCounts = { present: 0, late: 0, absent: 0 };
    for (const record of attendance) statusCounts[record.status] += 1;
    const totalSlots = shifts.reduce((sum, shift) => sum + shift.requiredStaff, 0);
    return res.status(200).json({
      weekStart, weekEnd,
      summary: {
        activeEmployees: activeEmployees.length,
        shiftSlots: shifts.length,
        requiredAssignments,
        assignedAssignments,
        understaffedShifts,
        scheduledEmployees: [...workloadMap.values()].filter((row) => row.assignedShifts > 0).length,
        leaveRequests: leaves.length,
        attendanceRecords: attendance.length,
        attendanceExpected: assignedAssignments,
        attendanceCompletionRate: assignedAssignments ? Math.round((attendance.length / assignedAssignments) * 100) : 0,
        attendanceRate: attendance.length ? Math.round(((statusCounts.present + statusCounts.late) / attendance.length) * 100) : 0,
        ...statusCounts,
      },
      workload: [...workloadMap.values()].sort((a, b) => b.assignedShifts - a.assignedShifts || a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("Error creating workforce report:", error.message);
    return res.status(500).json({ message: "Failed to generate workforce report." });
  }
});

// The server needs a non-default signing key; do not use a hard-coded fallback.
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Add it to backend/.env.");
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Add a random secret of at least 32 characters to backend/.env.");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => console.log(`ShiftBalance server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
