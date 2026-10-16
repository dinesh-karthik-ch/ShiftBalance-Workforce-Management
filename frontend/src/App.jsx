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
  Bell,
  CheckCheck,
  ClipboardCheck,
  BarChart3,
  FileBarChart,
  Check,

} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "availability", label: "Availability", icon: CalendarCheck },
  { id: "leave", label: "Leave Management", icon: ClipboardList },
  { id: "schedule", label: "Shift Schedule", icon: CalendarDays },
  { id: "conflicts", label: "Conflicts", icon: AlertTriangle },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
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

const SCHEDULING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekMonday(date = new Date()) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dateInputValue(monday);
}

function addDaysToDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
}

function formatScheduleDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
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
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
  };

  return (
    <Panel className="p-5 transition hover:shadow-md">
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
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSelections, setAttendanceSelections] = useState({});
  const [conflictItems, setConflictItems] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [markingNotification, setMarkingNotification] = useState(false);
  const [publishingSchedule, setPublishingSchedule] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const savedWeek = localStorage.getItem("shiftbalance-selected-week");
    return savedWeek && /^\d{4}-\d{2}-\d{2}$/.test(savedWeek) ? savedWeek : getWeekMonday();
  });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "09:00", endTime: "17:00", daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], requiredStaff: "1" });
  const [editingShiftTemplateId, setEditingShiftTemplateId] = useState(null);
  const [savingShiftTemplate, setSavingShiftTemplate] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("shiftbalance-theme") === "dark"
  );

  async function loadData(user = currentUser) {
    if (!user) return;
    setLoading(true);

    try {
      const isManager = user.role === "manager";
      setScheduleLoading(true);
      const [employeeData, availabilityData, leaveData, shiftData, templateData, attendanceData, notificationData, conflictData, reports] = await Promise.all([
        isManager ? apiRequest("/employees") : Promise.resolve([user]),
        apiRequest("/availability"),
        apiRequest("/leave"),
        apiRequest(`/shifts?weekStart=${selectedWeekStart}`),
        isManager ? apiRequest("/shifts/templates") : Promise.resolve([]),
        apiRequest(`/attendance?weekStart=${selectedWeekStart}`),
        apiRequest("/notifications"),
        isManager ? apiRequest(`/conflicts?weekStart=${selectedWeekStart}`) : Promise.resolve({ conflicts: [] }),
        isManager ? apiRequest(`/reports?weekStart=${selectedWeekStart}`) : Promise.resolve(null),
      ]);

      setEmployees(employeeData);
      setAvailability(availabilityData);
      setLeaveRequests(leaveData);
      setShiftAssignments(shiftData);
      setShiftTemplates(templateData);
      setAttendanceRecords(attendanceData);
      setNotifications(notificationData);
      setConflictItems(conflictData.conflicts || []);
      setReportData(reports);
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
      setScheduleLoading(false);
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
    localStorage.setItem("shiftbalance-selected-week", selectedWeekStart);
  }, [selectedWeekStart]);

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
    setShiftTemplates([]);
    setShiftAssignments([]);
    setAttendanceRecords([]);
    setConflictItems([]);
    setReportData(null);
    setNotifications([]);
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

  async function handleDeleteEmployee(employee) {
    const confirmed = window.confirm(
      `Permanently delete ${employee.name}? This also removes their availability, leave history, attendance records, and notifications, and unassigns them from existing shifts. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/employees/${employee._id}`, { method: "DELETE" });
      if (selectedEmployee?._id === employee._id) setSelectedEmployee(null);
      if (editingEmployeeId === employee._id) {
        setEditingEmployeeId(null);
        setEmployeeForm(emptyEmployee);
      }
      await loadData();
      notify("success", `${employee.name} and their personal records were deleted.`);
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteLeaveRequest(request) {
    const employeeName = request.employee?.name || "your";
    const confirmed = window.confirm(
      `Delete ${employeeName} leave request for ${formatDate(request.startDate)} to ${formatDate(request.endDate)}? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/leave/${request._id}`, { method: "DELETE" });
      await loadData(currentUser);
      notify("success", "Leave request deleted successfully.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteShiftTemplate(template) {
    const confirmed = window.confirm(
      `Permanently delete "${template.name}" and all generated shift slots based on it, including any attendance records attached to those slots? Published shifts will send cancellation notifications. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const result = await apiRequest(`/shifts/templates/${template._id}`, { method: "DELETE" });
      if (editingShiftTemplateId === template._id) {
        setEditingShiftTemplateId(null);
        setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], requiredStaff: "1" });
      }
      await loadData(currentUser);
      notify("success", result.message || "Shift template deleted.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteShift(shift) {
    const confirmed = window.confirm(
      `Delete ${shift.shiftName} on ${formatScheduleDate(shift.date)} (${shift.startTime}–${shift.endTime})? Any attendance record for this shift will also be deleted${shift.published ? ", and assigned employees will be notified" : ""}.`
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/shifts/${shift._id}`, { method: "DELETE" });
      await loadData(currentUser);
      notify("success", "Shift assignment deleted.");
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

  async function handleSaveShiftTemplate(event) {
    event.preventDefault();
    setSavingShiftTemplate(true);
    setMessage(null);
    const payload = { ...shiftForm, requiredStaff: Number(shiftForm.requiredStaff) };
    try {
      await apiRequest(editingShiftTemplateId ? `/shifts/templates/${editingShiftTemplateId}` : "/shifts/templates", {
        method: editingShiftTemplateId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], requiredStaff: "1" });
      setEditingShiftTemplateId(null);
      await loadData(currentUser);
      notify("success", editingShiftTemplateId ? "Shift template updated successfully." : "Shift template created successfully.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSavingShiftTemplate(false);
    }
  }

  function handleEditShiftTemplate(template) {
    setEditingShiftTemplateId(template._id);
    setShiftForm({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      daysOfWeek: [...template.daysOfWeek],
      requiredStaff: String(template.requiredStaff),
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleShiftTemplate(template) {
    try {
      await apiRequest(`/shifts/templates/${template._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !template.active }),
      });
      await loadData(currentUser);
      notify("success", `Shift template ${template.active ? "deactivated" : "activated"}.`);
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleGenerateSchedule() {
    if (shiftTemplates.filter((template) => template.active).length === 0) {
      notify("error", "Create and activate at least one shift template before generating a schedule.");
      return;
    }
    if (!window.confirm(`Generate the schedule for the week starting ${selectedWeekStart}? Existing generated assignments for this week will be replaced.`)) return;
    setGeneratingSchedule(true);
    setMessage(null);
    try {
      const result = await apiRequest("/shifts/generate", {
        method: "POST",
        body: JSON.stringify({ weekStart: selectedWeekStart }),
      });
      setShiftAssignments(result.shifts || []);
      await loadData(currentUser);
      notify("success", `Schedule generated: ${result.totalShifts} shift slot(s), ${result.fullyStaffed} fully staffed, ${result.understaffed} needing more staff. Publish it when ready so employees can see it.`);
    } catch (error) {
      notify("error", error.message);
    } finally {
      setGeneratingSchedule(false);
    }
  }

  async function handlePublishSchedule() {
    if (!shiftAssignments.length) {
      notify("error", "Generate the weekly schedule before publishing it.");
      return;
    }
    if (shiftAssignments.every((shift) => shift.published)) {
      notify("success", "This weekly schedule is already published.");
      return;
    }
    if (!window.confirm(`Publish the schedule for the week starting ${selectedWeekStart}? Assigned employees will be notified.`)) return;
    setPublishingSchedule(true);
    try {
      await apiRequest("/shifts/publish", { method: "POST", body: JSON.stringify({ weekStart: selectedWeekStart }) });
      await loadData(currentUser);
      notify("success", "Schedule published. Assigned employees can now view their shifts.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setPublishingSchedule(false);
    }
  }

  async function handleSaveAttendance(shift, employee) {
    const key = `${shift._id}:${employee._id}`;
    const existing = attendanceRecords.find((record) => record.shiftAssignment?._id === shift._id && record.employee?._id === employee._id);
    const status = attendanceSelections[key] || existing?.status || "";
    if (!status) {
      notify("error", "Choose an attendance status before saving.");
      return;
    }
    try {
      await apiRequest(`/attendance/${shift._id}/${employee._id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadData(currentUser);
      notify("success", `Attendance saved for ${employee.name}.`);
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteAttendanceRecord(shift, employee, record) {
    if (!window.confirm(`Delete the ${record.status} attendance record for ${employee.name} on ${shift.date}? You can record it again later.`)) return;
    try {
      await apiRequest(`/attendance/${shift._id}/${employee._id}`, { method: "DELETE" });
      setAttendanceSelections((state) => {
        const next = { ...state };
        delete next[`${shift._id}:${employee._id}`];
        return next;
      });
      await loadData(currentUser);
      notify("success", "Attendance record deleted.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleDeleteNotification(notification) {
    if (!window.confirm(`Delete notification "${notification.title}"?`)) return;
    try {
      await apiRequest(`/notifications/${notification._id}`, { method: "DELETE" });
      setNotifications((current) => current.filter((item) => item._id !== notification._id));
      notify("success", "Notification deleted.");
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleMarkNotificationRead(notification) {
    try {
      await apiRequest(`/notifications/${notification._id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (error) {
      notify("error", error.message);
    }
  }

  async function handleMarkAllNotificationsRead() {
    setMarkingNotification(true);
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      const timestamp = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: timestamp }));
      notify("success", "All notifications marked as read.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setMarkingNotification(false);
    }
  }

  function exportReportCsv() {
    if (!reportData) return;
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Employee", "Department", "Assigned shifts", "Scheduled minutes", "Present", "Late", "Absent", "Attendance marked"],
      ...reportData.workload.map((row) => [row.name, row.department, row.assignedShifts, row.scheduledMinutes, row.present, row.late, row.absent, row.attendanceMarked]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shiftbalance-report-${selectedWeekStart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleWeekChange(event) {
    const selectedDate = event.target.value;
    if (!selectedDate) return;
    const nextWeek = getWeekMonday(new Date(`${selectedDate}T12:00:00`));
    setSelectedWeekStart(nextWeek);
    setScheduleLoading(true);
    try {
      const isManager = currentUser?.role === "manager";
      const [shiftData, attendanceData, conflictData, reports] = await Promise.all([
        apiRequest(`/shifts?weekStart=${nextWeek}`),
        apiRequest(`/attendance?weekStart=${nextWeek}`),
        isManager ? apiRequest(`/conflicts?weekStart=${nextWeek}`) : Promise.resolve({ conflicts: [] }),
        isManager ? apiRequest(`/reports?weekStart=${nextWeek}`) : Promise.resolve(null),
      ]);
      setShiftAssignments(shiftData);
      setAttendanceRecords(attendanceData);
      setConflictItems(conflictData.conflicts || []);
      setReportData(reports);
    } catch (error) {
      notify("error", error.message);
    } finally {
      setScheduleLoading(false);
    }
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
      title: currentUser?.role === "manager" ? "Shift Schedule" : "My Shift Schedule",
      description: currentUser?.role === "manager" ? "Define shift rules and generate a balanced weekly roster." : "View the shifts assigned to you for each week.",
    },
    conflicts: {
      title: "Scheduling Conflicts",
      description: "Identify and resolve overlapping assignments, leave clashes, and staffing gaps.",
    },
    attendance: {
      title: currentUser?.role === "manager" ? "Attendance" : "My Attendance",
      description: currentUser?.role === "manager" ? "Record attendance for published shift assignments." : "Review your recorded attendance history.",
    },
    reports: {
      title: "Workforce Reports",
      description: "Review weekly staffing, attendance, leave, and workload metrics.",
    },
    notifications: {
      title: "Notifications",
      description: "Review leave decisions, published schedules, and attendance updates.",
    },
  }[activePage];

  const visibleNavItems = currentUser?.role === "manager"
    ? navItems
    : navItems.filter((item) => ["overview", "availability", "leave", "schedule", "attendance", "notifications"].includes(item.id));

  function navigateTo(page) {
    if (currentUser?.role !== "manager" && ["employees", "conflicts", "reports"].includes(page)) {
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
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
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEmployeeStatus(employee)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 ${isActive ? "bg-rose-50 text-rose-700 hover:bg-rose-100 hover:shadow-lg hover:shadow-rose-300/50 focus-visible:ring-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 dark:hover:shadow-rose-950" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-300/60 focus-visible:ring-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:shadow-emerald-950"}`}
                      >
                        {isActive ? <Power size={14} /> : <RotateCcw size={14} />}
                        {isActive ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(employee)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                        aria-label={`Delete ${employee.name}`}
                      >
                        <Trash2 size={14} /> Delete
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
                        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
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
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <select
                value={employeeForm.role}
                onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingEmployee}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
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
          subtitle={editingAvailabilityId ? "Update the available hours for this slot." : currentUser.role === "manager" ? "Choose an employee and their available hours." : "Tell your manager when you are available to work."}
        />
        <form onSubmit={handleAddAvailability} className="space-y-4">
          {currentUser.role === "manager" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Employee</label>
              <select
                required
                value={availabilityForm.employeeId}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, employeeId: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Choose an employee</option>
                {activeEmployees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
              </select>
              {activeEmployees.length === 0 && <p className="mt-1.5 text-xs text-amber-600">Activate an employee before submitting availability.</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Availability for</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
              <p className="mt-1 text-xs text-slate-500">This slot will be saved to your account.</p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Day of the week</label>
            <select
              required
              value={availabilityForm.day}
              onChange={(event) => setAvailabilityForm({ ...availabilityForm, day: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Until</label>
              <input
                required
                type="time"
                value={availabilityForm.endTime}
                onChange={(event) => setAvailabilityForm({ ...availabilityForm, endTime: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingAvailability || activeEmployees.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
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
                      <button type="button" onClick={() => handleLeaveDecision(request, "approved")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 dark:hover:shadow-emerald-950">Approve</button>
                      <button type="button" onClick={() => handleLeaveDecision(request, "rejected")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 hover:shadow-lg hover:shadow-rose-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900">Reject</button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {request.decisionBy?.name ? `Reviewed by ${request.decisionBy.name}` : request.status === "pending" ? "Awaiting review" : "Decision recorded"}
                    </div>
                  )}
                  {(currentUser.role === "manager" || request.status === "pending") && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLeaveRequest(request)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                    >
                      <Trash2 size={13} /> Delete request
                    </button>
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
              <input required type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End date</label>
              <input required type="date" min={leaveForm.startDate || undefined} value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <textarea required minLength={5} maxLength={500} rows={4} value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} placeholder="Briefly explain your request" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              <p className="mt-1 text-xs text-slate-500">5–500 characters.</p>
            </div>
            <button type="submit" disabled={savingLeave} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:opacity-60">
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
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><ClipboardList size={19} /></div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800">{renderLeaveTable()}</div>
        </Panel>
      </div>
    );
  }

  function ShiftSchedulePage() {
    const weekEnd = addDaysToDate(selectedWeekStart, 6);
    const fullyStaffedCount = shiftAssignments.filter((shift) => (shift.assignedEmployees?.length || 0) >= shift.requiredStaff).length;
    const understaffedCount = shiftAssignments.length - fullyStaffedCount;
    const assignedEmployeesCount = new Set(shiftAssignments.flatMap((shift) => (shift.assignedEmployees || []).map((employee) => employee._id))).size;

    const scheduleTable = (
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{currentUser.role === "manager" ? "Generated weekly roster" : "My assigned shifts"}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatScheduleDate(selectedWeekStart)} – {formatScheduleDate(weekEnd)} · {shiftAssignments.length} shift slot(s)</p>
            {currentUser.role === "manager" && shiftAssignments.length > 0 && <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${shiftAssignments.every((shift) => shift.published) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{shiftAssignments.every((shift) => shift.published) ? "Published to employees" : "Draft — not visible to employees"}</span>}
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><CalendarDays size={19} /></div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          {scheduleLoading ? <EmptyState message="Loading schedule..." /> : shiftAssignments.length === 0 ? (
            <EmptyState message={currentUser.role === "manager" ? "No schedule generated for this week yet. Set up shift templates, then generate the roster." : "No shifts are assigned to you for this week yet."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Shift</th>
                    {currentUser.role === "manager" && <th className="px-5 py-3 font-semibold">Assigned employees</th>}
                    <th className="px-5 py-3 font-semibold">Staffing</th>
                    {currentUser.role === "manager" && <th className="px-5 py-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shiftAssignments.map((shift) => {
                    const assigned = shift.assignedEmployees?.length || 0;
                    const staffed = assigned >= shift.requiredStaff;
                    return (
                      <tr key={shift._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{formatScheduleDate(shift.date)}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{shift.day}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{shift.shiftName}</p>
                          <p className="mt-1 text-xs text-slate-500">{shift.startTime} – {shift.endTime}</p>
                        </td>
                        {currentUser.role === "manager" && (
                          <td className="px-5 py-4">
                            {assigned ? <div className="flex flex-wrap gap-1.5">{shift.assignedEmployees.map((employee) => <span key={employee._id} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{employee.name}</span>)}</div> : <span className="text-xs text-slate-500">No eligible employees</span>}
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${staffed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                            {assigned}/{shift.requiredStaff} {staffed ? "staffed" : `· ${shift.requiredStaff - assigned} needed`}
                          </span>
                        </td>
                        {currentUser.role === "manager" && (
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(shift)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                              aria-label={`Delete ${shift.shiftName} on ${shift.date}`}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>
    );

    if (currentUser.role !== "manager") {
      return (
        <div className="space-y-5">
          <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div><h2 className="font-bold text-slate-900 dark:text-slate-100">Choose a week</h2><p className="mt-1 text-sm text-slate-500">The selected date is normalized to that week's Monday.</p></div>
            <input type="date" value={selectedWeekStart} onChange={handleWeekChange} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" />
          </Panel>
          {scheduleTable}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div><h2 className="font-bold text-slate-900 dark:text-slate-100">Weekly planning window</h2><p className="mt-1 text-sm text-slate-500">Choose any date; scheduling uses the Monday–Sunday week containing it.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <input aria-label="Select schedule week" type="date" value={selectedWeekStart} onChange={handleWeekChange} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" />
            <button type="button" onClick={handleGenerateSchedule} disabled={generatingSchedule || scheduleLoading || shiftTemplates.every((template) => !template.active)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
              {generatingSchedule ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {generatingSchedule ? "Generating..." : "Generate weekly schedule"}
            </button>
            <button type="button" onClick={handlePublishSchedule} disabled={publishingSchedule || !shiftAssignments.length || shiftAssignments.every((shift) => shift.published)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] hover:shadow-lg hover:shadow-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
              {publishingSchedule ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
              {publishingSchedule ? "Publishing..." : shiftAssignments.length && shiftAssignments.every((shift) => shift.published) ? "Schedule published" : "Publish schedule"}
            </button>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Shift slots" value={shiftAssignments.length} subtitle="Scheduled this week" icon={CalendarDays} color="emerald" />
          <StatCard title="Fully staffed" value={fullyStaffedCount} subtitle="Staffing requirement met" icon={CheckCircle2} color="emerald" />
          <StatCard title="Staffing gaps" value={understaffedCount} subtitle="Slots need more people" icon={AlertTriangle} color="amber" />
          <StatCard title="Employees scheduled" value={assignedEmployeesCount} subtitle="Unique employees assigned" icon={Users} color="blue" />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Panel className="p-5 sm:p-6">
              <SectionHeading title={editingShiftTemplateId ? "Edit shift template" : "Define shift timings"} subtitle="Create reusable shift rules and staffing targets." />
              <form onSubmit={handleSaveShiftTemplate} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Shift name</label>
                  <input required minLength={2} maxLength={60} value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} placeholder="e.g. Morning shift" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Start time</label><input required type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End time</label><input required type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" /></div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Minimum employees needed</label>
                  <input required type="number" min="1" max="100" step="1" value={shiftForm.requiredStaff} onChange={(event) => setShiftForm({ ...shiftForm, requiredStaff: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900" />
                </div>
                <div>
                  <p className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Days of operation</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    {SCHEDULING_DAYS.map((day) => (
                      <label key={day} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={shiftForm.daysOfWeek.includes(day)} onChange={(event) => setShiftForm({ ...shiftForm, daysOfWeek: event.target.checked ? [...shiftForm.daysOfWeek, day] : shiftForm.daysOfWeek.filter((item) => item !== day) })} />{day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={savingShiftTemplate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:opacity-60">
                  {savingShiftTemplate ? <LoaderCircle size={17} className="animate-spin" /> : editingShiftTemplateId ? <RefreshCw size={17} /> : <Plus size={17} />}
                  {savingShiftTemplate ? "Saving..." : editingShiftTemplateId ? "Update shift template" : "Save shift template"}
                </button>
                {editingShiftTemplateId && <button type="button" onClick={() => { setEditingShiftTemplateId(null); setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], requiredStaff: "1" }); }} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel editing</button>}
              </form>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-5"><div><h2 className="font-bold text-slate-900 dark:text-slate-100">Shift templates</h2><p className="mt-1 text-sm text-slate-500">{shiftTemplates.filter((template) => template.active).length} active template(s)</p></div><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><Clock3 size={19} /></div></div>
              <div className="border-t border-slate-100 dark:border-slate-800">
                {shiftTemplates.length === 0 ? <EmptyState message="No templates yet. Add your first shift timing above." /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shiftTemplates.map((template) => (
                    <div key={template._id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-800 dark:text-slate-100">{template.name}</p><p className="mt-1 text-xs text-slate-500">{template.startTime}–{template.endTime} · {template.requiredStaff} needed</p><p className="mt-1 text-xs text-slate-500">{template.daysOfWeek.map((day) => day.slice(0, 3)).join(", ")}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${template.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{template.active ? "Active" : "Inactive"}</span></div>
                      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => handleEditShiftTemplate(template)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Edit</button><button type="button" onClick={() => handleToggleShiftTemplate(template)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${template.active ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"}`}>{template.active ? <Power size={13} /> : <RotateCcw size={13} />}{template.active ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => handleDeleteShiftTemplate(template)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"><Trash2 size={13} /> Delete</button></div>
                    </div>
                  ))}
                </div>}
              </div>
            </Panel>
          </div>
          {scheduleTable}
        </div>
        <Panel className="p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950 dark:text-amber-300"><Sparkles size={18} /></div><div><h2 className="font-bold text-slate-900 dark:text-slate-100">Scheduling rules used</h2><p className="mt-1 text-sm leading-6 text-slate-500">Only active employee accounts are considered. Their availability must cover the full shift, approved leave blocks an assignment, an employee gets at most one shift per day, and the generator prioritizes employees with fewer shifts and minutes already assigned that week. Unfilled staffing requirements remain visible for the manager to address.</p></div></div></Panel>
      </div>
    );
  }

  function renderConflictsPage() {
    const highPriority = conflictItems.filter((item) => item.severity === "high").length;
    return (
      <div className="space-y-5">
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div><h2 className="font-bold text-slate-900 dark:text-slate-100">Weekly conflict review</h2><p className="mt-1 text-sm text-slate-500">Week beginning {formatScheduleDate(selectedWeekStart)} · {conflictItems.length} issue(s) found</p></div>
          <button type="button" onClick={() => loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"><RefreshCw size={16} /> Refresh analysis</button>
        </Panel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total issues" value={conflictItems.length} subtitle="All detected conflicts" icon={AlertTriangle} color="amber" />
          <StatCard title="High priority" value={highPriority} subtitle="Needs manager review" icon={AlertTriangle} color="blue" />
          <StatCard title="Staffing gaps" value={conflictItems.filter((item) => item.type === "understaffed").length} subtitle="Shift slots below target" icon={Users} color="emerald" />
        </div>
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800"><h2 className="font-bold">Detected conflicts</h2><p className="mt-1 text-sm text-slate-500">Overlap, availability, approved leave, inactive employee and understaffing checks.</p></div>
          {conflictItems.length === 0 ? <EmptyState message="No conflicts detected for this week. Generate a schedule after availability and leave are up to date." /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{conflictItems.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className={`mt-0.5 rounded-xl p-2 ${item.severity === "high" ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-50 text-amber-600"}`}><AlertTriangle size={18} /></div><div><p className="font-semibold text-slate-900 dark:text-slate-100">{item.message}</p><p className="mt-1 text-xs text-slate-500">{item.date ? formatScheduleDate(item.date) : "This week"} {item.shiftName ? `· ${item.shiftName}` : ""}</p></div></div><span className="self-start rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold capitalize text-rose-700 dark:bg-rose-950 dark:text-rose-300">{item.type.replace(/-/g, " ")}</span></div>)}</div>}
        </Panel>
        {conflictItems.length > 0 && <Panel className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h3 className="font-bold">Try resolving by regenerating</h3><p className="mt-1 text-sm text-slate-500">The generator re-checks availability and approved leave. If gaps remain, adjust staffing requirements or employee availability first.</p></div><button type="button" onClick={handleGenerateSchedule} disabled={generatingSchedule || shiftAssignments.some((shift) => shift.published && attendanceRecords.length > 0)} className="rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50">Regenerate schedule</button></Panel>}
      </div>
    );
  }

  function renderAttendancePage() {
    const manager = currentUser.role === "manager";
    const publishedShifts = shiftAssignments.filter((shift) => shift.published);
    return (
      <div className="space-y-5">
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div><h2 className="font-bold text-slate-900 dark:text-slate-100">{manager ? "Record team attendance" : "My attendance history"}</h2><p className="mt-1 text-sm text-slate-500">Week beginning {formatScheduleDate(selectedWeekStart)} · {attendanceRecords.length} record(s)</p></div>
          {manager && <button type="button" onClick={exportReportCsv} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Export weekly report</button>}
        </Panel>
        {manager ? (
          <Panel className="overflow-hidden">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800"><h3 className="font-bold">Published shift attendance</h3><p className="mt-1 text-sm text-slate-500">Publish a generated schedule before recording attendance.</p></div>
            {publishedShifts.length === 0 ? <EmptyState message="No published shifts for this week yet." /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{publishedShifts.map((shift) => <div key={shift._id} className="p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{formatScheduleDate(shift.date)} · {shift.shiftName}</p><p className="mt-1 text-xs text-slate-500">{shift.startTime}–{shift.endTime}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{shift.assignedEmployees.length} assigned</span></div>{shift.assignedEmployees.length === 0 ? <p className="text-sm text-amber-600">No employees assigned; resolve staffing gaps.</p> : <div className="space-y-2">{shift.assignedEmployees.map((employee) => { const key = `${shift._id}:${employee._id}`; const existing = attendanceRecords.find((record) => record.shiftAssignment?._id === shift._id && record.employee?._id === employee._id); const value = attendanceSelections[key] ?? existing?.status ?? ""; return <div key={key} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-800"><div className="min-w-0 flex-1"><p className="font-medium">{employee.name}</p><p className="text-xs text-slate-500">{employee.department || "General"}{existing ? ` · previously marked ${existing.status}` : " · not marked yet"}</p></div><select value={value} onChange={(event) => setAttendanceSelections((state) => ({ ...state, [key]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Choose status</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select><button type="button" onClick={() => handleSaveAttendance(shift, employee)} disabled={!value} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">Save</button>{existing && <button type="button" onClick={() => handleDeleteAttendanceRecord(shift, employee, existing)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950" aria-label={`Delete attendance for ${employee.name}`}><Trash2 size={13} /> Delete</button>}</div>; })}</div>}</div>)}</div>}
          </Panel>
        ) : (
          <Panel className="overflow-hidden"><div className="border-b border-slate-100 p-5 dark:border-slate-800"><h3 className="font-bold">Attendance history</h3></div>{attendanceRecords.length === 0 ? <EmptyState message="No attendance has been recorded for this week." /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Shift</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Recorded</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{attendanceRecords.map((record) => <tr key={record._id}><td className="px-5 py-4">{formatScheduleDate(record.date)}</td><td className="px-5 py-4">{record.shiftName}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${record.status === "present" ? "bg-emerald-50 text-emerald-700" : record.status === "late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{record.status}</span></td><td className="px-5 py-4 text-slate-500">{record.recordedAt ? new Date(record.recordedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}</Panel>
        )}
      </div>
    );
  }

  function renderReportsPage() {
    if (!reportData) return <Panel className="p-6"><EmptyState message="Loading workforce report..." /></Panel>;
    const summary = reportData.summary || {};
    return (
      <div className="space-y-5">
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="font-bold">Weekly workforce report</h2><p className="mt-1 text-sm text-slate-500">{formatScheduleDate(reportData.weekStart)} – {formatScheduleDate(reportData.weekEnd)}</p></div><button type="button" onClick={exportReportCsv} className="inline-flex items-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca]"><FileBarChart size={16} /> Export CSV</button></Panel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Active employees" value={summary.activeEmployees ?? 0} subtitle="Eligible workforce" icon={Users} color="emerald" /><StatCard title="Shifts generated" value={summary.shiftSlots ?? 0} subtitle={`${summary.understaffedShifts ?? 0} understaffed`} icon={CalendarDays} color="amber" /><StatCard title="Assignments" value={`${summary.assignedAssignments ?? 0}/${summary.requiredAssignments ?? 0}`} subtitle="People assigned vs required" icon={CheckCircle2} color="emerald" /><StatCard title="Attendance recorded" value={`${summary.attendanceCompletionRate ?? 0}%`} subtitle={`${summary.attendanceRecords ?? 0}/${summary.attendanceExpected ?? 0} assignments marked`} icon={ClipboardCheck} color="blue" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Panel className="p-4"><p className="text-xs text-slate-500">Present</p><p className="mt-1 text-2xl font-bold text-emerald-600">{summary.present ?? 0}</p></Panel><Panel className="p-4"><p className="text-xs text-slate-500">Late</p><p className="mt-1 text-2xl font-bold text-amber-600">{summary.late ?? 0}</p></Panel><Panel className="p-4"><p className="text-xs text-slate-500">Absent</p><p className="mt-1 text-2xl font-bold text-rose-600">{summary.absent ?? 0}</p></Panel><Panel className="p-4"><p className="text-xs text-slate-500">Leave requests</p><p className="mt-1 text-2xl font-bold">{summary.leaveRequests ?? 0}</p></Panel></div>
        <Panel className="overflow-hidden"><div className="border-b border-slate-100 p-5 dark:border-slate-800"><h2 className="font-bold">Workload by employee</h2><p className="mt-1 text-sm text-slate-500">Use the CSV export for offline analysis or submission evidence.</p></div>{!reportData.workload?.length ? <EmptyState message="No active employees are available for this report." /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Shifts</th><th className="px-5 py-3">Minutes</th><th className="px-5 py-3">Present</th><th className="px-5 py-3">Late</th><th className="px-5 py-3">Absent</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{reportData.workload.map((row) => <tr key={row.employeeId}><td className="px-5 py-4 font-medium">{row.name}</td><td className="px-5 py-4 text-slate-500">{row.department}</td><td className="px-5 py-4">{row.assignedShifts}</td><td className="px-5 py-4">{row.scheduledMinutes}</td><td className="px-5 py-4">{row.present}</td><td className="px-5 py-4">{row.late}</td><td className="px-5 py-4">{row.absent}</td></tr>)}</tbody></table></div>}</Panel>
      </div>
    );
  }

  function renderNotificationsPage() {
    const unread = notifications.filter((item) => !item.readAt).length;
    return (
      <div className="space-y-5"><Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="font-bold">Your notifications</h2><p className="mt-1 text-sm text-slate-500">{unread} unread · latest {notifications.length} notifications</p></div><button type="button" onClick={handleMarkAllNotificationsRead} disabled={!unread || markingNotification} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={16} />{markingNotification ? "Updating..." : "Mark all as read"}</button></Panel><Panel className="overflow-hidden">{notifications.length === 0 ? <EmptyState message="You're all caught up. Leave decisions and schedule updates will appear here." /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{notifications.map((item) => <div key={item._id} className={`flex items-start gap-3 p-5 ${item.readAt ? "opacity-70" : "bg-emerald-50/40 dark:bg-emerald-950/20"}`}><div className={`mt-0.5 rounded-xl p-2 ${item.type === "leave" ? "bg-amber-50 text-amber-600" : item.type === "schedule" ? "bg-emerald-50 text-emerald-600" : item.type === "conflict" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}><Bell size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3>{!item.readAt && <span className="h-2 w-2 rounded-full bg-emerald-500" />}</div><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 flex-wrap gap-2">{!item.readAt && <button type="button" onClick={() => handleMarkNotificationRead(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Mark read</button>}<button type="button" onClick={() => handleDeleteNotification(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950" aria-label={`Delete notification: ${item.title}`}><Trash2 size={13} /> Delete</button></div></div>)}</div>}</Panel></div>
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
        
        
        <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f46e5] text-white shadow-lg shadow-emerald-950/20"><CalendarDays size={24} /></div>
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
              <input type="email" autoComplete="username" required value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input type="password" autoComplete="current-password" required value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <button type="submit" disabled={authLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-7 pb-4">
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
                {id === "conflicts" && conflictItems.length > 0 && <span className="ml-auto rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-200">{conflictItems.length}</span>}
                {id === "notifications" && notifications.filter((item) => !item.readAt).length > 0 && <span className="ml-auto rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">{notifications.filter((item) => !item.readAt).length}</span>}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-200" aria-label={`${currentUser.name} initials`}>{getInitials(currentUser.name)}</div>
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
                className="w-44 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white lg:w-60"
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
            <button onClick={() => loadData()} aria-label="Refresh data" title="Refresh data" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50">
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Employee Profile</p>
                    <h2 id="profile-title" className="mt-1 text-xl font-bold text-slate-900">Employee details</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedEmployee(null)} aria-label="Close employee profile" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={19} /></button>
                </div>
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700">{(selectedEmployee.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-900">{selectedEmployee.name}</h3>
                      <p className="truncate text-sm text-slate-500">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 px-4">
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-sm text-slate-500">Role</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">{selectedEmployee.role}</span>
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
                <StatCard title="Total employees" value={loading ? "—" : employees.length} subtitle="Employee records in the system" icon={Users} color="emerald" />
                <StatCard title="Availability slots" value={loading ? "—" : availability.length} subtitle="Submitted employee time slots" icon={Clock3} color="emerald" />
                <StatCard title="Departments" value={loading ? "—" : departments} subtitle="Departments represented" icon={BriefcaseBusiness} color="amber" />
                <StatCard title="Database connection" value={loading ? "…" : connected ? "Online" : "Offline"} subtitle={connected ? "API data loaded successfully" : "Check the backend server"} icon={CalendarCheck} color={connected ? "blue" : "amber"} />
              </div>

              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                {currentUser.role === "manager" && <Panel className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
                    <div><h2 className="font-bold tracking-tight">Employee directory</h2><p className="mt-1 text-sm text-slate-500">Your workforce at a glance</p></div>
                    <button onClick={() => navigateTo("employees")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50">View all <ArrowUpRight size={15} /></button>
                  </div>
                  <div className="border-t border-slate-100">
                    {loading ? <EmptyState message="Loading employees..." /> : employees.length === 0 ? <EmptyState message="Add your first employee to get started." /> : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {employees.slice(0, 5).map((employee) => (
                          <div key={employee._id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">{(employee.name || "?").charAt(0).toUpperCase()}</div>
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
                    <button onClick={() => navigateTo("availability")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50">View all <ArrowUpRight size={15} /></button>
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
                <SectionHeading title="Workforce tools" subtitle="Manage scheduling, staffing risks, and employee leave from one place." />
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
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Available</p>
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
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Users size={19} /></div>
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
                  <div><h2 className="font-bold">{currentUser.role === "manager" ? "Availability records" : "My availability"}</h2><p className="mt-1 text-sm text-slate-500">{availability.length} submitted slot(s)</p></div>
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CalendarCheck size={19} /></div>
                </div>
                <div className="border-t border-slate-100">{renderAvailabilityTable()}</div>
              </Panel>
            </div>
          )}

          {activePage === "leave" && renderLeaveManagement()}

          {activePage === "schedule" && ShiftSchedulePage()}

          {activePage === "conflicts" && currentUser.role === "manager" && renderConflictsPage()}
          {activePage === "attendance" && renderAttendancePage()}
          {activePage === "reports" && currentUser.role === "manager" && renderReportsPage()}
          {activePage === "notifications" && renderNotificationsPage()}

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
