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
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "availability", label: "Availability", icon: CalendarCheck },
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

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
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
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("shiftbalance-theme") === "dark"
  );

  async function loadData() {
    setLoading(true);

    try {
      const [employeeData, availabilityData] = await Promise.all([
        apiRequest("/employees"),
        apiRequest("/availability"),
      ]);

      setEmployees(employeeData);
      setAvailability(availabilityData);
      setConnected(true);
    } catch (error) {
      setConnected(false);
      setMessage({ type: "error", text: error.message });
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
    loadData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    localStorage.setItem("shiftbalance-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

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
      title: "Availability",
      description: "Track when your employees are available to work.",
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

  function navigateTo(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
    setMessage(null);
  }

  function EmployeeTable() {
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
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Employee</th>
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEmployees.map((employee) => (
              <tr key={employee._id} className="transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                      {(employee.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{employee.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{employee.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{employee.department || "General"}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                    {employee.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditEmployee(employee)}
                      className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => viewEmployeeProfile(employee._id)}
                      className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View Profile
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function AvailabilityTable() {
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
            {availability.map((record) => (
              <tr key={record._id} className="transition hover:bg-slate-50/80">
                <td className="px-5 py-4 font-medium text-slate-800">{record.employee?.name || "Employee"}</td>
                <td className="px-5 py-4 text-slate-600">{record.day}</td>
                <td className="px-5 py-4 text-slate-600">{record.startTime} – {record.endTime}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleEditAvailability(record)}
                    className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function EmployeeForm() {
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

  function AvailabilityForm() {
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
              {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
            </select>
            {employees.length === 0 && <p className="mt-1.5 text-xs text-amber-600">Add an employee before submitting availability.</p>}
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
            disabled={savingAvailability || employees.length === 0}
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200">
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
            {navItems.map(({ id, label, icon: Icon }) => (
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-400/20 text-sm font-bold text-indigo-200">DK</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Workspace Admin</p>
              <p className="text-xs text-slate-500">Local development</p>
            </div>
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
            <button onClick={loadData} aria-label="Refresh data" title="Refresh data" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">DK</div>
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
                    <button onClick={() => navigateTo("employees")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"><Plus size={17} />Add employee</button>
                    <button onClick={() => navigateTo("availability")} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Manage availability<ArrowUpRight size={16} /></button>
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
                <Panel className="overflow-hidden">
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
                </Panel>

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
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{record.employee?.name || "Employee"}</p><p className="mt-0.5 text-xs text-slate-500">{record.day}</p></div>
                            <span className="whitespace-nowrap rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">{record.startTime} – {record.endTime}</span>
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
                    { icon: UserRound, title: "Authentication", description: "Add secure login and role-specific permissions." },
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
              <EmployeeForm />
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                  <div><h2 className="font-bold">All employees</h2><p className="mt-1 text-sm text-slate-500">{employees.length} employee record(s)</p></div>
                  <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Users size={19} /></div>
                </div>
                <div className="border-t border-slate-100"><EmployeeTable /></div>
              </Panel>
            </div>
          )}

          {activePage === "availability" && (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <AvailabilityForm />
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                  <div><h2 className="font-bold">Availability records</h2><p className="mt-1 text-sm text-slate-500">{availability.length} submitted slot(s)</p></div>
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CalendarCheck size={19} /></div>
                </div>
                <div className="border-t border-slate-100"><AvailabilityTable /></div>
              </Panel>
            </div>
          )}

          {(activePage === "schedule" || activePage === "conflicts") && (
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
