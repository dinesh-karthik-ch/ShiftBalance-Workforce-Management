const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_error) {
      return res.status(401).json({ message: "Your session is invalid or has expired. Please log in again." });
    }

    const employee = await Employee.findById(payload.sub);
    if (!employee) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }
    if (employee.isActive === false) {
      return res.status(403).json({ message: "This account is inactive. Contact a manager." });
    }

    req.user = employee;
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);
    return res.status(500).json({ message: "Could not verify authentication." });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
