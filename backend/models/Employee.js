const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["employee", "manager"],
      default: "employee",
    },
    department: { type: String, trim: true, default: "General" },
    isActive: { type: Boolean, default: true },
    // Password hashes are never returned by default in normal API queries.
    passwordHash: { type: String, select: false },
  },
  { timestamps: true }
);

employeeSchema.set("toJSON", {
  transform(_document, returnedObject) {
    delete returnedObject.passwordHash;
    delete returnedObject.__v;
    return returnedObject;
  },
});

module.exports = mongoose.model("Employee", employeeSchema);
