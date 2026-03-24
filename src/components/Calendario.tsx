import { useState, useMemo } from 'react';
import { Operario, Obra, CeldaCalendario, EstadoCelda, Festivo } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { esFestivo, esFinDeSemana } from '../utils/capacidad';

const ESTADOS: EstadoCelda[] = ['trabaja', 'vacaciones', 'baja', 'festivo', 'permiso', 'libre'];

const COLORES: Record<EstadoCelda, string> = {
  trabaja: 'bg-green-100 hover:bg-green-200',
  vacaciones: 'bg-yellow-100 hover:bg-yellow-200',
  baja: 'bg-red-100 hover:bg-red-200',
  festivo: 'bg-purple-100 hover:bg-purple-200',
  permiso: 'bg-orange-100 hover:bg-orange-200',
  libre: 'bg-gray-50 hover:bg-gray-100',
};

const PALETA_OBRAS = [
  'bg-blue-100 hover:bg-blue-200',
  'bg-emerald-100 hover:bg-emerald-200',
  'bg-violet-100 hover:bg-violet-200',
  'bg-amber-100 hover:bg-amber-200',
  'bg-pink-100 hover:bg-pink-200',
  'bg-cyan-100 hover:bg-cyan-200',
  'bg-rose-100 hover:bg-rose-200',
  'bg-lime-100 hover:bg-lime-200',
  'bg-fuchsia-100 hover:bg-fuchsia-200',
  'bg-sky-100 hover:bg-sky-200',
  'bg-orange-100 hover:bg-orange-200',
  'bg-teal-100 hover:bg-teal-200',
  'bg-indigo-100 hover:bg-indigo-200',
];

function getColorObra(codigo: string) {
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETA_OBRAS[Math.abs(hash) % PALETA_OBRAS.length];
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
  return d.toISOString().split('T')[0];
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
              <button onClick={handlePaste} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200" type="button">Pegar</button>
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
                      <div key={codigo} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                        <span className="font-mono">{codigo}</span>
                        {ob?.nombre && <span className="opacity-75 truncate max-w-[100px]">{ob.nombre}</span>}
                        <button 
                          onClick={() => quitarObra(codigo)} 
                          className="ml-1 text-blue-500 hover:text-blue-900 font-bold"
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
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Guardar
          </button>
          {celda.estado && (
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

export function Calendario() {
  const [operarios] = useLocalStorage<Operario[]>('operarios', []);
  const [obras] = useLocalStorage<Obra[]>('obras', []);
  const [celdas, setCeldas] = useLocalStorage<CeldaCalendario[]>('calendario', []);
  const [festivos] = useLocalStorage<Festivo[]>('festivos', []);

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

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Calendario Operativo</h2>

      {/* Controles */}
      <div className="flex gap-4 mb-6 items-center flex-wrap">
        <select
          value={year}
          onChange={e => { setYear(Number(e.target.value)); setSemanaIndex(0); }}
          className="border px-3 py-2 rounded"
        >
          {[year - 1, year, year + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={e => { setMonth(Number(e.target.value)); setSemanaIndex(0); }}
          className="border px-3 py-2 rounded"
        >
          {meses.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSemanaIndex(Math.max(0, semanaIndex - 1))}
            disabled={semanaIndex === 0}
            className="px-3 py-2 border rounded disabled:opacity-50"
          >
            ◀
          </button>
          <span className="px-3">Semana {semanaIndex + 1} de {semanas.length}</span>
          <button
            onClick={() => setSemanaIndex(Math.min(semanas.length - 1, semanaIndex + 1))}
            disabled={semanaIndex >= semanas.length - 1}
            className="px-3 py-2 border rounded disabled:opacity-50"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left sticky left-0 bg-gray-100">Operario</th>
              {diasSemana.map((d, i) => {
                const fechaStr = formatFecha(d);
                const esFDS = esFinDeSemana(fechaStr);
                const esFest = esFestivo(fechaStr, festivos);
                const festNombre = festivos.find(f => f.fecha === fechaStr)?.nombre;
                return (
                  <th
                    key={i}
                    className={`border px-2 py-2 text-center min-w-[100px] ${
                      esFDS ? 'bg-gray-200 text-gray-500' : esFest ? 'bg-purple-100' : ''
                    }`}
                  >
                    <div>{DIAS[i]}</div>
                    <div className="text-sm text-gray-500">{d.getDate()}</div>
                    {esFest && (
                      <div
                        className="text-[9px] font-semibold text-purple-700 bg-purple-200 rounded px-1 mt-0.5 truncate max-w-[90px] mx-auto"
                        title={festNombre || 'Festivo'}
                      >
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
                <td colSpan={8} className="border px-3 py-8 text-center text-gray-400">
                  No hay operarios activos
                </td>
              </tr>
            ) : (
              operariosActivos.map(op => (
                <tr key={op.id}>
                  <td className="border px-3 py-2 font-medium sticky left-0 bg-white">{op.nombre}</td>
                  {diasSemana.map((d, i) => {
                    const fecha = formatFecha(d);
                    const celda = getCelda(op.id, fecha);
                    const estado = celda?.estado || 'libre';
                    const esFDS = esFinDeSemana(fecha);
                    const esFest = esFestivo(fecha, festivos);

                    const listaObras = celda?.obrasCodigos || (celda?.obraCodigo ? [celda.obraCodigo] : []);
                    let bgClass = COLORES[estado];
                    if (estado === 'trabaja' && listaObras.length > 0) {
                      bgClass = getColorObra(listaObras[0]);
                    }
                    // Fin de semana sin datos registrados: fondo gris suave
                    if (esFDS && estado === 'libre') {
                      bgClass = 'bg-gray-100 hover:bg-gray-200';
                    }

                    return (
                      <td
                        key={i}
                        onClick={() => abrirModal(op.id, fecha)}
                        className={`border px-2 py-3 text-center cursor-pointer ${bgClass} align-top`}
                      >
                        {esFDS && estado === 'libre' ? (
                          <div className="text-[10px] text-gray-400">{DIAS[i] === 'Sáb' ? 'Sáb' : 'Dom'}</div>
                        ) : (
                          <>
                            <div className="text-xs capitalize mb-1">{estado}</div>
                            {esFest && estado === 'libre' && (
                              <div className="text-[9px] text-purple-600 font-semibold">Festivo</div>
                            )}
                            {listaObras.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-1">
                                {listaObras.map((codigoObra, idx) => (
                                  <div key={idx} className="text-[10px] font-mono bg-white/50 px-1 rounded truncate max-w-[60px]" title={codigoObra}>
                                    {codigoObra}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalCelda && (
        <Modal
          celda={modalCelda}
          obras={obras}
          onClose={() => setModalCelda(null)}
          onSave={guardarCelda}
          onDelete={borrarCelda}
        />
      )}
    </div>
  );
}
