const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    shiftAssignment: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftAssignment", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    weekStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    shiftName: { type: String, required: true, trim: true },
    status: { type: String, enum: ["present", "late", "absent"], required: true },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
    note: { type: String, maxlength: 500, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attendanceSchema.index({ shiftAssignment: 1, employee: 1 }, { unique: true });
attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ weekStart: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
