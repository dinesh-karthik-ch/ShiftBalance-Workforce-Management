import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  AlertTriangle,
  Clock3,
  Search,
  Plus,
  ArrowUpRight,
  Menu,
  X,
  RefreshCw,
  Sun,
  Moon,
  UserRound,
  CheckCircle2,
  LoaderCircle,
  BriefcaseBusiness,
  Sparkles,
  Power,
  RotateCcw,
  Trash2,
  ClipboardList,
  LogOut,
  LockKeyhole,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "availability", label: "Availability", icon: CalendarCheck },
  { id: "leave", label: "Leave Management", icon: ClipboardList },
  { id: "schedule", label: "Shift Schedule", icon: CalendarDays },
  { id: "conflicts", label: "Conflicts", icon: AlertTriangle },
];

const emptyEmployee = {
  name: "",
  email: "",
  role: "employee",
  department: "Operations",
};

const emptyAvailability = {
  employeeId: "",
  day: "",
  startTime: "09:00",
  endTime: "17:00",
};

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("shiftbalance-token");
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
  };

  return (
    <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ring-1 ${colors[color]}`}>
          <Icon size={21} />
        </div>
      </div>
    </Panel>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <CalendarDays size={21} />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailability);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState(null);

  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [savingLeave, setSavingLeave] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("shiftbalance-theme") === "dark"
  );

  async function loadData(user = currentUser) {
    if (!user) return;
    setLoading(true);

    try {
      const isManager = user.role === "manager";
      const [employeeData, availabilityData, leaveData] = await Promise.all([
        isManager ? apiRequest("/employees") : Promise.resolve([user]),
        apiRequest(isManager ? "/availability" : `/availability?employeeId=${user._id}`),
        apiRequest("/leave"),
      ]);

      setEmployees(employeeData);
      setAvailability(availabilityData);
      setLeaveRequests(leaveData);
      setConnected(true);
    } catch (error) {
      setConnected(false);
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem("shiftbalance-token");
        setCurrentUser(null);
        setAuthError(error.message);
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  }

  function notify(type, text) {
    setMessage({ type, text });
  }

  async function viewEmployeeProfile(employeeId) {
    try {
      setMessage(null);
      const employee = await apiRequest(`/employees/${employeeId}`);
      setSelectedEmployee(employee);
    } catch (error) {
      notify("error", error.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("shiftbalance-token");
    if (!token) {
      setAuthChecking(false);
      setLoading(false);
      return () => { cancelled = true; };
    }

    apiRequest("/auth/me")
      .then(async (user) => {
        if (cancelled) return;
        setCurrentUser(user);
        await loadData(user);
      })
      .catch((error) => {
        if (cancelled) return;
        localStorage.removeItem("shiftbalance-token");
        setAuthError(error.message);
        setLoading(false);
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    localStorage.setItem("shiftbalance-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem("shiftbalance-token", result.token);
      setCurrentUser(result.user);
      setActivePage("overview");
      setLoginForm({ email: "", password: "" });
      await loadData(result.user);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
      setAuthChecking(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (_error) {
      // Clear local credentials even if the network is offline.
    }
    localStorage.removeItem("shiftbalance-token");
    setCurrentUser(null);
    setEmployees([]);
    setAvailability([]);
    setLeaveRequests([]);
    setSelectedEmployee(null);
    setActivePage("overview");
    setMessage(null);
    setAuthError("");
  }

  async function handleSubmitLeave(event) {
    event.preventDefault();
    setSavingLeave(true);
    setMessage(null);
    try {
      await apiRequest("/leave", {
        method: "POST",
        body: JSON.stringify(leaveForm),
      });
      setLeaveForm({ startDate: "", endDate: "", reason: "" });
      await loadData(currentUser);
      notify("success", "Leave request submitted successfully.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSavingLeave(false);
    }
  }

  async function handleLeaveDecision(leaveRequest, status) {
    const employeeName = leaveRequest.employee?.name || "this employee";
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} ${employeeName}'s leave request?`)) return;
    try {
      await apiRequest(`/leave/${leaveRequest._id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ status, managerNote: "" }),
      });
      await loadData(currentUser);
      notify("success", `Leave request ${status}.`);
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleAddEmployee(event) {
    event.preventDefault();
    setSavingEmployee(true);
    setMessage(null);

    const isEditing = Boolean(editingEmployeeId);

    try {
      await apiRequest(
        isEditing ? `/employees/${editingEmployeeId}` : "/employees",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(employeeForm),
        }
      );

      setEmployeeForm(emptyEmployee);
      setEditingEmployeeId(null);
      await loadData();
      notify("success", isEditing ? "Employee updated successfully." : "Employee added successfully.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleToggleEmployeeStatus(employee) {
    const currentlyActive = employee.isActive !== false;
    const nextIsActive = !currentlyActive;
    const confirmation = nextIsActive
      ? `Reactivate ${employee.name}? Their existing availability will need review before scheduling.`
      : `Deactivate ${employee.name}? Their employee record and availability will be retained, and existing availability will be flagged for review.`;

    if (!window.confirm(confirmation)) return;

    try {
      const result = await apiRequest(`/employees/${employee._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      setSelectedEmployee((current) =>
        current && current._id === employee._id ? result.employee : current
      );
      if (!nextIsActive && availabilityForm.employeeId === employee._id) {
        setEditingAvailabilityId(null);
        setAvailabilityForm(emptyAvailability);
      }
      await loadData();
      notify(
        "success",
        nextIsActive
          ? "Employee reactivated. Review their existing availability before scheduling."
          : "Employee deactivated. Existing availability was retained and flagged for review."
      );
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteAvailability(record) {
    const employeeName = record.employee?.name || "this employee";
    const confirmed = window.confirm(
      `Delete ${employeeName}'s ${record.day} availability (${record.startTime}–${record.endTime})? This removes only this availability slot.`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/availability/${record._id}`, { method: "DELETE" });

      if (editingAvailabilityId === record._id) {
        setEditingAvailabilityId(null);
        setAvailabilityForm(emptyAvailability);
      }

      await loadData();
      notify("success", "Availability slot deleted successfully.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleAddAvailability(event) {
    event.preventDefault();
    setSavingAvailability(true);
    setMessage(null);

    try {
      const isEditing = Boolean(editingAvailabilityId);
      await apiRequest(
        isEditing ? `/availability/${editingAvailabilityId}` : "/availability",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(availabilityForm),
        }
      );

      setAvailabilityForm(emptyAvailability);
      setEditingAvailabilityId(null);
      await loadData();
      notify("success", isEditing ? "Availability updated successfully." : "Availability saved successfully.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSavingAvailability(false);
    }
  }

  function handleEditAvailability(record) {
    setEditingAvailabilityId(record._id);
    setAvailabilityForm({
      employeeId: record.employee?._id || record.employee || "",
      day: record.day || "",
      startTime: record.startTime || "",
      endTime: record.endTime || "",
    });
  }

  function startEditEmployee(employee) {
    setEditingEmployeeId(employee._id);
    setEmployeeForm({
      name: employee.name || "",
      email: employee.email || "",
      role: employee.role || "employee",
      department: employee.department || "General",
    });
    setMessage(null);
    setActivePage("employees");
  }

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.email} ${employee.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const departments = new Set(
    employees.map((employee) => employee.department).filter(Boolean)
  ).size;

  // Older employee documents without isActive are treated as active.
  const activeEmployees = employees.filter((employee) => employee.isActive !== false);

  const pageInfo = {
    overview: {
      title: "Overview",
      description: "Here's what's happening with your workforce.",
    },
    employees: {
      title: "Employees",
      description: "Manage your team and employee records.",
    },
    availability: {
      title: currentUser?.role === "employee" ? "My Availability" : "Availability",
      description: currentUser?.role === "employee" ? "Manage your available working hours." : "Track when your employees are available to work.",
    },
    leave: {
      title: currentUser?.role === "manager" ? "Leave Management" : "My Leave",
      description: currentUser?.role === "manager" ? "Review employee leave requests and submit your own." : "Request leave and track its approval status.",
    },
    schedule: {
      title: "Shift Schedule",
      description: "Plan and manage weekly workforce shifts.",
    },
    conflicts: {
      title: "Scheduling Conflicts",
      description: "Identify and resolve overlapping assignments.",
    },
  }[activePage];

  const visibleNavItems = currentUser?.role === "manager"
    ? navItems
    : navItems.filter((item) => ["overview", "availability", "leave"].includes(item.id));

  function navigateTo(page) {
    if (currentUser?.role !== "manager" && ["employees", "schedule", "conflicts"].includes(page)) {
      page = "overview";
    }
    setActivePage(page);
    setMobileMenuOpen(false);
    setMessage(null);
  }

  function renderEmployeeTable() {
    if (loading) return <EmptyState message="Loading employee records..." />;

    if (filteredEmployees.length === 0) {
      return (
        <EmptyState
          message={searchTerm ? "No employees match your search." : "No employees have been added yet."}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Employee</th>
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEmployees.map((employee) => {
              const isActive = employee.isActive !== false;
              return (
                <tr key={employee._id} className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${isActive ? "" : "opacity-80"}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {(employee.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{employee.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{employee.department || "General"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[180px] flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditEmployee(employee)}
                        className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => viewEmployeeProfile(employee._id)}
                        className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEmployeeStatus(employee)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? "bg-rose-50 text-rose-700 hover:bg-rose-100 hover:shadow-rose-500/25 focus-visible:ring-rose-500 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 dark:hover:shadow-rose-400/20" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-emerald-500/35 focus-visible:ring-emerald-500 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:shadow-emerald-400/25"}`}
                      >
                        {isActive ? <Power size={14} /> : <RotateCcw size={14} />}
                        {isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderAvailabilityTable() {
    if (loading) return <EmptyState message="Loading availability records..." />;
    if (availability.length === 0) return <EmptyState message="No availability records yet." />;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Employee</th>
              <th className="px-5 py-3 font-semibold">Day</th>
              <th className="px-5 py-3 font-semibold">Available hours</th>
              <th className="px-5 py-3 text-left text-sm font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {availability.map((record) => {
              const employeeIsActive = record.employee?.isActive !== false;
              return (
                <tr key={record._id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                  <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">
                    <div>{record.employee?.name || "Employee"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {!employeeIsActive && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Employee inactive
                        </span>
                      )}
                      {record.needsReview && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Review required
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{record.day}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{record.startTime} – {record.endTime}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditAvailability(record)}
                        disabled={!employeeIsActive}
                        title={!employeeIsActive ? "Reactivate this employee before editing their availability" : "Edit availability"}
                        className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                      >
                        {record.needsReview ? "Review & Edit" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAvailability(record)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                    {!employeeIsActive && (
                      <p className="mt-1.5 max-w-[230px] text-xs text-slate-500">Reactivate the employee before reviewing this slot.</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEmployeeForm() {
    return (
      <Panel className="p-5 sm:p-6">
        <SectionHeading
          title={editingEmployeeId ? "Edit employee" : "Add employee"}
          subtitle={editingEmployeeId ? "Update this employee's information." : "Add a new member to your workforce."}
        />
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
            <input
              required
              value={employeeForm.name}
              onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
            <input
              required
              type="email"
              value={employeeForm.email}
              onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })}
              placeholder="alex@company.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <select
                value={employeeForm.role}
                onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Department</label>
              <input
                required
                value={employeeForm.department}
                onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingEmployee}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingEmployee ? <LoaderCircle size={17} className="animate-spin" /> : <Plus size={17} />}
            {savingEmployee ? "Saving..." : editingEmployeeId ? "Save changes" : "Add employee"}
          </button>
          {editingEmployeeId && (
            <button
              type="button"
              onClick={() => {
                setEditingEmployeeId(null);
                setEmployeeForm(emptyEmployee);
                setMessage(null);
              }}
              className="ml-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </form>
      </Panel>
    );
  }

  function renderAvailabilityForm() {
    return (
      <Panel className="p-5 sm:p-6">
        <SectionHeading
          title={editingAvailabilityId ? "Edit availability" : "Submit availability"}
          subtitle={editingAvailabilityId ? "Update the selected employee's available hours." : "Choose an employee and their available hours."}
        />
        <form onSubmit={handleAddAvailability} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Employee</label>
            <select
              required
              value={availabilityForm.employeeId}
              onChange={(event) => setAvailabilityForm({ ...availabilityForm, employeeId: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Choose an employee</option>
              {activeEmployees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
            </select>
            {activeEmployees.length === 0 && <p className="mt-1.5 text-xs text-amber-600">Activate an employee before submitting availability.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Day of the week</label>
            <select
              required
              value={availabilityForm.day}
              onChange={(event) => setAvailabilityForm({ ...availabilityForm, day: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Choose a day</option>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
              <input
                required
                type="time"
                value={availabilityForm.startTime}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, startTime: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Until</label>
              <input
                required
                type="time"
                value={availabilityForm.endTime}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, endTime: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingAvailability || activeEmployees.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAvailability ? <LoaderCircle size={17} className="animate-spin" /> : <CalendarCheck size={17} />}
            {savingAvailability ? "Saving availability..." : editingAvailabilityId ? "Update availability" : "Save availability"}
          </button>
          {editingAvailabilityId && (
            <button
              type="button"
              onClick={() => {
                setEditingAvailabilityId(null);
                setAvailabilityForm(emptyAvailability);
                setMessage(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel editing
            </button>
          )}
        </form>
      </Panel>
    );
  }

  function renderLeaveTable() {
    if (loading) return <EmptyState message="Loading leave requests..." />;
    if (leaveRequests.length === 0) return <EmptyState message="No leave requests yet." />;

    const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {currentUser.role === "manager" && <th className="px-5 py-3 font-semibold">Employee</th>}
              <th className="px-5 py-3 font-semibold">Dates</th>
              <th className="px-5 py-3 font-semibold">Reason</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Decision / actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaveRequests.map((request) => (
              <tr key={request._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                {currentUser.role === "manager" && (
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{request.employee?.name || "Employee"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{request.employee?.email || ""}</p>
                  </td>
                )}
                <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                  <div>{formatDate(request.startDate)}</div>
                  <div className="mt-1 text-xs text-slate-500">to {formatDate(request.endDate)}</div>
                </td>
                <td className="max-w-xs px-5 py-4 text-slate-600 dark:text-slate-300">
                  <p className="whitespace-pre-wrap">{request.reason}</p>
                  {request.managerNote && <p className="mt-2 text-xs text-slate-500">Manager note: {request.managerNote}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${request.status === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : request.status === "rejected" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {currentUser.role === "manager" && request.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleLeaveDecision(request, "approved")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md hover:shadow-emerald-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-0 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:shadow-emerald-400/25">Approve</button>
                      <button type="button" onClick={() => handleLeaveDecision(request, "rejected")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:translate-y-0 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900">Reject</button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {request.decisionBy?.name ? `Reviewed by ${request.decisionBy.name}` : request.status === "pending" ? "Awaiting review" : "Decision recorded"}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderLeaveManagement() {
    return (
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6">
          <SectionHeading title="Request leave" subtitle="Submit your requested dates for manager review." />
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
              <input required type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End date</label>
              <input required type="date" min={leaveForm.startDate || undefined} value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <textarea required minLength={5} maxLength={500} rows={4} value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Briefly explain your request" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <p className="mt-1 text-xs text-slate-500">5–500 characters.</p>
            </div>
            <button type="submit" disabled={savingLeave} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
              {savingLeave ? <LoaderCircle size={17} className="animate-spin" /> : <Plus size={17} />}
              {savingLeave ? "Submitting..." : "Submit leave request"}
            </button>
          </form>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">{currentUser.role === "manager" ? "All leave requests" : "My leave requests"}</h2>
              <p className="mt-1 text-sm text-slate-500">{leaveRequests.length} request(s)</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ClipboardList size={19} /></div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800">{renderLeaveTable()}</div>
        </Panel>
      </div>
    );
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="animate-spin" size={20} /> Checking your session...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="absolute right-6 top-6">
          <button type="button" onClick={() => setIsDarkMode((current) => !current)} aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-700/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-700/10" />
        <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/20"><CalendarDays size={24} /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ShiftBalance</h1>
              <p className="mt-0.5 text-xs tracking-wide text-slate-500">WORKFORCE MANAGEMENT</p>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your employee or manager account.</p>
          </div>
          {authError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{authError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
              <input type="email" autoComplete="username" required value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input type="password" autoComplete="current-password" required value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <button type="submit" disabled={authLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {authLoading ? <LoaderCircle size={17} className="animate-spin" /> : <LockKeyhole size={17} />}
              {authLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">Accounts are provisioned by a trusted project administrator. Contact your manager if you don't have login credentials.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-950/40">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">ShiftBalance</p>
            <p className="text-[11px] tracking-wide text-slate-400">WORKFORCE MANAGEMENT</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          <nav className="space-y-1">
            {visibleNavItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigateTo(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activePage === id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "conflicts" && <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">!</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Sparkles size={18} /></div>
            <p className="text-sm font-semibold text-white">Smarter scheduling</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">Build a balanced workforce, one shift at a time.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-400/20 text-sm font-bold text-indigo-200" aria-label={`${currentUser.name} initials`}>{getInitials(currentUser.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs capitalize text-slate-500">{currentUser.role}</p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Workspace</span><span>/</span>
                <span className="truncate text-slate-600">{pageInfo.title}</span>
              </div>
              <h1 className="mt-1 truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">{pageInfo.title}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employees..."
                className="w-44 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white lg:w-60"
              />
            </div>
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:flex ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              {connected ? "Connected" : "Checking API"}
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              title={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button type="button" onClick={() => loadData()} disabled={loading} aria-label="Refresh data" title={loading ? "Refreshing data…" : "Refresh data"} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-32 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{currentUser.name}</p>
              <p className="text-[10px] capitalize text-slate-500">{currentUser.role}</p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">
          <div className="mb-6"><p className="text-sm leading-6 text-slate-500">{pageInfo.description}</p></div>

          {message && (
            <div role="status" className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {message.type === "error" ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
              <p className="flex-1">{message.text}</p>
              <button aria-label="Dismiss message" onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100"><X size={16} /></button>
            </div>
          )}

          {selectedEmployee && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}>
              <section role="dialog" aria-modal="true" aria-labelledby="profile-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Employee Profile</p>
                    <h2 id="profile-title" className="mt-1 text-xl font-bold text-slate-900">Employee details</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedEmployee(null)} aria-label="Close employee profile" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={19} /></button>
                </div>
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700">{(selectedEmployee.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-900">{selectedEmployee.name}</h3>
                      <p className="truncate text-sm text-slate-500">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 px-4">
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Role</span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">{selectedEmployee.role}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Status</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedEmployee.isActive === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                        {selectedEmployee.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Department</span>
                      <span className="text-sm font-semibold text-slate-800">{selectedEmployee.department || "General"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Employee ID</span>
                      <span className="max-w-[60%] break-all text-right font-mono text-xs text-slate-600">{selectedEmployee._id}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Joined</span>
                      <span className="text-sm font-medium text-slate-700">{selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString() : "Not available"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <button type="button" onClick={() => setSelectedEmployee(null)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Close profile</button>
                </div>
              </section>
            </div>
          )}

          {activePage === "overview" && (
            <>
              <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-900/10 sm:p-9">
                <div className="relative z-10 max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-50"><Sparkles size={14} />Your workforce, in balance</div>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Plan better shifts.<br className="hidden sm:block" /> Build a happier team.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">Keep employee records organized and availability visible before building your weekly roster.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {currentUser.role === "manager" && <button onClick={() => navigateTo("employees")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"><Plus size={17} />Add employee</button>}
                    <button onClick={() => navigateTo("availability")} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">{currentUser.role === "manager" ? "Manage availability" : "My availability"}<ArrowUpRight size={16} /></button>
                    <button onClick={() => navigateTo("leave")} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Leave requests<ArrowUpRight size={16} /></button>
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-1 -top-12 h-64 w-64 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -bottom-36 right-24 h-64 w-64 rounded-full bg-white/[0.06] blur-sm" />
                <CalendarDays className="pointer-events-none absolute bottom-8 right-9 hidden text-white/[0.12] sm:block" size={150} strokeWidth={1} />
              </section>

              <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total employees" value={loading ? "—" : employees.length} subtitle="Employee records in the system" icon={Users} color="indigo" />
                <StatCard title="Availability slots" value={loading ? "—" : availability.length} subtitle="Submitted employee time slots" icon={Clock3} color="emerald" />
                <StatCard title="Departments" value={loading ? "—" : departments} subtitle="Departments represented" icon={BriefcaseBusiness} color="amber" />
                <StatCard title="Database connection" value={loading ? "…" : connected ? "Online" : "Offline"} subtitle={connected ? "API data loaded successfully" : "Check the backend server"} icon={CalendarCheck} color={connected ? "blue" : "amber"} />
              </div>

              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                {currentUser.role === "manager" && <Panel className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                    <div><h2 className="font-bold tracking-tight">Employee directory</h2><p className="mt-1 text-sm text-slate-500">Your workforce at a glance</p></div>
                    <button onClick={() => navigateTo("employees")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50">View all <ArrowUpRight size={15} /></button>
                  </div>
                  <div className="border-t border-slate-100">
                    {loading ? <EmptyState message="Loading employees..." /> : employees.length === 0 ? <EmptyState message="Add your first employee to get started." /> : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {employees.slice(0, 5).map((employee) => (
                          <div key={employee._id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{(employee.name || "?").charAt(0).toUpperCase()}</div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{employee.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{employee.email}</p></div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{employee.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>}

                <Panel className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                    <div><h2 className="font-bold tracking-tight">Recent availability</h2><p className="mt-1 text-sm text-slate-500">Submitted working hours</p></div>
                    <button onClick={() => navigateTo("availability")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50">View all <ArrowUpRight size={15} /></button>
                  </div>
                  <div className="border-t border-slate-100">
                    {loading ? <EmptyState message="Loading availability..." /> : availability.length === 0 ? <EmptyState message="Availability records will appear here." /> : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {availability.slice(0, 5).map((record) => (
                          <div key={record._id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CalendarCheck size={19} /></div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{record.employee?.name || "Employee"}</p><p className="mt-0.5 text-xs text-slate-500">{record.day}</p>{record.needsReview && <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">Review required</p>}</div>
                            <span className="whitespace-nowrap rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{record.startTime} – {record.endTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              </div>

              <Panel className="mt-6 p-5 sm:p-6">
                <SectionHeading title="Next up" subtitle="Build out the rest of your workforce workflow." />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { icon: CalendarDays, title: "Weekly shift roster", description: "Assign employees to shifts based on availability." },
                    { icon: AlertTriangle, title: "Conflict detection", description: "Flag overlapping shifts and unsuitable assignments." },
                    { icon: ClipboardList, title: "Leave management", description: "Track leave requests and manager decisions." },
                  ].map(({ icon: Icon, title, description }) => (
                    <div key={title} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon size={19} /></div>
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Planned</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {activePage === "employees" && (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              {renderEmployeeForm()}
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                  <div><h2 className="font-bold">All employees</h2><p className="mt-1 text-sm text-slate-500">{employees.length} employee record(s)</p></div>
                  <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Users size={19} /></div>
                </div>
                <div className="border-t border-slate-100">{renderEmployeeTable()}</div>
              </Panel>
            </div>
          )}

          {activePage === "availability" && (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              {renderAvailabilityForm()}
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                  <div><h2 className="font-bold">Availability records</h2><p className="mt-1 text-sm text-slate-500">{availability.length} submitted slot(s)</p></div>
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CalendarCheck size={19} /></div>
                </div>
                <div className="border-t border-slate-100">{renderAvailabilityTable()}</div>
              </Panel>
            </div>
          )}

          {activePage === "leave" && renderLeaveManagement()}

          {(activePage === "schedule" || activePage === "conflicts") && currentUser.role === "manager" && (
            <Panel className="mx-auto max-w-3xl p-8 text-center sm:p-12">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">{activePage === "schedule" ? <CalendarDays size={27} /> : <AlertTriangle size={27} />}</div>
              <h2 className="text-xl font-bold text-slate-900">{activePage === "schedule" ? "Weekly shift scheduling" : "Scheduling conflict detection"}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{activePage === "schedule" ? "This module will let managers assign employees to shifts using the availability records we have already built." : "This module will check assignments for overlapping hours and conflicts with employee availability."}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"><Clock3 size={14} />Planned — not implemented yet</div>
              <div className="mt-7"><button onClick={() => navigateTo(activePage === "schedule" ? "availability" : "employees")} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">{activePage === "schedule" ? "Review availability" : "View employees"}<ArrowUpRight size={16} /></button></div>
            </Panel>
          )}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400">
            <p>© 2026 ShiftBalance · Workforce Management</p>
            <p className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />{connected ? "Connected to backend API" : "Backend connection unavailable"}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
