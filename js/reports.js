const ReportService = (() => {
  function build(type, data, insights) {
    if (!data.products.length && !data.lines.length && !data.employees.length) {
      return [
        "Reporte sin datos",
        "No hay informacion cargada para analizar.",
        "Agrega datos manualmente o sube un archivo de inventario, RTT, capacidad o personal.",
        "Los KPIs, riesgos y recomendaciones se generaran automaticamente despues de cargar datos."
      ];
    }

    const sections = {
      inventory: [
        "Reporte de Inventario",
        `Inventario total: ${insights.kpis.totalInventory.toLocaleString()} unidades`,
        `Cobertura promedio: ${insights.kpis.coverageDays} dias`,
        `SKU con riesgo de faltante: ${insights.kpis.shortageRisk}`,
        `SKU con sobreinventario: ${insights.kpis.excessRisk}`,
        "Accion: acelerar produccion de SKU con baja cobertura y pausar reposicion de productos con exceso."
      ],
      capacity: [
        "Reporte de Capacidad",
        `Capacidad utilizada: ${insights.kpis.capacityUtilized}%`,
        `Horas extra requeridas: ${insights.kpis.overtime}`,
        "Cuellos de botella: RTT B Machining y RTT D Packaging.",
        "Accion: agregar turno parcial y mover operadores certificados a RTT B."
      ],
      people: [
        "Reporte de Personal",
        `${data.employees.length} empleados con calendario de vacaciones.`,
        "Revisar concentracion de ausencias por RTT y periodo.",
        "Accion: contratar soporte temporal para 2 semanas o aprobar overtime controlado."
      ],
      predictive: [
        "Reporte Predictivo",
        "Se estimaran rupturas de inventario cuando exista historial suficiente.",
        "Se proyectaran excesos de inventario por familia y rotacion.",
        "Se alertara riesgo de saturacion de capacidad por periodo.",
        "Los eventos comerciales se evaluaran contra la demanda historica cargada."
      ]
    };
    return sections[type] || sections.inventory;
  }

  function download(name, text, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { build, download };
})();
