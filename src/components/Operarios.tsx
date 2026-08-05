import { useState } from 'react';
import { Operario } from '../types';
import { useFirestoreState } from '../hooks/useFirestoreState';

export function Operarios() {
  const [operarios, setOperarios] = useFirestoreState<Operario[]>('operarios', []);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const agregarOperario = () => {
    if (!nuevoNombre.trim()) return;
    const nuevo: Operario = {
      id: crypto.randomUUID(),
      nombre: nuevoNombre.trim(),
      activo: true,
    };
    setOperarios([...operarios, nuevo]);
    setNuevoNombre('');
  };

  const toggleActivo = (id: string) => {
    setOperarios(operarios.map(o => 
      o.id === id ? { ...o, activo: !o.activo } : o
    ));
  };

  const eliminarOperario = (id: string) => {
    if (confirm('¿Eliminar este operario?')) {
      setOperarios(operarios.filter(o => o.id !== id));
    }
  };

  return (
    <div className="p-6">
      {/* Formulario añadir */}
      <div className="flex gap-2 mb-6 max-w-xl">
        <input
          type="text"
          placeholder="Nombre del operario"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregarOperario()}
          className="border border-gray-300 px-3 py-2 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
        />
        <button onClick={agregarOperario} className="crm-btn">Añadir</button>
      </div>

      {/* Lista */}
      <div className="crm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {operarios.map(op => (
                <tr key={op.id}>
                  <td className="font-medium text-charcoal">{op.nombre}</td>
                  <td className="text-center">
                    <span className={`crm-badge ${op.activo ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${op.activo ? 'bg-brand-500' : 'bg-gray-400'}`} />
                      {op.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => toggleActivo(op.id)} className="text-gray-500 hover:text-charcoal font-medium mr-4">
                      {op.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => eliminarOperario(op.id)} className="text-red-500 hover:text-red-700 font-medium">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {operarios.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-400 py-8">No hay operarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
