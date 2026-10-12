const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Employee = require("./models/Employee");
const Availability = require("./models/Availability");
const LeaveRequest = require("./models/LeaveRequest");
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
app.use(cors());
app.use(express.json({ limit: "100kb" }));

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
    return res.status(200).json({ message: `Leave request ${status}.`, leaveRequest });
  } catch (error) {
    console.error("Error deciding leave request:", error.message);
    return res.status(500).json({ message: "Failed to process leave decision." });
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
