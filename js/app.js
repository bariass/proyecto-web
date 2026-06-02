const state = {
  data: structuredClone(PlanningData),
  insights: null,
  charts: {},
  lastReport: []
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  bindShell();
  calculateAndRender();
  renderUploadPreview();
  renderProducts();
  renderCapacity();
  renderPeople();
  renderAlignMetrics();
  renderCalendar(PlanningData.events);
  renderScenarios();
  renderSchema();
  renderReport("inventory");
  addMessage("ai", "Hola. Soy Planning AI Assistant. Aun no hay datos cargados; agrega informacion manualmente o sube un archivo para generar analisis.");
});

function bindShell() {
  $("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    $("#activeRole").textContent = $("#roleSelect").value;
    $("#loginView").classList.add("d-none");
    $("#appShell").classList.remove("d-none");
  });

  $$(".nav-link").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  $("#sidebarToggle").addEventListener("click", () => $("#sidebar").classList.toggle("collapsed"));
  $("#darkModeToggle").addEventListener("click", () => document.body.classList.toggle("dark"));
  $("#refreshInsights").addEventListener("click", calculateAndRender);
  $("#productForm").addEventListener("submit", saveProduct);
  $("#clearProductForm").addEventListener("click", clearProductForm);
  $("#newRttBtn").addEventListener("click", clearRttForm);
  $("#rttForm").addEventListener("submit", saveRtt);
  $("#clearRttForm").addEventListener("click", clearRttForm);
  $("#peopleForm").addEventListener("submit", saveEmployee);
  $("#clearPeopleForm").addEventListener("click", clearPeopleForm);
  $("#vacationForm").addEventListener("submit", saveVacation);
  $("#alignMetricForm").addEventListener("submit", saveAlignMetric);
  $("#clearAlignMetricForm").addEventListener("click", clearAlignMetricForm);
  $("#fileInput").addEventListener("change", handleFiles);
  $("#loadHolidays").addEventListener("click", loadHolidays);
  ["demandFactor", "capacityFactor", "peopleFactor", "inventoryFactor"].forEach(id => $(`#${id}`).addEventListener("input", renderScenarios));
  $("#operatorGap").addEventListener("input", renderPeopleImpact);
  $$(".report-card").forEach(button => button.addEventListener("click", () => renderReport(button.dataset.report)));
  $("#exportCsv").addEventListener("click", () => ReportService.download("planning-report.csv", state.lastReport.join("\n"), "text/csv"));
  $("#exportPrint").addEventListener("click", () => window.print());
  $("#exportPpt").addEventListener("click", () => ReportService.download("planning-report-outline.txt", state.lastReport.map((line, i) => `${i ? "- " : ""}${line}`).join("\n")));
  $("#chatForm").addEventListener("submit", event => {
    event.preventDefault();
    const question = $("#chatInput").value.trim();
    askAssistant(question);
    $("#chatInput").value = "";
  });
  $$(".quick-prompts button").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    askAssistant(button.textContent);
  }));
}

