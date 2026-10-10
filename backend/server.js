
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Employee = require("./models/Employee");
const Availability = require("./models/Availability");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("ShiftBalance backend is running!");
});

// GET: Retrieve all employees
app.get("/api/employees", async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve employees." });
    }
});

// POST: Add an employee
app.post("/api/employees", async (req, res) => {
    try {
        const { name, email, role, department } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required."
            });
        }

        const employee = new Employee({
            name,
            email,
            role,
            department
        });

        await employee.save();
        res.status(201).json(employee);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An employee with this email already exists."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({ message: "Failed to add employee." });
    }
});


const validTime = (time) =>
    typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

// GET: Retrieve availability, optionally filtered by employee
app.get("/api/availability", async (req, res) => {
    try {
        const filter = {};

        if (req.query.employeeId) {
            if (!mongoose.isValidObjectId(req.query.employeeId)) {
                return res.status(400).json({
                    message: "Invalid employee ID."
                });
            }

            filter.employee = req.query.employeeId;
        }

        const records = await Availability.find(filter)
            .populate("employee", "name email")
            .sort({ day: 1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve availability."
        });
    }
});

// POST: Submit employee availability
app.post("/api/availability", async (req, res) => {
    try {
        const { employeeId, day, startTime, endTime } = req.body;

        const validDays = [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday"
        ];

        if (
            !employeeId ||
            !day ||
            !startTime ||
            !endTime
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (!mongoose.isValidObjectId(employeeId)) {
            return res.status(400).json({
                message: "Invalid employee ID."
            });
        }

        if (!validDays.includes(day)) {
            return res.status(400).json({
                message: "Invalid day."
            });
        }

        if (
            !validTime(startTime) ||
            !validTime(endTime) ||
            startTime >= endTime
        ) {
            return res.status(400).json({
                message: "Enter valid times in HH:mm format; end time must be later than start time."
            });
        }

        const employee = await Employee.findById(employeeId);

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found."
            });
        }

        const record = await Availability.create({
            employee: employeeId,
            day,
            startTime,
            endTime
        });

        res.status(201).json(record);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Availability for this employee and day already exists."
            });
        }

        res.status(500).json({
            message: "Failed to submit availability."
        });
    }
});

// Start server after MongoDB connects
mongoose.connect(process.env.MONGODB_URI)
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
