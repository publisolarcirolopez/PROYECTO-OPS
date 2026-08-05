import { useState, useMemo, useEffect, useRef } from 'react';
import { Operario, Obra, CeldaCalendario, EstadoCelda, Festivo } from '../types';
import { useFirestoreState } from '../hooks/useFirestoreState';
import { esFestivo, esFinDeSemana } from '../utils/capacidad';
import { exportarPlanningSemanalPDF } from '../utils/exportPdf';

const ESTADOS: EstadoCelda[] = ['trabaja', 'vacaciones', 'baja', 'festivo', 'permiso', 'libre'];

// Paleta de "chips" de obra (fondo + texto) para las celdas del calendario.
const PALETA_PILLS = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800',
  'bg-rose-100 text-rose-800',
  'bg-lime-100 text-lime-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-sky-100 text-sky-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
];
function getPillObra(codigo: string) {
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETA_PILLS[Math.abs(hash) % PALETA_PILLS.length];
}

const ESTADO_PILL: Record<string, string> = {
  vacaciones: 'bg-amber-100 text-amber-800',
  baja: 'bg-red-100 text-red-800',
  permiso: 'bg-orange-100 text-orange-800',
  festivo: 'bg-purple-100 text-purple-800',
};
const ESTADO_LABEL: Record<string, string> = {
  vacaciones: 'Vacaciones',
  baja: 'Baja',
  permiso: 'Permiso',
  festivo: 'Festivo',
  trabaja: '',
  libre: '',
};
function iniciales(nombre: string) {
  return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getLunesDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatFecha(d: Date): string {
  // Formateo en fecha LOCAL. Antes se usaba toISOString(), que convierte a UTC
  // y en husos al este de Greenwich (España UTC+1/+2) devolvía el día anterior,
  // desplazando el guardado/consulta de cada celda -1 día.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function agregarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function getSemanasDelMes(year: number, month: number): Date[] {
  const semanas: Date[] = [];
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);

  let lunes = getLunesDeSemana(primerDia);

  while (lunes <= ultimoDia) {
    semanas.push(new Date(lunes));
    lunes = agregarDias(lunes, 7);
  }

  return semanas;
}

let celdaCopiada: Partial<CeldaCalendario> | null = null;

interface ModalProps {
  celda: CeldaCalendario | null;
  obras: Obra[];
  onClose: () => void;
  onSave: (celda: CeldaCalendario) => void;
  onDelete: () => void;
}