function setView(view) {
  $$(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  $$(".view").forEach(section => section.classList.toggle("active", section.id === view));
  const titles = {
    dashboard: ["Dashboard Ejecutivo", "KPIs, riesgos y recomendaciones accionables."],
    upload: ["Carga Inteligente de Archivos", "Normalizacion automatica de Excel, CSV y JSON."],
    capacity: ["Gestion de Capacidad", "Plantas, RTT, turnos y horas extra."],
    people: ["Gestion de Personal", "Empleados, habilidades, vacaciones y simulaciones."],
    alignMetrics: ["Align Metrics", "Adopcion iTero/Lumina, conversion de scans y Systems revenue."],
    calendar: ["Calendario Inteligente Global", "Festivos, eventos comerciales y alertas por demanda."],
    scenarios: ["Simulador de Escenarios", "Impacto financiero, faltantes y utilizacion."],
    reports: ["Reportes Inteligentes", "Inventario, capacidad, personal y prediccion."],
    assistant: ["Centro de Insights IA", "Chatbot de planificacion basado en tus datos."],
    settings: ["IA y Seguridad", "Roles, proveedores IA y modelo de datos."]
  };
  $("#pageTitle").textContent = titles[view][0];
  $("#pageSubtitle").textContent = titles[view][1];
}

function calculateAndRender() {
  state.insights = AIService.analyze(state.data);
  renderKpis();
  renderCharts();
  renderLists();
  renderAlignMetrics();
  renderScenarios();
  renderReport("inventory");
}

function renderKpis() {
  const k = state.insights.kpis;
  const cards = [
    ["Inventario Total", k.totalInventory.toLocaleString(), "info", "unidades disponibles"],
    ["Cobertura", `${k.coverageDays} dias`, k.coverageDays < 21 ? "warn" : "good", "promedio proyectado"],
    ["Nivel de Servicio", `${k.avgService}%`, k.avgService < 92 ? "warn" : "good", "ponderado"],
    ["Capacidad Utilizada", `${k.capacityUtilized}%`, k.capacityUtilized > 92 ? "bad" : "warn", "vs disponible"],
    ["Horas Extra", k.overtime, k.overtime > 80 ? "bad" : "warn", "requeridas"],
    ["Riesgo Faltantes", k.shortageRisk, k.shortageRisk ? "bad" : "good", "SKU criticos"],
    ["Sobreinventario", k.excessRisk, k.excessRisk ? "warn" : "good", "SKU baja rotacion"],
    ["Demanda Proyectada", k.projectedDemand.toLocaleString(), "info", "unidades/semana"]
  ];
  $("#kpiGrid").innerHTML = cards.map(([label, value, status, note]) => `
    <article class="kpi">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <span class="trend"><span class="status-dot ${status}"></span>${note}</span>
    </article>
  `).join("");
}

function renderCharts() {
  const history = state.data.history;
  chart("inventoryChart", "line", {
    labels: history.map(h => h.week),
    datasets: [
      { label: "Inventario", data: history.map(h => h.inventory), borderColor: "#7e57c2", backgroundColor: "rgba(126,87,194,.12)", tension: .35, fill: true },
      { label: "Demanda", data: history.map(h => h.demand), borderColor: "#26a6c7", backgroundColor: "rgba(38,166,199,.08)", tension: .35, fill: true }
    ]
  });
  chart("capacityChart", "bar", {
    labels: state.data.lines.map(l => l.line),
    datasets: [{ label: "Utilizacion %", data: state.data.lines.map(l => Math.round((l.required / (l.hours * l.efficiency - l.maintenance)) * 100)), backgroundColor: ["#7e57c2", "#ffa726", "#66bb6a", "#ef5350"] }]
  });
  chart("productChart", "line", {
    labels: state.data.weeks,
    datasets: state.data.productTrends.map((product, index) => {
      const colors = ["#7e57c2", "#26a6c7", "#ffa726"];
      return {
        label: product.name,
        data: product.values,
        borderColor: colors[index],
        backgroundColor: `${colors[index]}22`,
        tension: .35,
        fill: false,
        pointRadius: 3
      };
    })
  });
  chart("productionChart", "line", {
    labels: history.map(h => h.week),
    datasets: [{ label: "Produccion planificada", data: history.map(h => h.production), borderColor: "#66bb6a", backgroundColor: "rgba(102,187,106,.12)", tension: .35, fill: true }]
  });
}

function chart(id, type, data) {
  const ctx = document.getElementById(id);
  if (state.charts[id]) state.charts[id].destroy();
  state.charts[id] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, grid: { color: "rgba(126,87,194,.09)" } }, x: { grid: { display: false } } }
    }
  });
}

function renderLists() {
  $("#riskList").innerHTML = state.insights.risks.map(itemTemplate).join("");
  $("#recommendationList").innerHTML = state.insights.recommendations.slice(0, 5).map(itemTemplate).join("");
}

function itemTemplate(item) {
  return `<div class="list-item"><span class="status-dot ${item.severity}"></span><div><strong>${item.title}</strong><p>${item.text}</p></div><i class="bi bi-chevron-right"></i></div>`;
}

