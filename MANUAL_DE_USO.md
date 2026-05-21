# MANUAL DE USO — SISTEMA OPERATIVO FREIMANAUTOS
**Versión 1.0 · Mayo 2026**

---

## ACCESO AL SISTEMA

**URL:** https://seguimiento.freimanautos.com (o la URL del servidor)

Todos los usuarios ingresan con su **número de cédula** y **contraseña** (la contraseña inicial es la misma cédula, a menos que el jefe la haya cambiado).

Los **clientes** usan el botón "¿Eres cliente? Consulta tu vehículo sin contraseña →" e ingresan solo su cédula.

---

---

# PERFIL 1 — GERENTE GENERAL

**Acceso con:** Cédula + Contraseña

El Gerente General tiene **acceso completo** a todas las funciones del sistema, igual que el Jefe de Taller, con el privilegio adicional de poder cambiar la contraseña del Jefe de Taller. El Jefe no puede cambiar la contraseña del Gerente.

Para ver las instrucciones completas, consultar la sección **PERFIL 2 — JEFE DE TALLER** más abajo.

### Funciones exclusivas del Gerente

**Cambiar contraseña del Jefe de Taller**
1. Ir a la sección **Mecánicos** desde el menú lateral
2. Buscar el botón **"🔐 Contraseña del Jefe"** (solo visible para el Gerente)
3. Ingresar la nueva contraseña y confirmarla
4. Hacer clic en **"Guardar"**

---

---

# PERFIL 2 — JEFE DE TALLER

**Acceso con:** Cédula + Contraseña

El Jefe de Taller tiene acceso completo a todas las secciones del sistema. Desde el menú lateral o la barra inferior (en celulares) puede navegar entre:

---

## 2.1 ESTADO DEL TALLER (Dashboard)

Vista general del taller con 4 pestañas:

### Pestaña "Mes actual"
- Total de órdenes ingresadas en el mes
- Total de entregas del mes
- Ingresos y entregas por día (gráfico)
- Próximas entregas programadas
- Servicios más trabajados
- Señales rápidas (alertas del día)

### Pestaña "General"
- Órdenes activas, en pulmón y entregadas
- Estado de capacidad del taller
- Gráfico de rendimiento por período
- Procesos activos en tiempo real

### Pestaña "Financiero"
- Tiempo real vs. tiempo estimado por servicio
- Órdenes demoradas
- Productividad por técnico

### Pestaña "Metas"
- Meta mensual de órdenes/ingresos
- Progreso actual vs. meta
- Historial de metas
- Cargar nueva meta desde archivo CSV

---

## 2.2 ÓRDENES

Lista de todas las órdenes del taller con filtros:

- **Activas** — Órdenes en proceso actualmente
- **Entregadas** — Historial de vehículos ya devueltos al cliente
- **En Pulmón** — Vehículos que terminaron el proceso pero aún no son reclamados

### Ver detalle de una orden
- Hacer clic en cualquier tarjeta de orden
- Se abre el detalle con: placa, cliente, servicios, etapas, mecánicos asignados, novedades y fotos

### Acciones dentro del detalle de una orden

**Iniciar / Pausar / Completar una etapa**
- Cada etapa tiene botones para cambiar su estado
- Estados posibles: Pendiente → En proceso → Completada

**Agregar novedades**
- Dentro de una etapa, botón **"+ Novedad"**
- Permite registrar imprevistos: garantías, reprocesos u otras novedades
- La novedad queda registrada con fecha y hora

**Enviar al pulmón**
- Botón **"Activar Pulmón"** en el detalle de la orden
- Mueve el vehículo a estado "En Pulmón" mientras espera ser reclamado
- Para sacarlo: mismo botón, ahora dice **"Sacar de Pulmón"**

**Registrar entrega**
- Botón **"Entregar"** cuando el vehículo está listo para el cliente
- Registra combustible actual, inventario del vehículo y fecha/hora de entrega

