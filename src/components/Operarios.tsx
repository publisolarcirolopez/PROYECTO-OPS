import { useState } from 'react';
import { Operario } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function Operarios() {
  const [operarios, setOperarios] = useLocalStorage<Operario[]>('operarios', []);
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
      <h2 className="text-2xl font-bold mb-6">Operarios</h2>

      {/* Formulario añadir */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del operario"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregarOperario()}
          className="border px-3 py-2 rounded flex-1"
        />
        <button
          onClick={agregarOperario}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Añadir
        </button>
      </div>

      {/* Lista */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">Nombre</th>
            <th className="border px-3 py-2 text-center">Estado</th>
            <th className="border px-3 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {operarios.map(op => (
            <tr key={op.id} className={!op.activo ? 'bg-gray-50 text-gray-400' : ''}>
              <td className="border px-3 py-2">{op.nombre}</td>
              <td className="border px-3 py-2 text-center">
                <span className={op.activo ? 'text-green-600' : 'text-red-600'}>
                  {op.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="border px-3 py-2 text-center">
                <button
                  onClick={() => toggleActivo(op.id)}
                  className="text-yellow-600 hover:underline mr-3"
                >
                  {op.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminarOperario(op.id)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {operarios.length === 0 && (
            <tr>
              <td colSpan={3} className="border px-3 py-4 text-center text-gray-400">
                No hay operarios
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
