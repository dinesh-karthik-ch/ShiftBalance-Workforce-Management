const mongoose = require("mongoose");

const shiftTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60, unique: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    daysOfWeek: { type: [{ type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }], required: true, validate: [(days) => days.length > 0, "Choose at least one day."] },
    requiredStaff: { type: Number, required: true, min: 1, max: 100, validate: Number.isInteger },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShiftTemplate", shiftTemplateSchema);
