
const API_URL = "http://localhost:5000/api";

const employeeForm = document.getElementById("employeeForm");
const availabilityForm = document.getElementById("availabilityForm");
const employeeTable = document.getElementById("employeeTable");
const availabilityTable = document.getElementById("availabilityTable");
const employeeSelect = document.getElementById("availabilityEmployee");
const messageBox = document.getElementById("message");

function showMessage(message, type = "success") {
    messageBox.textContent = message;
    messageBox.className = `alert alert-${type}`;
}

function hideMessage() {
    messageBox.textContent = "";
    messageBox.className = "alert d-none";
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || `Request failed (${response.status})`);
    }

    return data;
}

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    row.appendChild(cell);
}

function showTableMessage(table, columnCount, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columnCount;
    cell.className = "text-secondary";
    cell.textContent = message;

    row.appendChild(cell);
    table.replaceChildren(row);
}

// Load employees into the directory and availability dropdown
async function loadEmployees() {
    try {
        const employees = await apiRequest("/employees");

        employeeTable.replaceChildren();
        employeeSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select an employee";
        employeeSelect.appendChild(defaultOption);

        if (employees.length === 0) {
            showTableMessage(employeeTable, 4, "No employees added yet.");
        }

        employees.forEach((employee) => {
            const row = document.createElement("tr");

            addCell(row, employee.name);
            addCell(row, employee.email);
            addCell(row, employee.role);
            addCell(row, employee.department);

            employeeTable.appendChild(row);

            const option = document.createElement("option");
            option.value = employee._id;
            option.textContent = `${employee.name} (${employee.email})`;
            employeeSelect.appendChild(option);
        });
    } catch (error) {
        showTableMessage(employeeTable, 4, "Could not load employees.");
        showMessage(error.message, "danger");
    }
}

// Load saved availability
async function loadAvailability() {
    try {
        const records = await apiRequest("/availability");

        availabilityTable.replaceChildren();

        if (records.length === 0) {
            showTableMessage(
                availabilityTable,
                4,
                "No availability submitted yet."
            );
            return;
        }

        records.forEach((record) => {
            const row = document.createElement("tr");

            addCell(row, record.employee?.name || "Unknown employee");
            addCell(row, record.day);
            addCell(row, record.startTime);
            addCell(row, record.endTime);

            availabilityTable.appendChild(row);
        });
    } catch (error) {
        showTableMessage(availabilityTable, 4, "Could not load availability.");
        showMessage(error.message, "danger");
    }
}

// Add an employee
employeeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const employee = {
        name: document.getElementById("employeeName").value.trim(),
        email: document.getElementById("employeeEmail").value.trim(),
        role: document.getElementById("employeeRole").value,
        department: document.getElementById("department").value.trim()
    };

    try {
        await apiRequest("/employees", {
            method: "POST",
            body: JSON.stringify(employee)
        });

        employeeForm.reset();
        document.getElementById("department").value = "Operations";

        await loadEmployees();
        showMessage("Employee added successfully!");
    } catch (error) {
        showMessage(error.message, "danger");
    }
});

// Submit an employee's availability
availabilityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const availability = {
        employeeId: employeeSelect.value,
        day: document.getElementById("day").value,
        startTime: document.getElementById("startTime").value,
        endTime: document.getElementById("endTime").value
    };

    try {
        await apiRequest("/availability", {
            method: "POST",
            body: JSON.stringify(availability)
        });

        availabilityForm.reset();

        await loadAvailability();
        showMessage("Availability saved successfully!");
    } catch (error) {
        showMessage(error.message, "danger");
    }
});

// Initial dashboard load
loadEmployees();
loadAvailability();
