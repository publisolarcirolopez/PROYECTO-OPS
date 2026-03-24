import { useState } from 'react';
import { Obra } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function Obras() {
  const [obras, setObras] = useLocalStorage<Obra[]>('obras', []);
  const [editando, setEditando] = useState<string | null>(null);
  const [formData, setFormData] = useState({ obraCodigo: '', nombre: '', importeTotal: 0 });

  const resetForm = () => {
    setFormData({ obraCodigo: '', nombre: '', importeTotal: 0 });
    setEditando(null);
  };

  const agregarObra = () => {
    if (!formData.obraCodigo.trim()) return;
    const nueva: Obra = {
      obraCodigo: formData.obraCodigo.trim(),
      nombre: formData.nombre.trim() || undefined,
      importeTotal: Number(formData.importeTotal) || 0,
      activa: true,
    };
    setObras([...obras, nueva]);
    resetForm();
  };

  const iniciarEdicion = (obra: Obra) => {
    setEditando(obra.obraCodigo);
    setFormData({
      obraCodigo: obra.obraCodigo,
      nombre: obra.nombre || '',
      importeTotal: obra.importeTotal,
    });
  };

  const guardarEdicion = () => {
    if (!editando) return;
    setObras(obras.map(o => 
      o.obraCodigo === editando 
        ? { 
            obraCodigo: formData.obraCodigo.trim(), 
            nombre: formData.nombre.trim() || undefined, 
            importeTotal: Number(formData.importeTotal) || 0,
            activa: o.activa !== false
          }
        : o
    ));
    resetForm();
  };

  const toggleActiva = (codigo: string) => {
    if (window.confirm("¿Confirmas el cambio de estado de esta obra?")) {
      setObras(obras.map(o => 
        o.obraCodigo === codigo
          ? { ...o, activa: o.activa === false ? true : false }
          : o
      ));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Obras</h2>

      {/* Formulario */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Código obra"
          value={formData.obraCodigo}
          onChange={e => setFormData({ ...formData, obraCodigo: e.target.value })}
          className="border px-3 py-2 rounded w-40"
        />
        <input
          type="text"
          placeholder="Nombre (opcional)"
          value={formData.nombre}
          onChange={e => setFormData({ ...formData, nombre: e.target.value })}
          className="border px-3 py-2 rounded flex-1 min-w-48"
        />
        <input
          type="number"
          placeholder="Importe"
          value={formData.importeTotal || ''}
          onChange={e => setFormData({ ...formData, importeTotal: Number(e.target.value) })}
          className="border px-3 py-2 rounded w-32"
        />
        {editando ? (
          <>
            <button
              onClick={guardarEdicion}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Guardar
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={agregarObra}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Añadir
          </button>
        )}
      </div>

      {/* Lista */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">Código</th>
            <th className="border px-3 py-2 text-left">Nombre</th>
            <th className="border px-3 py-2 text-right">Importe</th>
            <th className="border px-3 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {obras.map(obra => {
            const isActiva = obra.activa !== false;
            return (
            <tr key={obra.obraCodigo} className={!isActiva ? 'opacity-50 bg-gray-50' : ''}>
              <td className="border px-3 py-2 font-mono">
                {obra.obraCodigo}
                {!isActiva && <span className="ml-2 text-xs text-red-500 font-bold">(Inactiva)</span>}
              </td>
              <td className="border px-3 py-2">{obra.nombre || '-'}</td>
              <td className="border px-3 py-2 text-right">
                {obra.importeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </td>
              <td className="border px-3 py-2 text-center">
                <button
                  onClick={() => iniciarEdicion(obra)}
                  className="text-blue-600 hover:underline mr-4"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActiva(obra.obraCodigo)}
                  className={isActiva ? "text-red-600 hover:underline" : "text-green-600 hover:underline"}
                >
                  {isActiva ? 'Eliminar' : 'Restaurar'}
                </button>
              </td>
            </tr>
          )})}
          {obras.length === 0 && (
            <tr>
              <td colSpan={4} className="border px-3 py-4 text-center text-gray-400">
                No hay obras
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