**Editar orden**
- Ícono de edición (lápiz) en el detalle
- Permite modificar: placa, cliente, vehículo, fechas, observaciones

---

## 2.3 NUEVA ORDEN

Formulario para crear una orden de trabajo. Campos:

1. **Cliente** — Buscar por cédula/NIT o nombre (o crear nuevo)
2. **Vehículo** — Placa, marca, modelo, año, VIN, color, kilometraje, combustible
3. **Servicios** — Seleccionar los servicios a realizar
4. **Etapas** — Asignar etapas a mecánicos específicos con tiempo estimado
5. **Fecha de entrega** — Fecha comprometida con el cliente
6. **Observaciones** — Notas adicionales para los técnicos

Clic en **"Crear orden"** para guardar.

---

## 2.4 COTIZACIONES

Lista de cotizaciones enviadas a clientes.

- Ver cotizaciones pendientes, aprobadas y rechazadas
- Crear nueva cotización con servicios y precios
- Aprobar o rechazar cotizaciones de clientes
- Ver historial de cotizaciones por cliente

---

## 2.5 CALENDARIO DE ENTREGAS

Vista de calendario con las fechas de entrega comprometidas.

- Ver qué vehículos deben entregarse cada día
- Identificar días con alta concentración de entregas
- Hacer clic en una orden del calendario para ir al detalle

---

## 2.6 MECÁNICOS

Vista de gestión del equipo de técnicos.

### Ver tarjeta de cada mecánico
- Nombre y rol (mecánico, lavador, etc.)
- Órdenes asignadas actualmente
- Métricas de rendimiento

### Acciones disponibles
**Ver reporte técnico individual**
- Botón **"Reporte"** en la tarjeta del mecánico
- Muestra historial de etapas completadas, tiempos, novedades

**Cambiar contraseña de un mecánico**
- Botón 🔐 (candado) en la tarjeta del mecánico
- Ingresar nueva contraseña y confirmar
- Hacer clic en **"Guardar"**

**Ver reporte de todos los técnicos**
- Botón **"Reporte de todos"** en la parte superior
- Genera un PDF comparativo de productividad del equipo

*(Solo el Gerente ve el botón "Contraseña del Jefe")*

---

## 2.7 REPUESTOS

Panel de gestión de solicitudes de repuestos.

### Solicitudes pendientes
- Lista de repuestos pedidos por los mecánicos
- Ver: repuesto, cantidad, orden, vehículo y mecánico que lo solicitó
- **Aprobar** la solicitud para que el área de repuestos la atienda
- **Rechazar** la solicitud con motivo

### Solicitudes completadas
- Historial de repuestos ya entregados
- Ver precio de venta asignado

### Definir precio de venta
- Al completar una cotización de repuesto, el jefe puede definir el precio de venta al cliente
- Botón **"Ver cotizaciones y definir precio venta"**

---

## 2.8 REPORTES

Generación de reportes en PDF o Excel.

### Tipos de reporte
- **Reporte general** del taller (rango de fechas libre)
- **Reporte por técnico** (individual)
- **Reporte de órdenes**

### Contenido del reporte general
- Análisis por servicio (tiempo real vs. estimado)
- Rendimiento por técnico
- Calidad (reprocesos y garantías)
- Cuellos de botella
- Tipos de cliente
- Repuestos más solicitados
- KPIs generales del período

### Cómo generar un reporte
1. Seleccionar tipo de reporte
2. Elegir rango de fechas (desde — hasta)
3. Elegir formato: **PDF** o **Excel**
4. Hacer clic en **"Generar"**
5. El reporte se abre en una nueva pestaña para imprimir o descargar

---

## 2.9 FLOTILLAS

Gestión de clientes con múltiples vehículos (empresas, flotas).

- Ver empresas registradas como flotilla
- Lista de vehículos por flotilla
- Historial de órdenes por empresa

