# ShiftBalance — Smart Workforce Management System

A full-stack workforce scheduling and attendance management application that helps businesses organize employee availability, generate shift schedules, manage leave requests, detect scheduling conflicts, and track attendance from one centralized dashboard.

## Overview

Managing employee shifts manually can lead to scheduling conflicts, understaffing, uneven workloads, and difficulty tracking attendance. **ShiftBalance** simplifies these tasks by providing a centralized platform for managers and employees.

Managers can manage employees, configure shift templates, generate and publish weekly schedules, review conflicts, approve leave requests, and monitor attendance. Employees can manage their availability, submit leave requests, view assigned shifts, and receive notifications about schedule updates.

## Features

### Manager Dashboard
- Manage employee records and departments.
- Create and configure reusable shift templates.
- Generate weekly schedules based on availability and staffing requirements.
- Review scheduling conflicts and staffing shortages.
- Publish schedules and notify assigned employees.
- Review and manage employee leave requests.
- Record and manage attendance.
- View weekly reports and export attendance data as CSV.

### Employee Portal
- Secure login and role-based access.
- Submit and manage weekly availability.
- Submit leave requests and track their status.
- View assigned shifts and published schedules.
- Receive notifications about relevant schedule updates.

### Scheduling and Attendance
- Availability-aware shift assignment.
- Configurable shift timings and minimum staffing requirements.
- Conflict review for scheduling exceptions.
- Attendance tracking with Present, Late, and Absent statuses.
- Weekly attendance reporting and CSV export.

### Additional Capabilities
- Responsive dashboard layout.
- Protected backend API routes.
- Confirmation prompts for destructive actions.
- Persistent application data using MongoDB.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| UI Icons | Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| API Communication | REST API |
| Testing | Node.js test runner |
| Version Control | Git and GitHub |

## Project Structure

```text
ShiftBalance/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── scripts/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) — version 20 or later
- npm, included with Node.js
- A [MongoDB Atlas](https://www.mongodb.com/atlas) database or compatible MongoDB instance
- Git

### 1. Clone the repository

```bash
git clone https://github.com/dinesh-karthik-ch/ShiftBalance-Workforce-Management.git
cd ShiftBalance-Workforce-Management
```

If the latest changes are on a feature branch, switch to that branch before continuing:

```bash
git checkout feature/react-tailwind-ui
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a local `.env` file by copying the example:

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

Configure the following variables in `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_of_at_least_32_characters
FRONTEND_URL=http://localhost:5173
```

Replace the example values with your actual configuration. Ensure your MongoDB database user and network access settings permit the backend to connect.

Start the backend:

```bash
npm run dev
```

The API should be available at `http://localhost:5000`.

### 3. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` if you need to configure the API URL.

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### 4. Log in

Use an existing account configured in your database. The application supports manager and employee roles with different permissions.

No default login credentials are provided in this README. Configure accounts securely rather than committing test credentials.

## Testing and Validation

Run the following checks from the project directory.

**Backend syntax check**
```bash
node --check backend/server.js
```

**Backend API source-contract tests**
```bash
cd backend
npm run test:api
```

**Frontend production build**
```bash
cd frontend
npm run build
```

**Frontend lint**
```bash
npm run lint
```

These checks complement manual testing. Before deployment, test authentication, role permissions, schedule generation, publishing, leave management, attendance persistence after reload, report rendering, and CSV export against a test database.

## Security Considerations

- Never commit `.env`, `.env.local`, database credentials, JWT secrets, or access tokens.
- Keep `.env.example` limited to placeholder values.
- Use a strong, randomly generated JWT secret.
- Restrict database access to authorized users and application hosts.
- Enforce role-based access on the backend, not only in the UI.
- Configure CORS to allow only the intended frontend origin in production.
- Back up important records before performing permanent deletion operations.

## Deployment

ShiftBalance can be deployed using separate frontend and backend hosting services.

- **Database:** MongoDB Atlas.
- **Backend:** A Node.js-compatible hosting platform.
- **Frontend:** A static hosting platform supporting Vite builds.

For production, configure `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, and `VITE_API_URL` through the hosting provider's environment settings. Build the frontend using `npm run build` and publish the generated `frontend/dist` directory.

Verify authentication, CORS, database connectivity, role permissions, attendance persistence, and reporting on the deployed application before public use.

## Future Improvements

Potential extensions include:

- Automated email and push notifications.
- Advanced scheduling optimization and workload balancing.
- Payroll integration based on attendance.
- Monthly analytics and downloadable PDF reports.
- Multi-branch workforce management.
- Automated deployment and integration testing.

## Contributors

Developed as a Software Engineering project focused on improving workforce scheduling, availability management, and attendance tracking.

## License

This project is currently intended for academic and demonstration purposes. Add an appropriate open-source license before redistributing it publicly.
