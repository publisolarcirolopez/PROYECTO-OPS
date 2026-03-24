import { Operario, Festivo, Ausencia } from '../types';

// Preparado para futura activación de trabajo en sábado o calendarios especiales.
// En esta versión no se expone en la UI: sábados y domingos son siempre no laborables.
interface ConfigCapacidad {
  incluirSabados?: boolean;
  incluirDomingos?: boolean;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Devuelve true si la fecha (YYYY-MM-DD) cae en fin de semana según la config. */
export function esFinDeSemana(fechaStr: string, config: ConfigCapacidad = {}): boolean {
  const dow = new Date(fechaStr + 'T00:00:00').getDay(); // 0=Dom, 6=Sáb
  if (dow === 6 && !config.incluirSabados) return true;
  if (dow === 0 && !config.incluirDomingos) return true;
  return false;
}

/** Devuelve true si la fecha está en la lista de festivos. */
export function esFestivo(fechaStr: string, festivos: Festivo[]): boolean {
  return festivos.some(f => f.fecha === fechaStr);
}

/** Devuelve true si la fecha es un día laborable (no fin de semana y no festivo). */
export function esLaborable(
  fechaStr: string,
  festivos: Festivo[],
  config: ConfigCapacidad = {}
): boolean {
  return !esFinDeSemana(fechaStr, config) && !esFestivo(fechaStr, festivos);
}

/** Devuelve el array de fechas (YYYY-MM-DD) laborables del mes dado. */
export function getDiasLaborablesMes(
  anio: number,
  mes: number,
  festivos: Festivo[],
  config: ConfigCapacidad = {}
): string[] {
  const dias: string[] = [];
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  for (let d = 1; d <= ultimoDia; d++) {
    const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (esLaborable(fechaStr, festivos, config)) dias.push(fechaStr);
  }
  return dias;
}

/**
 * Días laborables desde hoy (inclusive) hasta fin del mes seleccionado.
 * Si el mes ya pasó, devuelve [].
 * Si el mes es futuro, devuelve todos los días laborables.
 */
export function getDiasLaborablesRestantes(
  anio: number,
  mes: number,
  festivos: Festivo[],
  hoy: Date,
  config: ConfigCapacidad = {}
): string[] {
  const todos = getDiasLaborablesMes(anio, mes, festivos, config);
  // Primer día del mes siguiente (maneja diciembre correctamente)
  const primerDiaSiguiente = toLocalDateStr(new Date(anio, mes + 1, 1));
  const hoyStr = toLocalDateStr(hoy);
  if (hoyStr >= primerDiaSiguiente) return []; // mes pasado
  return todos.filter(d => d >= hoyStr);
}

/**
 * Cuenta cuántos días laborables de la ausencia caen dentro del mes objetivo.
 * Intersecta el rango de la ausencia con el mes para no contar días fuera del mes.
 */
function contarDiasLaborablesEnRango(
  fechaInicio: string,
  fechaFin: string,
  anio: number,
  mes: number,
  festivos: Festivo[],
  config: ConfigCapacidad = {}
): number {
  const mesStr = String(mes + 1).padStart(2, '0');
  const primerDiaMes = `${anio}-${mesStr}-01`;
  const ultimoDiaMes = `${anio}-${mesStr}-${new Date(anio, mes + 1, 0).getDate().toString().padStart(2, '0')}`;

  // Intersección del rango de ausencia con el mes
  const inicio = fechaInicio < primerDiaMes ? primerDiaMes : fechaInicio;
  const fin = fechaFin > ultimoDiaMes ? ultimoDiaMes : fechaFin;

  if (inicio > fin) return 0;

  let count = 0;
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin + 'T00:00:00');
  while (cur <= end) {
    if (esLaborable(toLocalDateStr(cur), festivos, config)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export interface CapacidadMes {
  /** Total de días laborables en el mes (sin festivos ni fines de semana) */
  diasLaborablesMes: number;
  /** Días laborables desde hoy hasta fin de mes (inclusive) */
  diasLaborablesRestantes: number;
  /** Días laborables ya transcurridos */
  diasLaborablesTranscurridos: number;
  /** operariosActivos.length × diasLaborablesMes */
  capacidadTeorica: number;
  /** capacidadTeorica − totalDiasAusencia */
  capacidadReal: number;
  /** Días de ausencia por operario en el mes (solo días laborables) */
  ausenciasPorOperario: Record<string, number>;
  /** Suma total de días de ausencia de todos los operarios activos */
  totalDiasAusencia: number;
}

export function calcularCapacidadMes(params: {
  anio: number;
  mes: number;
  operariosActivos: Operario[];
  festivos: Festivo[];
  ausencias: Ausencia[];
  hoy?: Date;
}): CapacidadMes {
  const { anio, mes, operariosActivos, festivos, ausencias, hoy = new Date() } = params;

  const diasLaborables = getDiasLaborablesMes(anio, mes, festivos);
  const diasRestantes = getDiasLaborablesRestantes(anio, mes, festivos, hoy);

  const diasLaborablesMes = diasLaborables.length;
  const diasLaborablesRestantes = diasRestantes.length;
  const diasLaborablesTranscurridos = diasLaborablesMes - diasLaborablesRestantes;

  const ausenciasPorOperario: Record<string, number> = {};
  let totalDiasAusencia = 0;

  operariosActivos.forEach(op => {
    const ausenciasOp = ausencias.filter(a => a.operarioId === op.id);
    let diasAusente = 0;
    ausenciasOp.forEach(a => {
      diasAusente += contarDiasLaborablesEnRango(
        a.fechaInicio, a.fechaFin, anio, mes, festivos
      );
    });
    ausenciasPorOperario[op.id] = diasAusente;
    totalDiasAusencia += diasAusente;
  });

  const capacidadTeorica = operariosActivos.length * diasLaborablesMes;
  const capacidadReal = Math.max(0, capacidadTeorica - totalDiasAusencia);

  return {
    diasLaborablesMes,
    diasLaborablesRestantes,
    diasLaborablesTranscurridos,
    capacidadTeorica,
    capacidadReal,
    ausenciasPorOperario,
    totalDiasAusencia,
  };
}
