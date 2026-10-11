const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    // When an employee is deactivated, retain their slots but require review
    // before they are used again after reactivation.
    needsReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One recurring availability slot per employee per weekday.
availabilitySchema.index(
  { employee: 1, day: 1 },
  { unique: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);