async function handleFiles(event) {
  const files = [...event.target.files];
  const allRecords = [];
  for (const file of files) {
    const records = await parseFile(file);
    allRecords.push(...records);
  }
  if (!allRecords.length) return;
  const normalized = AIService.normalizeRecords(allRecords);
  applyNormalizedData(normalized.records);
  renderMappings(normalized.mapping);
  renderNormalizedTable(normalized.records);
  $("#uploadSummary").textContent = `${files.length} archivo(s) analizados, ${normalized.records.length} filas normalizadas y KPIs recalculados.`;
  calculateAndRender();
}

function parseFile(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = event => {
      if (file.name.endsWith(".json")) {
        const json = JSON.parse(event.target.result);
        resolve(Array.isArray(json) ? json : Object.values(json).flat().filter(v => typeof v === "object"));
      } else if (file.name.endsWith(".csv")) {
        const rows = event.target.result.split(/\r?\n/).filter(Boolean).map(row => row.split(","));
        const headers = rows.shift();
        resolve(rows.map(row => Object.fromEntries(headers.map((h, i) => [h.trim(), row[i]]))));
      } else {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet));
      }
    };
    file.name.endsWith(".xlsx") ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  });
}

function applyNormalizedData(records) {
  const products = records.filter(r => r.sku || r.inventory || r.demand).map((r, index) => ({
    sku: String(r.sku || `UPL-${index + 1}`),
    description: r.description || "Imported product",
    family: "Imported",
    inventory: Number(r.inventory || 0),
    safetyStock: Number(r.safetyStock || 200),
    weeklyDemand: Number(r.demand || r.forecast || 100),
    forecast: Number(r.demand || r.forecast || 120),
    unitCost: Number(r.unitCost || 35),
    service: Number(r.service || 92)
  })).filter(p => p.inventory || p.forecast);
  if (products.length) state.data.products = products;
  renderProducts();
}

function renderMappings(mapping = {}) {
  const entries = Object.entries(mapping);
  $("#mappingList").innerHTML = entries.length
    ? entries.map(([from, to]) => itemTemplate({ severity: "info", title: `${from} -> ${to}`, text: "Columna detectada y asignada por el motor de normalizacion." })).join("")
    : `<div class="muted">El mapeo aparecera despues de cargar un archivo.</div>`;
}

function renderUploadPreview() {
  renderMappings({});
  renderNormalizedTable([]);
}

