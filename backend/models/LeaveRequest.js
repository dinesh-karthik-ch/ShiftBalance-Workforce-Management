const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    managerNote: { type: String, trim: true, maxlength: 500, default: "" },
    decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    decisionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
