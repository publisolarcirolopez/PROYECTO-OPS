// Tipos básicos para la aplicación

export interface Operario {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Obra {
  obraCodigo: string;
  nombre?: string;
  importeTotal: number;
  activa?: boolean;
}

export type EstadoCelda = 'trabaja' | 'vacaciones' | 'baja' | 'festivo' | 'permiso' | 'libre';

export interface CeldaCalendario {
  operarioId: string;
  fecha: string; // formato YYYY-MM-DD
  estado: EstadoCelda;
  obraCodigo?: string; // Por compatibilidad atrás
  obrasCodigos?: string[]; // Nueva lógica
  nota?: string;
}

export interface Festivo {
  id: string;
  fecha: string; // YYYY-MM-DD
  nombre?: string;
}

export interface Ausencia {
  id: string;
  operarioId: string;
  tipo: 'vacaciones' | 'baja' | 'permiso';
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  nota?: string;
}

export type Modulo = 'operarios' | 'obras' | 'calendario' | 'resumen' | 'dashboard' | 'ausencias';
