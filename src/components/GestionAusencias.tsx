import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Operario, Festivo, Ausencia } from '../types';

const TIPOS_AUSENCIA: Ausencia['tipo'][] = ['vacaciones', 'baja', 'permiso'];

const LABELS_TIPO: Record<Ausencia['tipo'], string> = {
  vacaciones: 'Vacaciones',
  baja: 'Baja',
  permiso: 'Permiso',
};

const COLORS_TIPO: Record<Ausencia['tipo'], string> = {
  vacaciones: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
  permiso: 'bg-orange-100 text-orange-800',
};

function generarId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function GestionAusencias() {
  const [operarios] = useLocalStorage<Operario[]>('operarios', []);
  const [festivos, setFestivos] = useLocalStorage<Festivo[]>('festivos', []);
  const [ausencias, setAusencias] = useLocalStorage<Ausencia[]>('ausencias', []);

  const [tab, setTab] = useState<'festivos' | 'ausencias'>('festivos');

  // --- Estado formulario festivos ---
  const [fFecha, setFFecha] = useState('');
  const [fNombre, setFNombre] = useState('');

  // --- Estado formulario ausencias ---
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aOperarioId, setAOperarioId] = useState('');
  const [aTipo, setATipo] = useState<Ausencia['tipo']>('vacaciones');
  const [aFechaInicio, setAFechaInicio] = useState('');
  const [aFechaFin, setAFechaFin] = useState('');
  const [aNota, setANota] = useState('');

  // --- Festivos handlers ---
  const agregarFestivo = () => {
    if (!fFecha) return;
    if (festivos.some(f => f.fecha === fFecha)) return; // sin duplicados
    setFestivos(prev => [
      ...prev,
      { id: generarId(), fecha: fFecha, nombre: fNombre.trim() || undefined },
    ]);
    setFFecha('');
    setFNombre('');
  };

  const borrarFestivo = (id: string) => {
    setFestivos(prev => prev.filter(f => f.id !== id));
  };

  // --- Ausencias handlers ---
  const resetForm = () => {
    setEditandoId(null);
    setAOperarioId('');
    setATipo('vacaciones');
    setAFechaInicio('');
    setAFechaFin('');
    setANota('');
  };

  const editarAusencia = (ausencia: Ausencia) => {
    setEditandoId(ausencia.id);
    setAOperarioId(ausencia.operarioId);
    setATipo(ausencia.tipo);
    setAFechaInicio(ausencia.fechaInicio);
    setAFechaFin(ausencia.fechaFin);
    setANota(ausencia.nota || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardarAusencia = () => {
    if (!aOperarioId || !aFechaInicio || !aFechaFin) return;
    if (aFechaFin < aFechaInicio) return;

    const nueva: Ausencia = {
      id: editandoId || generarId(),
      operarioId: aOperarioId,
      tipo: aTipo,
      fechaInicio: aFechaInicio,
      fechaFin: aFechaFin,
      nota: aNota.trim() || undefined,
    };

    if (editandoId) {
      setAusencias(prev => prev.map(a => (a.id === editandoId ? nueva : a)));
    } else {
      setAusencias(prev => [...prev, nueva]);
    }
    resetForm();
  };

  const borrarAusencia = (id: string) => {
    setAusencias(prev => prev.filter(a => a.id !== id));
    if (editandoId === id) resetForm();
  };

  const festivosOrdenados = useMemo(
    () => [...festivos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [festivos]
  );

  const ausenciasConNombre = useMemo(
    () =>
      [...ausencias]
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
        .map(a => ({
          ...a,
          nombreOperario: operarios.find(o => o.id === a.operarioId)?.nombre || 'Desconocido',
        })),
    [ausencias, operarios]
  );

  const operariosActivos = useMemo(() => operarios.filter(o => o.activo), [operarios]);

  const formularioAusenciaValido = aOperarioId && aFechaInicio && aFechaFin && aFechaFin >= aFechaInicio;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Ausencias y Festivos</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setTab('festivos')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'festivos'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Festivos ({festivos.length})
        </button>
        <button
          onClick={() => setTab('ausencias')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'ausencias'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Ausencias ({ausencias.length})
        </button>
      </div>

      {/* ===== TAB FESTIVOS ===== */}
      {tab === 'festivos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Añadir festivo</h3>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fFecha}
                  onChange={e => setFFecha(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={fNombre}
                  onChange={e => setFNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarFestivo()}
                  className="border rounded px-3 py-2 w-56"
                  placeholder="Ej: Día de la Hispanidad"
                />
              </div>
              <button
                onClick={agregarFestivo}
                disabled={!fFecha}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
            {fFecha && festivos.some(f => f.fecha === fFecha) && (
              <p className="text-amber-600 text-sm mt-2">Ya existe un festivo en esa fecha.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700">
                Festivos registrados ({festivosOrdenados.length})
              </h3>
            </div>
            {festivosOrdenados.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay festivos registrados</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {festivosOrdenados.map(f => (
                    <tr key={f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{f.fecha}</td>
                      <td className="px-4 py-3 text-gray-600">{f.nombre || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => borrarFestivo(f.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded"
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB AUSENCIAS ===== */}
      {tab === 'ausencias' && (
        <div className="space-y-6">
          {/* Formulario */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-4">
              {editandoId ? 'Editar ausencia' : 'Nueva ausencia por rango de fechas'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Operario</label>
                <select
                  value={aOperarioId}
                  onChange={e => setAOperarioId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  {operariosActivos.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={aTipo}
                  onChange={e => setATipo(e.target.value as Ausencia['tipo'])}
                  className="w-full border rounded px-3 py-2"
                >
                  {TIPOS_AUSENCIA.map(t => (
                    <option key={t} value={t}>
                      {LABELS_TIPO[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={aNota}
                  onChange={e => setANota(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Observaciones..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={aFechaInicio}
                  onChange={e => setAFechaInicio(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={aFechaFin}
                  min={aFechaInicio || undefined}
                  onChange={e => setAFechaFin(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            {aFechaInicio && aFechaFin && aFechaFin < aFechaInicio && (
              <p className="text-red-600 text-sm mt-2">La fecha fin debe ser igual o posterior a la fecha inicio.</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={guardarAusencia}
                disabled={!formularioAusenciaValido}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {editandoId ? 'Guardar cambios' : 'Crear ausencia'}
              </button>
              {editandoId && (
                <button
                  onClick={resetForm}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700">
                Ausencias registradas ({ausencias.length})
              </h3>
            </div>
            {ausenciasConNombre.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay ausencias registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Operario</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Inicio</th>
                      <th className="px-4 py-3 text-left">Fin</th>
                      <th className="px-4 py-3 text-left">Nota</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {ausenciasConNombre.map(a => (
                      <tr
                        key={a.id}
                        className={`border-t hover:bg-gray-50 transition-colors ${
                          editandoId === a.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{a.nombreOperario}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${COLORS_TIPO[a.tipo]}`}
                          >
                            {LABELS_TIPO[a.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{a.fechaInicio}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{a.fechaFin}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">
                          {a.nota || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => editarAusencia(a)}
                              className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => borrarAusencia(a.id)}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
