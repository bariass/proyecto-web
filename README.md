# Manufacturing Inventory & Capacity Planning Assistant

Aplicacion web estatica para planificadores de manufactura. Incluye dashboard ejecutivo, carga inteligente de datos, datos manuales editables, analisis IA local, capacidad por RTT, personal asignado a RTT, vacaciones, calendario global, escenarios, reportes y chatbot.

## Como ejecutar

Abre `index.html` directamente o usa el servidor local iniciado en:

```text
http://localhost:8080
```

Login:

```text
Usuario: cualquier valor
Password: cualquier valor
Rol: Administrador, Planificador o Supervisor
```

## Estructura

```text
index.html
css/styles.css
js/data.js
js/ai-service.js
js/reports.js
js/app.js
```

## Integraciones preparadas

- Bootstrap 5 para layout responsive.
- Chart.js para graficos ejecutivos.
- SheetJS para carga de Excel `.xlsx`.
- CRUD manual de inventario/productos, RTT, empleados y vacaciones.
- Asignacion de personas a RTT y recalculo automatico de capacidad.
- Modulo Align Metrics para iTero/Lumina: adopcion Lumina, wand upgrades, scan volume, conversion scan-to-case y revenue por sistema.
- `AIService` como capa intercambiable para conectar OpenAI API, Azure OpenAI, Claude API o Gemini API desde un backend.
- Consulta publica de festivos mediante `https://date.nager.at`.

La aplicacion no guarda API keys ni datos en servidor; todo corre en el navegador e inicia sin datos de muestra.