---

## 2.10 INDICADOR DE CAPACIDAD (barra lateral)

En el menú lateral, el Jefe y el Gerente ven un **medidor de capacidad del taller**:

- **Donut chart** que muestra el % de ocupación
- Número de órdenes activas vs. cupos totales
- Colores de referencia: verde (normal), amarillo (lleno), naranja (pulmón interno activo)

---

---

# PERFIL 3 — MECÁNICO / TÉCNICO

**Acceso con:** Cédula + Contraseña

El mecánico accede a las órdenes que le han sido asignadas por el jefe.

---

## 3.1 MIS ÓRDENES

Lista de etapas asignadas al mecánico en este momento.

### Ver una orden
- Hacer clic en la tarjeta de la orden
- Ver: placa, vehículo, cliente, servicio, etapa asignada

### Acciones dentro de una orden

**Iniciar una etapa**
- Botón **"Iniciar"** cuando la etapa está pendiente
- El sistema registra la hora de inicio automáticamente

**Pausar una etapa**
- Botón **"Pausar"** cuando hay que detener temporalmente el trabajo
- Útil cuando se necesita esperar un repuesto o autorización

**Completar una etapa**
- Botón **"Completar"** cuando el trabajo está terminado
- El sistema registra la hora de finalización

**Registrar una novedad**
- Botón **"+ Novedad"** dentro de la etapa
- Sirve para reportar: problemas encontrados, garantías, reprocesos
- Se describe el motivo y se guarda con fecha/hora

**Ver fotos de la etapa**
- Si el jefe subió fotos, se muestran en el detalle de la etapa

---

## 3.2 MI HISTORIAL

Lista de todas las etapas que el mecánico ha completado anteriormente.

- Ver historial completo de trabajo
- Filtrar por período o vehículo
- Ver tiempos empleados en cada etapa

---

## 3.3 SOLICITUDES DE REPUESTO

Módulo para pedir repuestos necesarios para las órdenes asignadas.

### Crear una solicitud
1. Ir a la sección **"Solicitudes"**
2. Hacer clic en **"+ Solicitar repuesto"**
3. Seleccionar la orden y la etapa que lo requiere
4. Escribir el nombre del repuesto y la cantidad
5. Hacer clic en **"Enviar solicitud"**

### Estados de una solicitud
- **Pendiente** — Esperando aprobación del jefe
- **Aprobada** — El jefe la aprobó, repuestos la está atendiendo
- **En cotización** — Repuestos está cotizando el precio
- **Lista** — El repuesto está disponible para retirar
- **Entregada** — El repuesto fue entregado al mecánico
- **Rechazada** — El jefe rechazó la solicitud (con motivo)

> **Nota:** Cuando una solicitud es aprobada y el repuesto está listo, la etapa se reanuda automáticamente.

---

---

# PERFIL 4 — PANTALLA TALLER (TV)

**Acceso con:** Cédula (sin contraseña)

Esta pantalla está diseñada para una **TV o monitor en el taller**. No requiere interacción, es solo de visualización.

---

## Qué muestra

- Lista de todas las órdenes **activas** en el taller
- Para cada orden: placa, vehículo, cliente, etapa actual y mecánico asignado
- Estado de cada etapa en tiempo real (se actualiza automáticamente)
- Indicador de cuánto tiempo lleva cada orden en proceso

## Comportamiento automático

- **Se actualiza solo** cada pocos segundos (sin necesidad de recargar)
- **Alerta de audio** cuando llega una nueva orden al taller
- **Flash visual** en la fila cuando una etapa cambia de estado
- Las órdenes en Pulmón se muestran diferenciadas

## Recomendaciones de configuración

- Conectar en modo **pantalla completa** (tecla F11 en Chrome)
- Mantener el navegador siempre abierto
- Usar Chrome o Edge para mejor compatibilidad
- La sesión no expira en este perfil