function renderNormalizedTable(records) {
  $("#normalizedCount").textContent = `${records.length} registros`;
  const headers = Object.keys(records[0] || {});
  if (!headers.length) {
    $("#normalizedTable").innerHTML = `<tbody><tr><td class="muted">Sin registros normalizados.</td></tr></tbody>`;
    return;
  }
  $("#normalizedTable").innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${records.slice(0, 12).map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function renderProducts() {
  $("#productTable").innerHTML = `<thead><tr><th>SKU</th><th>Descripcion</th><th>Familia</th><th>Inventario</th><th>Seguridad</th><th>Demanda</th><th>Forecast</th><th>Acciones</th></tr></thead><tbody>${state.data.products.length ? state.data.products.map((p, index) => `
    <tr>
      <td>${p.sku}</td>
      <td>${p.description}</td>
      <td>${p.family}</td>
      <td>${p.inventory}</td>
      <td>${p.safetyStock}</td>
      <td>${p.weeklyDemand}</td>
      <td>${p.forecast}</td>
      <td><span class="row-actions"><button class="btn btn-outline-primary btn-sm" type="button" data-edit-product="${index}"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger btn-sm" type="button" data-delete-product="${index}"><i class="bi bi-trash"></i></button></span></td>
    </tr>
  `).join("") : `<tr><td colspan="8" class="muted">Sin productos cargados.</td></tr>`}</tbody>`;
  $$("[data-edit-product]").forEach(button => button.addEventListener("click", () => editProduct(Number(button.dataset.editProduct))));
  $$("[data-delete-product]").forEach(button => button.addEventListener("click", () => deleteProduct(Number(button.dataset.deleteProduct))));
}

function saveProduct(event) {
  event.preventDefault();
  const index = $("#productIndex").value;
  const product = {
    sku: $("#productSku").value.trim(),
    description: $("#productDescription").value.trim(),
    family: $("#productFamily").value.trim(),
    inventory: Number($("#productInventory").value),
    safetyStock: Number($("#productSafety").value),
    weeklyDemand: Number($("#productDemand").value),
    forecast: Number($("#productForecast").value),
    unitCost: 35,
    service: 94
  };
  if (index === "") state.data.products.push(product);
  else state.data.products[Number(index)] = { ...state.data.products[Number(index)], ...product };
  clearProductForm();
  renderProducts();
  renderUploadPreview();
  calculateAndRender();
}

function editProduct(index) {
  const p = state.data.products[index];
  $("#productIndex").value = index;
  $("#productSku").value = p.sku;
  $("#productDescription").value = p.description;
  $("#productFamily").value = p.family;
  $("#productInventory").value = p.inventory;
  $("#productSafety").value = p.safetyStock;
  $("#productDemand").value = p.weeklyDemand;
  $("#productForecast").value = p.forecast;
}

function deleteProduct(index) {
  state.data.products.splice(index, 1);
  renderProducts();
  renderUploadPreview();
  calculateAndRender();
}

function clearProductForm() {
  $("#productForm").reset();
  $("#productIndex").value = "";
}

function renderCapacity() {
  $("#capacityCards").innerHTML = state.data.lines.map(line => {
    const available = Math.round(line.hours * line.efficiency - line.maintenance);
    const util = Math.round((line.required / available) * 100);
    return `<article class="kpi"><div class="label">${line.line} / ${line.center}</div><div class="value">${util}%</div><span class="trend"><span class="status-dot ${util > 100 ? "bad" : util > 88 ? "warn" : "good"}"></span>${available} horas disponibles</span></article>`;
  }).join("");
  $("#capacityTable").innerHTML = `<thead><tr><th>Planta</th><th>RTT</th><th>Centro</th><th>Turnos</th><th>Disponible</th><th>Requerida</th><th>Horas extra</th><th>Personas</th><th>Acciones</th></tr></thead><tbody>${state.data.lines.length ? state.data.lines.map((l, index) => {
    const people = state.data.employees.filter(e => e.rtt === l.line).length;
    return `<tr><td>${l.plant}</td><td>${l.line}</td><td>${l.center}</td><td>${l.shifts}</td><td>${Math.round(l.hours * l.efficiency - l.maintenance)}</td><td>${l.required}</td><td><span class="badge badge-soft">${l.overtime}</span></td><td>${people}</td><td><span class="row-actions"><button class="btn btn-outline-primary btn-sm" type="button" data-edit-rtt="${index}"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger btn-sm" type="button" data-delete-rtt="${index}"><i class="bi bi-trash"></i></button></span></td></tr>`;
  }).join("") : `<tr><td colspan="9" class="muted">Sin RTT cargados.</td></tr>`}</tbody>`;
  $$("[data-edit-rtt]").forEach(button => button.addEventListener("click", () => editRtt(Number(button.dataset.editRtt))));
  $$("[data-delete-rtt]").forEach(button => button.addEventListener("click", () => deleteRtt(Number(button.dataset.deleteRtt))));
  renderRttOptions();
}

function saveRtt(event) {
  event.preventDefault();
  const index = $("#rttIndex").value;
  const previousName = index === "" ? null : state.data.lines[Number(index)].line;
  const rtt = {
    plant: $("#rttPlant").value.trim(),
    line: $("#rttName").value.trim(),
    center: $("#rttCenter").value.trim(),
    shifts: Number($("#rttShifts").value),
    hours: Number($("#rttHours").value),
    efficiency: Number($("#rttEfficiency").value) / 100,
    required: Number($("#rttRequired").value),
    overtime: Number($("#rttOvertime").value),
    maintenance: Number($("#rttMaintenance").value)
  };
  if (index === "") state.data.lines.push(rtt);
  else {
    state.data.lines[Number(index)] = rtt;
    state.data.employees.forEach(employee => {
      if (employee.rtt === previousName) employee.rtt = rtt.line;
    });
  }
  clearRttForm();
  renderCapacity();
  renderPeople();
  calculateAndRender();
}

function editRtt(index) {
  const rtt = state.data.lines[index];
  $("#rttIndex").value = index;
  $("#rttPlant").value = rtt.plant;
  $("#rttName").value = rtt.line;
  $("#rttCenter").value = rtt.center;
  $("#rttShifts").value = rtt.shifts;
  $("#rttHours").value = rtt.hours;
  $("#rttEfficiency").value = Math.round(rtt.efficiency * 100);
  $("#rttRequired").value = rtt.required;
  $("#rttOvertime").value = rtt.overtime;
  $("#rttMaintenance").value = rtt.maintenance;
}

function deleteRtt(index) {
  const removed = state.data.lines[index].line;
  state.data.lines.splice(index, 1);
  state.data.employees.forEach(employee => {
    if (employee.rtt === removed) employee.rtt = state.data.lines[0]?.line || "";
  });
  renderCapacity();
  renderPeople();
  calculateAndRender();
}

function clearRttForm() {
  $("#rttForm").reset();
  $("#rttIndex").value = "";
  const next = state.data.lines.length + 1;
  $("#rttPlant").value = "New Plant";
  $("#rttName").value = `RTT ${String.fromCharCode(64 + next)}`;
  $("#rttCenter").value = "Flexible Cell";
  $("#rttShifts").value = 1;
  $("#rttHours").value = 120;
  $("#rttEfficiency").value = 80;
  $("#rttRequired").value = 96;
  $("#rttOvertime").value = 0;
  $("#rttMaintenance").value = 4;
}

function renderPeople() {
  renderRttOptions();
  renderVacationEmployeeOptions();
  $("#peopleTable").innerHTML = `<thead><tr><th>Nombre</th><th>Area</th><th>Turno</th><th>RTT</th><th>Habilidades</th><th>Vacaciones</th><th>Acciones</th></tr></thead><tbody>${state.data.employees.length ? state.data.employees.map((e, index) => `<tr><td>${e.name}</td><td>${e.area}</td><td>${e.shift}</td><td><span class="badge badge-soft">${e.rtt || "Sin RTT"}</span></td><td>${e.skills.join(", ")}</td><td>${formatVacations(e)}</td><td><span class="row-actions"><button class="btn btn-outline-primary btn-sm" type="button" data-edit-employee="${index}"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger btn-sm" type="button" data-delete-employee="${index}"><i class="bi bi-trash"></i></button></span></td></tr>`).join("") : `<tr><td colspan="7" class="muted">Sin empleados cargados.</td></tr>`}</tbody>`;
  $$("[data-edit-employee]").forEach(button => button.addEventListener("click", () => editEmployee(Number(button.dataset.editEmployee))));
  $$("[data-delete-employee]").forEach(button => button.addEventListener("click", () => deleteEmployee(Number(button.dataset.deleteEmployee))));
  const vacationItems = state.data.employees.flatMap(e => (e.vacations || []).map(v => itemTemplate({ severity: "warn", title: e.name, text: `${e.rtt || e.area}: ${v.start} to ${v.end}` })));
  $("#vacationList").innerHTML = vacationItems.length ? vacationItems.join("") : `<div class="muted">Sin vacaciones agendadas.</div>`;
  renderPeopleImpact();
}

function renderRttOptions() {
  const options = state.data.lines.map(rtt => `<option value="${rtt.line}">${rtt.line} - ${rtt.center}</option>`).join("");
  $("#employeeRtt").innerHTML = options || `<option value="">Sin RTT disponible</option>`;
}

function renderVacationEmployeeOptions() {
  $("#vacationEmployee").innerHTML = state.data.employees.length
    ? state.data.employees.map((employee, index) => `<option value="${index}">${employee.name} (${employee.rtt || "Sin RTT"})</option>`).join("")
    : `<option value="">Sin empleados disponibles</option>`;
}

function saveEmployee(event) {
  event.preventDefault();
  const index = $("#employeeIndex").value;
  const employee = {
    name: $("#employeeName").value.trim(),
    area: $("#employeeArea").value.trim(),
    shift: $("#employeeShift").value.trim(),
    skills: $("#employeeSkills").value.split(",").map(skill => skill.trim()).filter(Boolean),
    rtt: $("#employeeRtt").value,
    vacations: index === "" ? [] : state.data.employees[Number(index)].vacations || [],
    status: "Available"
  };
  if (index === "") state.data.employees.push(employee);
  else state.data.employees[Number(index)] = employee;
  clearPeopleForm();
  renderPeople();
  renderCapacity();
  calculateAndRender();
}

function editEmployee(index) {
  const employee = state.data.employees[index];
  $("#employeeIndex").value = index;
  $("#employeeName").value = employee.name;
  $("#employeeArea").value = employee.area;
  $("#employeeShift").value = employee.shift;
  $("#employeeSkills").value = employee.skills.join(", ");
  $("#employeeRtt").value = employee.rtt || "";
}

function deleteEmployee(index) {
  state.data.employees.splice(index, 1);
  clearPeopleForm();
  renderPeople();
  renderCapacity();
  calculateAndRender();
}

function clearPeopleForm() {
  $("#peopleForm").reset();
  $("#employeeIndex").value = "";
}

function saveVacation(event) {
  event.preventDefault();
  const employee = state.data.employees[Number($("#vacationEmployee").value)];
  if (!employee) return;
  employee.vacations = employee.vacations || [];
  employee.vacations.push({ start: $("#vacationStart").value, end: $("#vacationEnd").value });
  employee.status = "Vacation planned";
  $("#vacationForm").reset();
  renderPeople();
  calculateAndRender();
}

function formatVacations(employee) {
  const vacations = employee.vacations || [];
  return vacations.length ? vacations.map(v => `${v.start} to ${v.end}`).join("<br>") : "Sin vacaciones";
}

function renderPeopleImpact() {
  const gap = Number($("#operatorGap").value);
  $("#operatorImpact").textContent = `${gap} operadores faltantes reducen capacidad estimada ${Math.round(gap * 2.8)}% y agregan ${gap * 12} horas extra.`;
}

function renderAlignMetrics() {
  renderAlignMetricKpis();
  renderAlignMetricCharts();
  renderAlignMetricTable();
}

function summarizeAlignMetrics() {
  const rows = state.data.alignMetrics || [];
  const totals = rows.reduce((sum, row) => ({
    iteroUnits: sum.iteroUnits + row.iteroUnits,
    luminaUnits: sum.luminaUnits + row.luminaUnits,
    wandUpgrades: sum.wandUpgrades + row.wandUpgrades,
    scanVolume: sum.scanVolume + row.scanVolume,
    convertedCases: sum.convertedCases + row.convertedCases,
    systemsRevenue: sum.systemsRevenue + row.systemsRevenue
  }), { iteroUnits: 0, luminaUnits: 0, wandUpgrades: 0, scanVolume: 0, convertedCases: 0, systemsRevenue: 0 });
  return {
    ...totals,
    luminaAdoption: totals.iteroUnits ? Math.round((totals.luminaUnits / totals.iteroUnits) * 100) : 0,
    upgradeMix: totals.iteroUnits ? Math.round((totals.wandUpgrades / totals.iteroUnits) * 100) : 0,
    scanConversion: totals.scanVolume ? Math.round((totals.convertedCases / totals.scanVolume) * 100) : 0,
    scansPerSystem: totals.iteroUnits ? Math.round(totals.scanVolume / totals.iteroUnits) : 0,
    revenuePerSystem: totals.iteroUnits ? Math.round(totals.systemsRevenue / totals.iteroUnits) : 0
  };
}

function renderAlignMetricKpis() {
  const summary = summarizeAlignMetrics();
  const cards = [
    ["Lumina Adoption", `${summary.luminaAdoption}%`, "info", "Lumina units / iTero units"],
    ["Scan Conversion", `${summary.scanConversion}%`, "good", "converted cases / scans"],
    ["Wand Upgrade Mix", `${summary.upgradeMix}%`, "info", "upgrades / iTero units"],
    ["Revenue per System", `$${summary.revenuePerSystem.toLocaleString()}`, "warn", "Systems revenue / units"]
  ];
  $("#alignMetricKpis").innerHTML = (state.data.alignMetrics || []).length
    ? cards.map(([label, value, status, note]) => `<article class="kpi"><div class="label">${label}</div><div class="value">${value}</div><span class="trend"><span class="status-dot ${status}"></span>${note}</span></article>`).join("")
    : `<div class="muted">Agrega registros iTero/Lumina para calcular adopcion, conversion y revenue por sistema.</div>`;
}

function renderAlignMetricCharts() {
  const rows = state.data.alignMetrics || [];
  const labels = rows.map(row => row.period);
  chart("luminaAdoptionChart", "line", {
    labels,
    datasets: [{
      label: "Lumina Adoption %",
      data: rows.map(row => row.iteroUnits ? Math.round((row.luminaUnits / row.iteroUnits) * 100) : 0),
      borderColor: "#7e57c2",
      backgroundColor: "rgba(126,87,194,.12)",
      tension: .35,
      fill: true
    }]
  });
  chart("scanConversionChart", "line", {
    labels,
    datasets: [{
      label: "Scan to Case Conversion %",
      data: rows.map(row => row.scanVolume ? Math.round((row.convertedCases / row.scanVolume) * 100) : 0),
      borderColor: "#26a6c7",
      backgroundColor: "rgba(38,166,199,.12)",
      tension: .35,
      fill: true
    }]
  });
}

function renderAlignMetricTable() {
  const rows = state.data.alignMetrics || [];
  $("#alignMetricTable").innerHTML = `<thead><tr><th>Periodo</th><th>iTero units</th><th>Lumina units</th><th>Adopcion</th><th>Wand upgrades</th><th>Scans</th><th>Casos</th><th>Conversion</th><th>Revenue</th><th>Acciones</th></tr></thead><tbody>${rows.length ? rows.map((row, index) => {
    const adoption = row.iteroUnits ? Math.round((row.luminaUnits / row.iteroUnits) * 100) : 0;
    const conversion = row.scanVolume ? Math.round((row.convertedCases / row.scanVolume) * 100) : 0;
    return `<tr><td>${row.period}</td><td>${row.iteroUnits}</td><td>${row.luminaUnits}</td><td>${adoption}%</td><td>${row.wandUpgrades}</td><td>${row.scanVolume}</td><td>${row.convertedCases}</td><td>${conversion}%</td><td>$${row.systemsRevenue.toLocaleString()}</td><td><span class="row-actions"><button class="btn btn-outline-primary btn-sm" type="button" data-edit-align="${index}"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger btn-sm" type="button" data-delete-align="${index}"><i class="bi bi-trash"></i></button></span></td></tr>`;
  }).join("") : `<tr><td colspan="10" class="muted">Sin registros iTero/Lumina cargados.</td></tr>`}</tbody>`;
  $$("[data-edit-align]").forEach(button => button.addEventListener("click", () => editAlignMetric(Number(button.dataset.editAlign))));
  $$("[data-delete-align]").forEach(button => button.addEventListener("click", () => deleteAlignMetric(Number(button.dataset.deleteAlign))));
}

function saveAlignMetric(event) {
  event.preventDefault();
  const index = $("#alignMetricIndex").value;
  const row = {
    period: $("#metricPeriod").value.trim(),
    iteroUnits: Number($("#iteroUnits").value),
    luminaUnits: Number($("#luminaUnits").value),
    wandUpgrades: Number($("#wandUpgrades").value),
    scanVolume: Number($("#scanVolume").value),
    convertedCases: Number($("#convertedCases").value),
    systemsRevenue: Number($("#systemsRevenue").value)
  };
  if (index === "") state.data.alignMetrics.push(row);
  else state.data.alignMetrics[Number(index)] = row;
  clearAlignMetricForm();
  renderAlignMetrics();
}

function editAlignMetric(index) {
  const row = state.data.alignMetrics[index];
  $("#alignMetricIndex").value = index;
  $("#metricPeriod").value = row.period;
  $("#iteroUnits").value = row.iteroUnits;
  $("#luminaUnits").value = row.luminaUnits;
  $("#wandUpgrades").value = row.wandUpgrades;
  $("#scanVolume").value = row.scanVolume;
  $("#convertedCases").value = row.convertedCases;
  $("#systemsRevenue").value = row.systemsRevenue;
}

function deleteAlignMetric(index) {
  state.data.alignMetrics.splice(index, 1);
  clearAlignMetricForm();
  renderAlignMetrics();
}

function clearAlignMetricForm() {
  $("#alignMetricForm").reset();
  $("#alignMetricIndex").value = "";
}

async function loadHolidays() {
  const country = $("#countrySelect").value;
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/2026/${country}`);
    const holidays = await response.json();
    const events = holidays.slice(0, 9).map(h => ({ name: h.localName, date: h.date, region: country, impact: "Revisar demanda y capacidad disponible", type: "Holiday" }));
    renderCalendar([...events, ...PlanningData.events.slice(1, 4)]);
  } catch {
    renderCalendar(PlanningData.events);
  }
}

