const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Employee = require("./models/Employee");
const Availability = require("./models/Availability");

const app = express();
const PORT = process.env.PORT || 5000;

const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const validTime = (time) =>
  typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

app.use(cors());
app.use(express.json());

// Health-check route.
app.get("/", (req, res) => {
  res.status(200).send("ShiftBalance backend is running!");
});

// GET: Retrieve employees. Optional ?status=active or ?status=inactive filter.
// Omitting status preserves the existing contract and returns all records.
app.get("/api/employees", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either active or inactive.",
      });
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

// GET: Retrieve one employee by ID.
app.get("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    return res.status(200).json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error.message);
    return res.status(500).json({ message: "Failed to retrieve employee." });
  }
});

// PUT: Update employee details. Status changes use the dedicated PATCH route.
app.put("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const { name, email, role, department } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email cannot be empty." });
      }
      updates.email = email.trim().toLowerCase();
    }

    if (role !== undefined) {
      if (!["employee", "manager"].includes(role)) {
        return res.status(400).json({
          message: "Role must be employee or manager.",
        });
      }
      updates.role = role;
    }

    if (department !== undefined) {
      if (typeof department !== "string" || !department.trim()) {
        return res.status(400).json({
          message: "Department cannot be empty.",
        });
      }
      updates.department = department.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    return res.status(200).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An employee with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Error updating employee:", error.message);
    return res.status(500).json({ message: "Failed to update employee." });
  }
});

// POST: Add an employee. New employees are active by default.
app.post("/api/employees", async (req, res) => {
  try {
    const { name, email, role, department } = req.body;

    if (typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const employee = await Employee.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      department,
      isActive: true,
    });

    return res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An employee with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Error adding employee:", error.message);
    return res.status(500).json({ message: "Failed to add employee." });
  }
});

// PATCH: Deactivate/reactivate an employee without deleting their record.
// Deactivation preserves availability, but marks existing slots for review.
app.patch("/api/employees/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean (true or false).",
      });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    employee.isActive = isActive;
    await employee.save();

    let availabilityFlaggedForReview = 0;
    if (!isActive) {
      const result = await Availability.updateMany(
        { employee: employee._id },
        { $set: { needsReview: true } }
      );
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
    return res.status(500).json({
      message: "Failed to change employee status.",
    });
  }
});

// GET: Retrieve availability, optionally filtered by employee ID.
app.get("/api/availability", async (req, res) => {
  try {
    const filter = {};

    if (req.query.employeeId) {
      if (!mongoose.isValidObjectId(req.query.employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID." });
      }
      filter.employee = req.query.employeeId;
    }

    const records = await Availability.find(filter)
      .populate("employee", "name email isActive")
      .sort({ day: 1 });

    return res.status(200).json(records);
  } catch (error) {
    console.error("Error retrieving availability:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve availability.",
    });
  }
});

// POST: Submit availability for an active employee.
app.post("/api/availability", async (req, res) => {
  try {
    const { employeeId, day, startTime, endTime } = req.body;

    if (!employeeId || !day || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ message: "Invalid day." });
    }

    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
      return res.status(400).json({
        message: "Enter valid times in HH:mm format; end time must be later than start time.",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }
    if (employee.isActive === false) {
      return res.status(409).json({
        message: "Cannot submit availability for an inactive employee. Reactivate the employee first.",
      });
    }

    const record = await Availability.create({
      employee: employeeId,
      day,
      startTime,
      endTime,
      needsReview: false,
    });

    return res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Availability for this employee and day already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Error submitting availability:", error.message);
    return res.status(500).json({ message: "Failed to submit availability." });
  }
});

// PUT: Update an existing availability slot. Saving it clears needsReview.
app.put("/api/availability/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, day, startTime, endTime } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid availability ID." });
    }

    if (!employeeId || !day || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ message: "Invalid day." });
    }

    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
      return res.status(400).json({
        message: "Enter valid times in HH:mm format; end time must be later than start time.",
      });
    }

    const existingRecord = await Availability.findById(id);
    if (!existingRecord) {
      return res.status(404).json({ message: "Availability record not found." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }
    if (employee.isActive === false) {
      return res.status(409).json({
        message: "Cannot update availability for an inactive employee. Reactivate the employee first.",
      });
    }

    const updatedRecord = await Availability.findByIdAndUpdate(
      id,
      {
        $set: {
          employee: employeeId,
          day,
          startTime,
          endTime,
          needsReview: false,
        },
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Availability updated successfully.",
      availability: updatedRecord,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Availability for this employee and day already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Error updating availability:", error.message);
    return res.status(500).json({ message: "Failed to update availability." });
  }
});

// DELETE: Remove one availability slot. Employee and historical data are untouched.
app.delete("/api/availability/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid availability ID." });
    }

    const deletedRecord = await Availability.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Availability record not found." });
    }

    return res.status(200).json({
      message: "Availability deleted successfully.",
      deletedAvailabilityId: deletedRecord._id,
    });
  } catch (error) {
    console.error("Error deleting availability:", error.message);
    return res.status(500).json({ message: "Failed to delete availability." });
  }
});

// Start only after MongoDB connects. MONGODB_URI remains in backend/.env.
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => {
      console.log(`ShiftBalance server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
