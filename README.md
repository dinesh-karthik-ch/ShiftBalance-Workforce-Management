# ShiftBalance — Smart Workforce Management System

**Live application:** https://shiftbalance.netlify.app/  
**Backend API:** https://shiftbalance-api.onrender.com  
**GitHub repository:** https://github.com/dinesh-karthik-ch/ShiftBalance-Workforce-Management

ShiftBalance is a full-stack workforce scheduling and attendance management application designed to help managers and employees coordinate shifts, availability, leave, and attendance from one place.

## Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Run Locally](#run-locally)
- [Environment Variables](#environment-variables)
- [Testing and Build](#testing-and-build)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Team](#team)

## Overview

Manual workforce scheduling can lead to overlapping shifts, understaffing, availability conflicts, and inconsistent attendance records. ShiftBalance brings these workflows into a centralized dashboard with separate manager and employee experiences.

Managers can manage employees, configure reusable shift templates, generate and publish schedules, review conflicts, handle leave requests, track attendance, and view reports. Employees can sign in, submit availability and leave requests, view assigned shifts, and receive in-app notifications.

## Live Demo

- **Frontend:** [shiftbalance.netlify.app](https://shiftbalance.netlify.app/)
- **Backend health check:** [shiftbalance-api.onrender.com](https://shiftbalance-api.onrender.com/)

The frontend and backend are deployed separately. The frontend communicates with the Express API, which connects to MongoDB Atlas for persistent storage.

## Features

### Manager workspace
- Create, view, edit, and manage employee records.
- Configure reusable shift templates and staffing requirements.
- Generate weekly shift schedules.
- Review scheduling issues such as overlapping assignments, availability conflicts, leave conflicts, inactive employees, and staffing shortages.
- Publish schedules for employees.
- Review and manage leave requests.
- Record and review attendance.
- View dashboard summaries and reports.
- Export attendance records to CSV.

### Employee workspace
- Sign up and log in.
- Role-based access to employee and manager experiences.
- Submit and manage weekly availability.
- Submit leave requests and check their status.
- View assigned shifts and published schedules.
- Receive in-app notifications about relevant updates.

### Scheduling and attendance
- Availability-aware scheduling workflows.
- Shift templates with configurable times and staffing requirements.
- Conflict review around schedule planning and publication.
- Attendance statuses including **Present**, **Late**, and **Absent**.
- Attendance data persists in MongoDB and can be reviewed after refreshing the application.

### User experience
- Responsive dashboard layout for desktop and smaller screens.
- Light and dark themes.
- Custom ShiftBalance branding, favicon, and refreshed hero section.
- Sidebar navigation and dashboard views for core workflows.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite |
| Styling | Tailwind CSS, custom CSS |
| Icons | Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| API | REST endpoints |
| Testing | Node.js built-in test runner |
| Version control | Git, GitHub |
| Frontend hosting | Netlify |
| Backend hosting | Render |

## Application Architecture

```text
Employee / Manager
        |
        v
React + Vite frontend
(Netlify)
        |
        | HTTPS requests to /api
        v
Express REST API
(Render)
        |
        | Mongoose
        v
MongoDB Atlas
```

The frontend handles the user interface and sends requests to the backend API. The backend handles data operations, authentication, and authorization, while MongoDB Atlas stores application records.

## Project Structure

```text
ShiftBalance/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── Availability.js
│   │   ├── Employee.js
│   │   ├── LeaveRequest.js
│   │   ├── Notification.js
│   │   ├── ShiftAssignment.js
│   │   └── ShiftTemplate.js
│   ├── scripts/
│   ├── tests/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or another MongoDB instance
- Git

### 1. Clone the repository

```bash
git clone https://github.com/dinesh-karthik-ch/ShiftBalance-Workforce-Management.git
cd ShiftBalance-Workforce-Management
```

### 2. Configure and start the backend

```bash
cd backend
npm install
```

Create a `backend/.env` file:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:5173
```

Use your own MongoDB connection string and a strong random JWT secret. Do not commit this file.

Start the API:

```bash
npm run dev
```

The backend should start at `http://localhost:5000`.

### 3. Configure and start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### 4. Sign in

Use an existing account in your configured database or register through the app. Newly registered accounts should not be able to grant themselves manager privileges. Manager access should be assigned only by an authorized administrator.

## Environment Variables

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | Port used by the Express server; the hosting platform may provide this automatically. |
| `MONGODB_URI` | MongoDB connection string. Keep it private. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Use a strong, unique value. |
| `FRONTEND_URL` | Allowed frontend origin for CORS. Set to the deployed frontend URL in production. |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL, including `/api`. |

For the current deployment, the frontend API variable should point to:

```env
VITE_API_URL=https://shiftbalance-api.onrender.com/api
```

Set environment variables in the hosting provider dashboard rather than committing secrets to the repository.

## Testing and Build

Run these commands from the project root as appropriate.

**Check backend JavaScript syntax**
```bash
node --check backend/server.js
```

**Run backend API tests**
```bash
cd backend
npm run test:api
```

**Build the frontend for production**
```bash
cd frontend
npm run build
```

**Run the frontend lint check**
```bash
npm run lint
```

Before a release, manually test sign-up, login, role permissions, employee management, availability, scheduling, schedule publishing, leave requests, attendance persistence, reports, and CSV export.

## Deployment

### Frontend — Netlify
- Site: [https://shiftbalance.netlify.app/](https://shiftbalance.netlify.app/)
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL=https://shiftbalance-api.onrender.com/api`

### Backend — Render
- Service: [https://shiftbalance-api.onrender.com](https://shiftbalance-api.onrender.com)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Configure `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL` in Render's environment settings. Set `FRONTEND_URL` to `https://shiftbalance.netlify.app`.

### Database — MongoDB Atlas
The backend uses MongoDB Atlas for persistent data. Ensure the database user, network access rules, and connection string are configured correctly.

After deploying changes, test the live site end-to-end. If the frontend cannot call the API, verify `VITE_API_URL` and the backend's `FRONTEND_URL` CORS setting.

## Security Notes

- Never commit `.env` files, MongoDB credentials, JWT secrets, or authentication tokens.
- Keep example environment files limited to placeholders.
- Use a strong, unique JWT secret in production.
- Restrict MongoDB network access where practical.
- Enforce authorization on the backend; hiding UI elements alone is not access control.
- Do not expose manager credentials or create a public default manager account.
- Use test data when demonstrating the public deployment.

## Team

Developed as a Software Engineering team project by:

- **CH. Dinesh Karthik**
- **D. Rahul Nandhan**
- **K. Shivanshu**

## License

This project was developed for academic and demonstration purposes. No open-source license has been added; contact the maintainers before redistributing or reusing it.