function Modal({ celda, obras, onClose, onSave, onDelete }: ModalProps) {
  const [estado, setEstado] = useState<EstadoCelda>(celda?.estado || 'libre');
  
  // Compatibilidad hacia atrás: si tiene obraCodigo único, lo pasamos a array
  const initialObras = celda?.obrasCodigos || (celda?.obraCodigo ? [celda.obraCodigo] : []);
  const [obrasCodigos, setObrasCodigos] = useState<string[]>(initialObras);
  
  const [nota, setNota] = useState(celda?.nota || '');

  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [hasCopiedData, setHasCopiedData] = useState(!!celdaCopiada);

  const handleCopy = () => {
    celdaCopiada = {
      estado,
      obrasCodigos: estado === 'trabaja' ? [...obrasCodigos] : undefined,
      nota: estado === 'trabaja' ? nota : undefined,
    };
    setHasCopiedData(true);
  };

  const handlePaste = () => {
    if (!celdaCopiada) return;
    setEstado(celdaCopiada.estado || 'libre');
    // Para portapapeles antiguo que solo tenía `obraCodigo`
    const pastedObras = celdaCopiada.obrasCodigos || (celdaCopiada.obraCodigo ? [celdaCopiada.obraCodigo] : []);
    setObrasCodigos([...pastedObras]);
    setNota(celdaCopiada.nota || '');
    setSearchTerm('');
  };

  const obrasFiltradas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return obras.filter(o => {
      if (o.activa === false) return false;
      return o.obraCodigo.toLowerCase().includes(term) ||
             (o.nombre || '').toLowerCase().includes(term);
    });
  }, [obras, searchTerm]);

  if (!celda) return null;

  // La celda ya tiene datos persistidos (no es una celda nueva vacía)
  const celdaTieneDatos =
    (!!celda.estado && celda.estado !== 'libre') ||
    (!!celda.obrasCodigos && celda.obrasCodigos.length > 0) ||
    !!celda.obraCodigo ||
    !!celda.nota;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowOptions(true);
  };

  const seleccionarObra = (obra: Obra) => {
    if (!obrasCodigos.includes(obra.obraCodigo)) {
      setObrasCodigos([...obrasCodigos, obra.obraCodigo]);
    }
    setSearchTerm('');
    setShowOptions(false);
  };

  const quitarObra = (codigo: string) => {
    setObrasCodigos(obrasCodigos.filter(c => c !== codigo));
  };

  const handleSave = () => {
    onSave({
      ...celda,
      estado,
      obrasCodigos: estado === 'trabaja' ? [...obrasCodigos] : undefined,
      obraCodigo: undefined, // Limpiamos rastro antiguo para evitar conflictos
      nota: estado === 'trabaja' ? nota || undefined : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold">
            {new Date(celda.fecha + 'T00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </h3>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200" type="button">Copiar</button>
            {hasCopiedData && (
              <button onClick={handlePaste} className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded hover:bg-brand-200" type="button">Pegar</button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoCelda)}
              className="w-full border px-3 py-2 rounded"
            >
              {ESTADOS.map(e => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>
          </div>

          {estado === 'trabaja' && (
            <>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Obras Asignadas</label>
                
                {/* Obras seleccionadas (Chips) */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {obrasCodigos.length === 0 && (
                    <span className="text-gray-400 text-sm italic">Ninguna obra asignada</span>
                  )}
                  {obrasCodigos.map(codigo => {
                    const ob = obras.find(o => o.obraCodigo === codigo);
                    return (
                      <div key={codigo} className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                        <span className="font-mono">{codigo}</span>
                        {ob?.nombre && <span className="opacity-75 truncate max-w-[100px]">{ob.nombre}</span>}
                        <button 
                          onClick={() => quitarObra(codigo)} 
                          className="ml-1 text-brand-600 hover:text-brand-800 font-bold"
                          title="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowOptions(true)}
                  onBlur={() => setTimeout(() => setShowOptions(false), 200)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Añadir obra por código o nombre..."
                  autoComplete="off"
                />
                
                {showOptions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                    {obrasFiltradas.length > 0 ? (
                      obrasFiltradas.map(o => (
                        <div
                          key={o.obraCodigo}
                          onClick={() => seleccionarObra(o)}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                        >
                          {o.obraCodigo} {o.nombre ? `- ${o.nombre}` : ''}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">No hay resultados</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Nota..."
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-500 text-white px-4 py-2 rounded hover:bg-brand-600"
          >
            Guardar
          </button>
          {celdaTieneDatos && (
            <button
              onClick={onDelete}
              className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200"
            >
              Borrar
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

interface BulkModalProps {
  count: number;
  obras: Obra[];
  onApply: (estado: EstadoCelda, obrasCodigos: string[], nota: string) => void;
  onClose: () => void;
}

function BulkModal({ count, obras, onApply, onClose }: BulkModalProps) {
  const [estado, setEstado] = useState<EstadoCelda>('trabaja');
  const [obrasCodigos, setObrasCodigos] = useState<string[]>([]);
  const [nota, setNota] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const obrasFiltradas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return obras.filter(o => {
      if (o.activa === false) return false;
      return o.obraCodigo.toLowerCase().includes(term) || (o.nombre || '').toLowerCase().includes(term);
    });
  }, [obras, searchTerm]);

  const seleccionarObra = (obra: Obra) => {
    if (!obrasCodigos.includes(obra.obraCodigo)) setObrasCodigos([...obrasCodigos, obra.obraCodigo]);
    setSearchTerm('');
    setShowOptions(false);
  };
  const quitarObra = (codigo: string) => setObrasCodigos(obrasCodigos.filter(c => c !== codigo));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-charcoal mb-1">Asignar a {count} casillas</h3>
        <p className="text-sm text-gray-500 mb-4">Se aplicará lo mismo a todas las casillas seleccionadas.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoCelda)}
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm"
            >
              {ESTADOS.map(e => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>
          </div>

          {estado === 'trabaja' && (
            <>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Obras asignadas</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {obrasCodigos.length === 0 && (
                    <span className="text-gray-400 text-sm italic">Ninguna obra asignada</span>
                  )}
                  {obrasCodigos.map(codigo => {
                    const ob = obras.find(o => o.obraCodigo === codigo);
                    return (
                      <div key={codigo} className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                        <span className="font-mono">{codigo}</span>
                        {ob?.nombre && <span className="opacity-75 truncate max-w-[100px]">{ob.nombre}</span>}
                        <button onClick={() => quitarObra(codigo)} className="ml-1 text-brand-600 hover:text-brand-800 font-bold">×</button>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setShowOptions(true); }}
                  onFocus={() => setShowOptions(true)}
                  onBlur={() => setTimeout(() => setShowOptions(false), 200)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm"
                  placeholder="Añadir obra por código o nombre..."
                  autoComplete="off"
                />
                {showOptions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {obrasFiltradas.length > 0 ? (
                      obrasFiltradas.map(o => (
                        <div key={o.obraCodigo} onClick={() => seleccionarObra(o)} className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                          {o.obraCodigo} {o.nombre ? `- ${o.nombre}` : ''}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">No hay resultados</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm"
                  placeholder="Nota..."
                />
              </div>
            </>
          )}

          {estado === 'libre' && (
            <p className="text-sm text-gray-500 bg-gray-50 border rounded-lg px-3 py-2">
              Se vaciarán las {count} casillas seleccionadas.
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => onApply(estado, obrasCodigos, nota)} className="crm-btn flex-1 justify-center">
            Aplicar a {count}
          </button>
          <button onClick={onClose} className="crm-btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function Calendario() {
  const [operarios] = useFirestoreState<Operario[]>('operarios', []);
  const [obras] = useFirestoreState<Obra[]>('obras', []);
  const [celdas, setCeldas] = useFirestoreState<CeldaCalendario[]>('calendario', []);
  const [festivos] = useFirestoreState<Festivo[]>('festivos', []);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [semanaIndex, setSemanaIndex] = useState(0);
  const [modalCelda, setModalCelda] = useState<CeldaCalendario | null>(null);

  const operariosActivos = useMemo(() => operarios.filter(o => o.activo), [operarios]);
  const semanas = useMemo(() => getSemanasDelMes(year, month), [year, month]);

  const diasSemana = useMemo(() => {
    if (semanas.length === 0) return [];
    const lunes = semanas[semanaIndex] || semanas[0];
    return Array.from({ length: 7 }, (_, i) => agregarDias(lunes, i));
  }, [semanas, semanaIndex]);

  const getCelda = (operarioId: string, fecha: string): CeldaCalendario | null => {
    return celdas.find(c => c.operarioId === operarioId && c.fecha === fecha) || null;
  };

  const abrirModal = (operarioId: string, fecha: string) => {
    const existente = getCelda(operarioId, fecha);
    setModalCelda(existente || { operarioId, fecha, estado: 'libre' });
  };

  const guardarCelda = (celda: CeldaCalendario) => {
    setCeldas(prev => {
      const filtradas = prev.filter(c => !(c.operarioId === celda.operarioId && c.fecha === celda.fecha));
      if (celda.estado === 'libre' && !celda.obraCodigo && !celda.nota) {
        return filtradas;
      }
      return [...filtradas, celda];
    });
    setModalCelda(null);
  };

  const borrarCelda = () => {
    if (!modalCelda) return;
    setCeldas(prev => prev.filter(c => !(c.operarioId === modalCelda.operarioId && c.fecha === modalCelda.fecha)));
    setModalCelda(null);
  };

  // --- Selección por arrastre (multi-casilla) ---
  const [selAnchor, setSelAnchor] = useState<{ r: number; c: number } | null>(null);
  const [selFocus, setSelFocus] = useState<{ r: number; c: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [bulkCells, setBulkCells] = useState<{ operarioId: string; fecha: string }[] | null>(null);
  const dragMultiRef = useRef(false);

  const selKeys = useMemo(() => {
    const s = new Set<string>();
    if (!selAnchor || !selFocus) return s;
    const r0 = Math.min(selAnchor.r, selFocus.r), r1 = Math.max(selAnchor.r, selFocus.r);
    const c0 = Math.min(selAnchor.c, selFocus.c), c1 = Math.max(selAnchor.c, selFocus.c);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) s.add(`${r}-${c}`);
    return s;
  }, [selAnchor, selFocus]);

  const iniciarSel = (r: number, c: number) => {
    setSelAnchor({ r, c });
    setSelFocus({ r, c });
    setDragging(true);
    dragMultiRef.current = false;
  };
  const extenderSel = (r: number, c: number) => {
    if (!dragging) return;
    setSelFocus({ r, c });
    if (selAnchor && (selAnchor.r !== r || selAnchor.c !== c)) dragMultiRef.current = true;
  };

  // Fin del arrastre en cualquier punto de la ventana
  useEffect(() => {
    if (!dragging) return;
    const onUp = () => {
      setDragging(false);
      if (!selAnchor || !selFocus) return;
      const r0 = Math.min(selAnchor.r, selFocus.r), r1 = Math.max(selAnchor.r, selFocus.r);
      const c0 = Math.min(selAnchor.c, selFocus.c), c1 = Math.max(selAnchor.c, selFocus.c);
      const cells: { operarioId: string; fecha: string }[] = [];
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const op = operariosActivos[r];
        const d = diasSemana[c];
        if (op && d) cells.push({ operarioId: op.id, fecha: formatFecha(d) });
      }
      if (cells.length > 1) {
        setBulkCells(cells); // abre el editor masivo; mantiene el resaltado
      } else {
        setSelAnchor(null);
        setSelFocus(null);
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [dragging, selAnchor, selFocus, operariosActivos, diasSemana]);

  const cerrarBulk = () => {
    setBulkCells(null);
    setSelAnchor(null);
    setSelFocus(null);
  };

  const aplicarBulk = (estado: EstadoCelda, obrasCodigos: string[], nota: string) => {
    if (!bulkCells) return;
    const selSet = new Set(bulkCells.map(c => `${c.operarioId}|${c.fecha}`));
    setCeldas(prev => {
      const next = prev.filter(c => !selSet.has(`${c.operarioId}|${c.fecha}`));
      if (estado !== 'libre') {
        bulkCells.forEach(c => {
          next.push({
            operarioId: c.operarioId,
            fecha: c.fecha,
            estado,
            obrasCodigos: estado === 'trabaja' ? [...obrasCodigos] : undefined,
            nota: estado === 'trabaja' ? (nota || undefined) : undefined,
          });
        });
      }
      return next;
    });
    cerrarBulk();
  };

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="p-6">
      {/* Controles */}
      <div className="crm-card p-3 mb-6 flex gap-3 items-center flex-wrap">
        <select
          value={year}
          onChange={e => { setYear(Number(e.target.value)); setSemanaIndex(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {[year - 1, year, year + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={e => { setMonth(Number(e.target.value)); setSemanaIndex(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {meses.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={() => setSemanaIndex(Math.max(0, semanaIndex - 1))}
            disabled={semanaIndex === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            ◀
          </button>
          <div className="px-3 text-center min-w-[7rem]">
            <div className="text-sm font-semibold text-charcoal">
              Semana {semanaIndex + 1}<span className="text-gray-400 font-normal"> / {semanas.length}</span>
            </div>
            {diasSemana.length === 7 && (
              <div className="text-xs text-gray-400">
                {diasSemana[0].getDate()}–{diasSemana[6].getDate()} {meses[diasSemana[6].getMonth()].toLowerCase()}
              </div>
            )}
          </div>
          <button
            onClick={() => setSemanaIndex(Math.min(semanas.length - 1, semanaIndex + 1))}
            disabled={semanaIndex >= semanas.length - 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            ▶
          </button>
        </div>

        <button
          onClick={() => exportarPlanningSemanalPDF({
            dias: diasSemana,
            operarios: operariosActivos,
            celdas,
            obras,
            festivos,
          })}
          disabled={operariosActivos.length === 0 || diasSemana.length === 0}
          className="crm-btn ml-auto"
          title="Descargar el planning de esta semana en PDF"
        >
          <span>📄</span> Exportar PDF
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-2">
        Consejo: arrastra sobre varias casillas para asignarles lo mismo de golpe.
      </p>

      {/* Tabla */}
      <div className="crm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px] select-none">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 border-b border-gray-100">
                  Instalador
                </th>
                {diasSemana.map((d, i) => {
                  const fechaStr = formatFecha(d);
                  const esFDS = esFinDeSemana(fechaStr);
                  const esFest = esFestivo(fechaStr, festivos);
                  const festNombre = festivos.find(f => f.fecha === fechaStr)?.nombre;
                  return (
                    <th
                      key={i}
                      className={`px-2 py-2.5 text-center border-b border-l border-gray-100 min-w-[104px] ${
                        esFest ? 'bg-purple-50' : esFDS ? 'bg-gray-50' : 'bg-gray-50/60'
                      }`}
                    >
                      <div className={`text-[11px] uppercase tracking-wide font-semibold ${esFDS ? 'text-gray-400' : 'text-gray-500'}`}>
                        {DIAS[i]}
                      </div>
                      <div className={`text-base font-bold ${esFest ? 'text-purple-700' : 'text-charcoal'}`}>
                        {d.getDate()}
                      </div>
                      {esFest && (
                        <div className="text-[8px] font-semibold text-purple-600 truncate max-w-[90px] mx-auto" title={festNombre || 'Festivo'}>
                          {festNombre || 'Festivo'}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {operariosActivos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No hay instaladores activos
                  </td>
                </tr>
              ) : (
                operariosActivos.map((op, rowIdx) => (
                  <tr key={op.id}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-b border-gray-50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {iniciales(op.nombre)}
                        </div>
                        <span className="font-medium text-charcoal text-sm whitespace-nowrap">{op.nombre}</span>
                      </div>
                    </td>
                    {diasSemana.map((d, i) => {
                      const fecha = formatFecha(d);
                      const celda = getCelda(op.id, fecha);
                      const estado = celda?.estado || 'libre';
                      const esFDS = esFinDeSemana(fecha);
                      const esFest = esFestivo(fecha, festivos);
                      const listaObras = celda?.obrasCodigos || (celda?.obraCodigo ? [celda.obraCodigo] : []);
                      const seleccionada = selKeys.has(`${rowIdx}-${i}`);

                      return (
                        <td
                          key={i}
                          onMouseDown={(e) => { e.preventDefault(); iniciarSel(rowIdx, i); }}
                          onMouseEnter={() => extenderSel(rowIdx, i)}
                          onClick={() => {
                            if (dragMultiRef.current) { dragMultiRef.current = false; return; }
                            abrirModal(op.id, fecha);
                          }}
                          className={`px-1.5 py-1.5 align-middle cursor-pointer border-b border-l border-gray-50 transition-colors ${
                            seleccionada
                              ? 'bg-brand-100 ring-2 ring-inset ring-brand-500'
                              : `hover:bg-brand-50/50 ${esFest ? 'bg-purple-50/40' : esFDS ? 'bg-gray-50/70' : ''}`
                          }`}
                        >
                          <div className="min-h-[2.75rem] flex flex-col items-stretch justify-center gap-1">
                            {estado === 'trabaja' ? (
                              listaObras.length > 0 ? (
                                listaObras.map((cod, idx) => (
                                  <span
                                    key={idx}
                                    title={cod}
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded text-center truncate ${getPillObra(cod)}`}
                                  >
                                    {cod}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-gray-300 text-center">—</span>
                              )
                            ) : estado !== 'libre' ? (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded text-center ${ESTADO_PILL[estado] || 'bg-gray-100 text-gray-600'}`}>
                                {ESTADO_LABEL[estado]}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edición individual */}
      {modalCelda && (
        <Modal
          celda={modalCelda}
          obras={obras}
          onClose={() => setModalCelda(null)}
          onSave={guardarCelda}
          onDelete={borrarCelda}
        />
      )}

      {/* Modal asignación masiva (selección por arrastre) */}
      {bulkCells && (
        <BulkModal
          count={bulkCells.length}
          obras={obras}
          onApply={aplicarBulk}
          onClose={cerrarBulk}
        />
      )}
    </div>
  );
}
