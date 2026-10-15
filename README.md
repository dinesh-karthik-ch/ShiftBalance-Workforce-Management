# ShiftBalance — Workforce Management

React, Vite, Tailwind CSS, Express, and MongoDB Atlas.

## UI restoration in this build

- Restored the original indigo/violet gradient hero section and indigo sidebar branding/active state.
- Kept the current feature set, including the expanded navigation, delete actions, confirmation prompts, and protected backend routes.
- Made the sidebar navigation independently scrollable on shorter screens so the footer/profile area does not push navigation off-screen.
- Kept the layout responsive; no replacement dashboard or unrelated redesign was introduced.

## Local setup

1. Install Node.js 20+.
2. Backend: `cd backend && npm install`.
3. Copy `backend/.env.example` to `backend/.env`, then set a real MongoDB Atlas URI and a random `JWT_SECRET` (at least 32 characters).
4. Start the API: `npm run dev` from `backend/`.
5. Frontend: in a second terminal, `cd frontend && npm install`.
6. Copy `frontend/.env.example` to `frontend/.env.local` if you want to configure the API URL. The local default is `http://localhost:5000/api`.
7. Start the UI with `npm run dev` from `frontend/`.

## Tests and checks

- Backend source syntax: `node --check backend/server.js`
- Backend source-contract tests: `cd backend && npm run test:api`
- Frontend production build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`

The source-contract tests check that key destructive routes and UI affordances remain present. They are not a substitute for authenticated integration tests against a test database. Run the frontend build and test each role in a staging environment before production deployment.

## Deletion behaviour

- Employees: manager-only permanent deletion; removes the employee's availability, leave history, attendance records, and notifications, and unassigns them from shifts. The signed-in manager and the last active manager cannot be deleted.
- Availability: employees can delete their own slots; managers can delete any slot.
- Leave requests: employees can delete their own pending requests; managers can delete any request.
- Shift templates: manager-only permanent deletion also removes generated shifts based on that template and attendance attached to those shifts.
- Shift assignments: manager-only deletion removes attached attendance. Deleting a published shift notifies assigned employees.
- Attendance: managers can remove an attendance record and record it again.
- Notifications: users can delete only their own notifications.

Every destructive UI action requires confirmation. Deletions are permanent; export or back up data before using these controls on production records.

## Deployment outline

- **MongoDB Atlas:** create a least-privilege database user, configure Network Access for the backend host, and keep the connection URI in the backend provider's secret/environment settings.
- **Backend:** deploy the `backend/` service to a Node host (for example Render). Configure `MONGODB_URI`, `JWT_SECRET`, `PORT` (provided by the host), and `FRONTEND_URL` with the deployed frontend origin. Do not use a wildcard origin in production.
- **Frontend:** deploy the `frontend/` Vite app to a static host (for example Vercel or Netlify). Set `VITE_API_URL` to the deployed API origin plus `/api`, then build with `npm run build` and publish `dist/`.
- Configure a real production manager account/password securely; never ship seeded test credentials.
- Test login, manager/employee authorization, CRUD, shift generation/publishing, leave approvals, attendance, and CORS on the deployed staging environment before public use.
