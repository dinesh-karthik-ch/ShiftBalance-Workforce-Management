
const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true
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
                "Sunday"
            ],
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

availabilitySchema.index(
    { employee: 1, day: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "Availability",
    availabilitySchema
);