function renderCalendar(events) {
  if (!events.length) {
    $("#eventGrid").innerHTML = `<div class="muted">Sin eventos cargados. Consulta festivos o agrega eventos desde tus archivos.</div>`;
    $("#eventInsights").innerHTML = `<div class="muted">Las alertas basadas en eventos apareceran cuando cargues calendario o demanda historica.</div>`;
    return;
  }
  $("#eventGrid").innerHTML = events.map(e => `<article class="event-card"><strong>${e.name}</strong><span>${e.date} · ${e.region}</span><p class="mb-0 mt-2">${e.impact}</p></article>`).join("");
  $("#eventInsights").innerHTML = events.map(e => itemTemplate({
    severity: "info",
    title: e.name,
    text: `${e.region}: revisar impacto contra demanda historica y capacidad disponible.`
  })).join("");
}

function renderScenarios() {
  if (!state.insights) return;
  if (!state.data.products.length && !state.data.lines.length && !state.data.employees.length) {
    $("#scenarioResults").innerHTML = `<div class="muted">Agrega inventario, RTT o personal para simular escenarios.</div>`;
    return;
  }
  const demand = Number($("#demandFactor")?.value || 12);
  const capacity = Number($("#capacityFactor")?.value || -5);
  const people = Number($("#peopleFactor")?.value || -8);
  const inventory = Number($("#inventoryFactor")?.value || 0);
  const netRisk = Math.max(0, demand - capacity - people - inventory);
  const scenarios = [
    ["Optimista", Math.max(0, netRisk - 18), 84, "$124K upside"],
    ["Base", netRisk, 93, "$42K overtime"],
    ["Pesimista", netRisk + 22, 108, "$218K risk"]
  ];
  $("#scenarioResults").innerHTML = scenarios.map(([name, risk, util, money]) => `<article class="kpi"><div class="label">${name}</div><div class="value">${risk}%</div><span class="trend"><span class="status-dot ${risk > 35 ? "bad" : risk > 18 ? "warn" : "good"}"></span>${util}% utilizacion · ${money}</span></article>`).join("");
}

function askAssistant(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addMessage("user", cleanQuestion);
  addMessage("ai", AIService.answer(cleanQuestion, state.data, state.insights));
}

function renderReport(type) {
  state.lastReport = ReportService.build(type, state.data, state.insights || AIService.analyze(state.data));
  $("#reportOutput").innerHTML = `<h4>${state.lastReport[0]}</h4><ul>${state.lastReport.slice(1).map(line => `<li>${line}</li>`).join("")}</ul>`;
}

function renderSchema() {
  const tables = ["Productos", "Inventarios", "Forecast", "Produccion", "Capacidad", "Empleados", "Vacaciones", "Eventos", "Historial IA"];
  $("#schemaList").innerHTML = tables.map(table => `<div class="schema-item"><strong>${table}</strong><p class="mb-0 muted">Entidad lista para persistencia y auditoria.</p></div>`).join("");
}

function addMessage(type, text) {
  const node = document.createElement("div");
  node.className = `msg ${type}`;
  node.textContent = text;
  $("#chatLog").appendChild(node);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
}
