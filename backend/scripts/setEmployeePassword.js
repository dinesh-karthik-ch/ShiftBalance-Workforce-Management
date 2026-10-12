require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("node:readline");
const Employee = require("../models/Employee");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let answer = "";
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      ask(question).then(resolve).catch(reject);
      return;
    }

    process.stdout.write(question);
    const oldRawMode = input.isRaw;
    input.setRawMode(true);
    input.resume();

    const cleanup = () => {
      input.removeListener("data", onData);
      input.setRawMode(Boolean(oldRawMode));
      process.stdout.write("\n");
    };

    const onData = (buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(answer);
          return;
        }
        if (char === "\u0008" || char === "\u007f") {
          answer = answer.slice(0, -1);
        } else if (char >= " ") {
          answer += char;
        }
      }
    };

    input.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from backend/.env.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Add a JWT_SECRET of at least 32 characters to backend/.env first.");
  }

  const email = (await ask("Existing employee email: ")).toLowerCase();
  const role = (await ask("Set demo role (employee/manager): ")).toLowerCase();
  if (!["employee", "manager"].includes(role)) {
    throw new Error("Role must be employee or manager.");
  }
  const password = await askHidden("New demo password (input hidden): ");
  if (password.length < 10) {
    throw new Error("Use a password with at least 10 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const employee = await Employee.findOne({ email }).select("+passwordHash");
  if (!employee) {
    throw new Error(`No employee exists with email ${email}. Create the employee first in the manager UI.`);
  }
  if (employee.isActive === false) {
    throw new Error("This employee is inactive. Reactivate them before setting up a login.");
  }

  employee.role = role;
  employee.passwordHash = await bcrypt.hash(password, 12);
  await employee.save();

  console.log(`Credentials saved for ${employee.email} (${employee.role}). Password is stored as a bcrypt hash.`);
  console.log("This is a local developer setup script, not a public API route.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Could not set employee credentials:", error.message);
  try { await mongoose.disconnect(); } catch (_error) { /* no connection to close */ }
  process.exitCode = 1;
});
