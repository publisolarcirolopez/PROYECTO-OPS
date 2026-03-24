# Changelog

---

## [V.0.1] - Versión Base Estable

### Módulos implementados

#### 1. Operarios
- Añadir operario (id, nombre, activo)
- Desactivar/Activar operario
- Eliminar operario

**Campos:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador único |
| nombre | string | Nombre del operario |
| activo | boolean | Estado activo/inactivo |

---

#### 2. Obras
- Añadir obra
- Editar obra
- Listar obras

**Campos:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| obraCodigo | string | Código único de la obra |
| nombre | string | Nombre (opcional) |
| importeTotal | number | Importe total de la obra |

---

#### 3. Calendario Operativo
- Vista por semanas dentro del mes seleccionado
- Selector de año y mes
- Navegación por semanas
- Tabla: filas = operarios activos, columnas = lunes-domingo
- Modal de edición de celdas
- Persistencia automática en localStorage

**Campos de celda:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| operarioId | string | ID del operario |
| fecha | string | Fecha (YYYY-MM-DD) |
| estado | EstadoCelda | Estado del día |
| obraCodigo | string | Código de obra (opcional) |
| nota | string | Nota (opcional) |

**Estados permitidos:**
- `trabaja` - Día trabajado (permite obraCodigo y nota)
- `vacaciones` - Días de vacaciones
- `baja` - Baja médica
- `festivo` - Día festivo
- `permiso` - Permiso laboral
- `libre` - Día libre

---

#### 4. Resumen Mensual
- Reparto automático del importe de cada obra entre participaciones válidas
- Resumen por operario: participaciones y facturación atribuida
- Resumen por obra: importe total, participaciones y valor por participación

**Reglas de reparto:**
- Participación válida = estado "trabaja" + obraCodigo informado + obra existe + operario activo
- `valorPorParticipacion = importeTotal / númeroDeParticipacionesVálidas`
- Cálculo dinámico (no se guarda en celdas)

---

### Estructura de archivos

```
src/
├── types.ts                    # Interfaces TypeScript
├── hooks/
│   └── useLocalStorage.ts      # Hook de persistencia
├── components/
│   ├── Operarios.tsx           # Módulo operarios
│   ├── Obras.tsx               # Módulo obras
│   ├── Calendario.tsx          # Módulo calendario
│   └── ResumenMensual.tsx      # Módulo resumen
└── App.tsx                     # Navegación principal
```

---

### Persistencia
- localStorage con claves:
  - `operarios` - Lista de operarios
  - `obras` - Lista de obras
  - `calendario` - Celdas del calendario
- Carga automática al iniciar
- Guardado automático en cada cambio

---

### NO implementado (pendiente para futuras versiones)
- Dashboard
- Gráficos
- Previsto
- Producción real
- PDF
- Exportaciones
- Importación Excel
- Copiar/pegar
- Login
- Roles

---

## Cómo usar

1. **Crear operarios** en el módulo "Operarios"
2. **Crear obras** en el módulo "Obras"
3. **Asignar trabajos** en el módulo "Calendario"
4. **Ver reparto** en el módulo "Resumen"

---

**Versión estable y funcional.** ✅
