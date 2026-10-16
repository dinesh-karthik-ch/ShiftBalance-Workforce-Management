const mongoose = require("mongoose");

const shiftAssignmentSchema = new mongoose.Schema(
  {
    template: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftTemplate", required: true },
    weekStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    day: { type: String, required: true, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
    shiftName: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    requiredStaff: { type: Number, required: true, min: 1, validate: Number.isInteger },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shiftAssignmentSchema.index({ date: 1, template: 1 }, { unique: true });
shiftAssignmentSchema.index({ weekStart: 1, date: 1 });
shiftAssignmentSchema.index({ weekStart: 1, published: 1 });

module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);
