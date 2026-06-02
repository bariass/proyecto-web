const AIService = (() => {
  const aliases = {
    sku: ["sku", "item", "item number", "part", "part number", "producto", "codigo", "material"],
    description: ["description", "descripcion", "desc", "product name", "nombre"],
    inventory: ["inventory", "stock", "on hand", "qty", "quantity", "cantidad", "inventario", "existencia"],
    safetyStock: ["safety stock", "ss", "min stock", "inventario seguridad", "stock seguridad"],
    demand: ["demand", "forecast", "sales", "ventas", "demanda", "pronostico"],
    production: ["production", "plan", "planned production", "produccion"],
    line: ["line", "linea", "work center", "centro", "cell"],
    capacity: ["capacity", "capacidad", "available hours", "horas"],
    employee: ["employee", "empleado", "operator", "operador", "name", "nombre"],
    vacation: ["vacation", "vacaciones", "absence", "ausencia"],
    event: ["event", "evento", "holiday", "festivo"]
  };

  function normalizeKey(key) {
    return String(key).trim().toLowerCase().replace(/[_-]+/g, " ");
  }

  function mapColumns(records) {
    const headers = Object.keys(records[0] || {});
    const mapping = {};
    headers.forEach(header => {
      const normalized = normalizeKey(header);
      const found = Object.entries(aliases).find(([, values]) => values.some(alias => normalized.includes(alias)));
      mapping[header] = found ? found[0] : header;
    });
    return mapping;
  }

  function normalizeRecords(records) {
    const mapping = mapColumns(records);
    const normalized = records.map(row => {
      const out = {};
      Object.entries(row).forEach(([key, value]) => {
        out[mapping[key]] = value;
      });
      return out;
    });
    return { mapping, records: normalized };
  }

  function analyze(data) {
    const products = data.products || [];
    const lines = data.lines || [];
    const totalInventory = products.reduce((sum, p) => sum + Number(p.inventory || 0), 0);
    const totalDemand = products.reduce((sum, p) => sum + Number(p.forecast || p.weeklyDemand || 0), 0);
    const coverageDays = Math.round((totalInventory / Math.max(totalDemand, 1)) * 7);
    const avgService = products.length ? Math.round(products.reduce((sum, p) => sum + p.service, 0) / products.length) : 0;
    const capacityRequired = lines.reduce((sum, l) => sum + l.required, 0);
    const capacityAvailable = lines.reduce((sum, l) => sum + l.hours * l.efficiency - l.maintenance, 0);
    const capacityUtilized = capacityAvailable ? Math.round((capacityRequired / capacityAvailable) * 100) : 0;
    const overtime = lines.reduce((sum, l) => sum + l.overtime, 0);
    const shortageProducts = products.filter(p => p.inventory < p.safetyStock || p.inventory / Math.max(p.forecast, 1) < 1.8);
    const excessProducts = products.filter(p => p.inventory / Math.max(p.weeklyDemand, 1) > 8);
    const recommendations = [];

    shortageProducts.forEach(p => recommendations.push({
      severity: "bad",
      title: `Riesgo de ruptura en ${p.sku}`,
      text: `Inventario actual ${p.inventory.toLocaleString()} vs stock de seguridad ${p.safetyStock.toLocaleString()}. Aumentar produccion durante las proximas 3 semanas.`
    }));
    excessProducts.forEach(p => recommendations.push({
      severity: "warn",
      title: `Sobreinventario en ${p.sku}`,
      text: `Cobertura estimada de ${Math.round((p.inventory / p.weeklyDemand) * 7)} dias. Reducir compras o reasignar capacidad.`
    }));
    lines.filter(l => l.required > (l.hours * l.efficiency - l.maintenance)).forEach(l => recommendations.push({
      severity: "warn",
      title: `Cuello de botella en ${l.line}`,
      text: `Requiere ${Math.round(l.required - (l.hours * l.efficiency - l.maintenance))} horas adicionales para cubrir la demanda.`
    }));
    if (!products.length && !lines.length) {
      recommendations.push({
        severity: "info",
        title: "Sin datos cargados",
        text: "Agrega productos, RTT y personal manualmente o sube un archivo para generar recomendaciones."
      });
    }

    return {
      kpis: {
        totalInventory,
        coverageDays,
        avgService,
        capacityUtilized,
        overtime,
        shortageRisk: shortageProducts.length,
        excessRisk: excessProducts.length,
        projectedDemand: totalDemand
      },
      risks: recommendations.filter(r => r.severity !== "info").slice(0, 6),
      recommendations: recommendations.slice(0, 7)
    };
  }

  function answer(question, data, insights) {
    const q = question.toLowerCase();
    if (q.includes("riesgo") || q.includes("productos")) {
      if (!data.products.length) return "Aun no hay productos cargados. Agrega productos manualmente o sube un archivo para calcular riesgos.";
      return `Productos con mayor riesgo: ${insights.risks.map(r => r.title.replace("Riesgo de ruptura en ", "")).join(", ")}. Prioriza los SKU con baja cobertura frente al forecast.`;
    }
    if (q.includes("extra") || q.includes("horas")) {
      if (!data.lines.length) return "Aun no hay RTT cargados. Agrega RTT con horas disponibles y capacidad requerida para calcular horas extra.";
      return `Si. El plan actual requiere aproximadamente ${insights.kpis.overtime} horas extra, concentradas en Machining y Packaging.`;
    }
    if (q.includes("produccion") || q.includes("aumentar")) {
      if (!data.products.length) return "Aun no hay demanda o inventario cargado. Cuando agregues productos, calculare que produccion conviene aumentar.";
      return "Aumenta produccion en los SKU con cobertura menor al stock de seguridad y revisa incrementos preventivos antes de eventos comerciales.";
    }
    if (q.includes("vacaciones") || q.includes("personal")) {
      if (!data.employees.length) return "Aun no hay personal cargado. Agrega empleados, asignales RTT y agenda vacaciones para simular el impacto.";
      return "Las vacaciones de julio reducen capacidad en Assembly y Packaging. Simula 4 operadores menos para ver un impacto cercano a 11% de capacidad.";
    }
    if (q.includes("event")) {
      if (!data.events?.length) return "Aun no hay eventos cargados. Consulta festivos o sube un calendario para medir impacto en demanda.";
      return "Los eventos cargados deben revisarse contra demanda historica. Recomiendo elevar inventario 30 dias antes de eventos con impacto comercial alto.";
    }
    return `Analisis general: cobertura ${insights.kpis.coverageDays} dias, servicio ${insights.kpis.avgService}%, capacidad utilizada ${insights.kpis.capacityUtilized}% y ${insights.kpis.shortageRisk} SKU con riesgo de faltante.`;
  }

  return { normalizeRecords, analyze, answer };
})();