---

---

# PERFIL 5 — REPUESTOS

**Acceso con:** Cédula + Contraseña

El área de repuestos gestiona todas las solicitudes de piezas y proveedores.

---

## 5.1 SOLICITUDES PENDIENTES

Lista de solicitudes de repuesto enviadas por los mecánicos y aprobadas por el jefe.

### Cotizar un repuesto
1. Hacer clic en **"Cotizar"** en la solicitud correspondiente
2. Se abre el formulario de cotización
3. Ingresar hasta **3 opciones de proveedor** con precio, tiempo de entrega y disponibilidad
4. Para cada opción hay un enlace **WhatsApp** para contactar al proveedor directamente
5. Hacer clic en **"Guardar cotizaciones"**
6. Las cotizaciones pasan al jefe para que defina el precio de venta

### Registrar entrega
- Una vez que el repuesto llega, botón **"Marcar como entregado"**
- La etapa del mecánico se reanuda automáticamente

---

## 5.2 HISTORIAL DE SOLICITUDES

Registro de todas las solicitudes procesadas anteriormente.

- Ver repuestos entregados con fecha, proveedor y precio
- Filtrar por fecha o por orden

---

## 5.3 PROVEEDORES

Base de datos de proveedores de repuestos.

### Agregar un proveedor
1. Hacer clic en **"+ Nuevo proveedor"**
2. Ingresar: nombre, teléfono, especialidad, si es multimarca
3. Guardar

### Editar un proveedor
- Hacer clic en el ícono de edición (lápiz) en la tarjeta del proveedor
- Modificar los datos y guardar

---

---

# PERFIL 6 — CLIENTE

**Acceso con:** Solo cédula (sin contraseña) usando el botón "¿Eres cliente?"

El cliente puede consultar el estado de su vehículo en cualquier momento desde su celular, tablet o computador.

---

## Qué puede ver el cliente

### Estado de su orden
- Estado actual: Activa / En proceso / En Pulmón / Entregada
- Fecha de ingreso y fecha de entrega estimada
- Placa y datos del vehículo

### Progreso de los servicios
- Lista de servicios en proceso
- Etapas completadas y pendientes (con porcentaje de avance)
- Mecánico asignado a cada etapa

### Novedades
- Si el taller registró alguna novedad (problema encontrado, garantía, etc.), aparece aquí con fecha y descripción

### Fotos
- Si el taller subió fotos del proceso, el cliente puede verlas

### Repuestos
- Lista de repuestos instalados en su vehículo con precio si está disponible

---

## Lo que el cliente NO puede hacer

- No puede modificar nada
- No puede ver órdenes de otros clientes
- No tiene acceso a información financiera del taller

---

---

# PREGUNTAS FRECUENTES

### ¿Olvidé mi contraseña?
Comunicarse con el Jefe de Taller o el Gerente para que la restablezca desde la sección **Mecánicos**.

### ¿Por qué no veo mis órdenes?
Para mecánicos: el Jefe debe asignarle etapas específicas. Consultar con el Jefe de Taller.
Para clientes: verificar que la cédula ingresada sea la misma con la que fue registrado en el sistema.

### ¿Qué hago si el sistema no carga?
1. Verificar conexión a internet
2. En celular: cerrar el navegador completamente y volver a abrir
3. Si es la primera vez en el día: puede tardar unos segundos en cargar

### ¿Se puede usar en celular?
Sí. El sistema es compatible con iPhone y Android. Se recomienda usar **Google Chrome** o **Safari**. También se puede instalar como app (PWA) desde el menú del navegador → "Agregar a pantalla de inicio".

### ¿Los datos se guardan en tiempo real?
Sí. Todos los cambios se guardan automáticamente en la nube. No se necesita hacer nada adicional para guardar.

---

*Manual generado para uso interno de Freimanautos · Versión 1.0 · Mayo 2026*
