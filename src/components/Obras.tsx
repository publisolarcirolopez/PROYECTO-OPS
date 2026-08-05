import { useState } from 'react';
import { Obra, CeldaCalendario } from '../types';
import { useFirestoreState } from '../hooks/useFirestoreState';

export function Obras() {
  const [obras, setObras] = useFirestoreState<Obra[]>('obras', []);
  const [, setCalendario] = useFirestoreState<CeldaCalendario[]>('calendario', []);
  const [editando, setEditando] = useState<string | null>(null);
  const [formData, setFormData] = useState({ obraCodigo: '', nombre: '', importeTotal: 0 });
  const [aviso, setAviso] = useState('');

  const resetForm = () => {
    setFormData({ obraCodigo: '', nombre: '', importeTotal: 0 });
    setEditando(null);
    setAviso('');
  };

  // ¿Existe ya ese código en otra obra? (ignora mayúsculas; excluye la que se edita)
  const codigoDuplicado = (codigo: string, excluir?: string) =>
    obras.some(
      o => o.obraCodigo.toLowerCase() === codigo.toLowerCase() && o.obraCodigo !== excluir
    );

  const agregarObra = () => {
    const codigo = formData.obraCodigo.trim();
    if (!codigo) return;
    if (codigoDuplicado(codigo)) {
      setAviso(`Ya existe una obra con el código "${codigo}".`);
      return;
    }
    const nueva: Obra = {
      obraCodigo: codigo,
      nombre: formData.nombre.trim() || undefined,
      importeTotal: Number(formData.importeTotal) || 0,
      activa: true,
    };
    setObras([...obras, nueva]);
    resetForm();
  };

  const iniciarEdicion = (obra: Obra) => {
    setEditando(obra.obraCodigo);
    setAviso('');
    setFormData({
      obraCodigo: obra.obraCodigo,
      nombre: obra.nombre || '',
      importeTotal: obra.importeTotal,
    });
  };

  const guardarEdicion = () => {
    if (!editando) return;
    const nuevoCodigo = formData.obraCodigo.trim();
    if (!nuevoCodigo) return;
    if (codigoDuplicado(nuevoCodigo, editando)) {
      setAviso(`Ya existe otra obra con el código "${nuevoCodigo}".`);
      return;
    }

    setObras(obras.map(o =>
      o.obraCodigo === editando
        ? {
            obraCodigo: nuevoCodigo,
            nombre: formData.nombre.trim() || undefined,
            importeTotal: Number(formData.importeTotal) || 0,
            activa: o.activa !== false,
          }
        : o
    ));

    // Si cambió el código, propagar el renombrado a las celdas del calendario
    // para no dejar huérfanas las que referencian el código antiguo.
    if (nuevoCodigo !== editando) {
      setCalendario(prev => prev.map(celda => {
        const cods = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);
        if (!cods.includes(editando)) return celda;
        return {
          ...celda,
          obraCodigo: celda.obraCodigo === editando ? nuevoCodigo : celda.obraCodigo,
          obrasCodigos: cods.map(c => (c === editando ? nuevoCodigo : c)),
        };
      }));
    }

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
              className="bg-brand-500 text-white px-4 py-2 rounded hover:bg-brand-600"
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
            className="bg-brand-500 text-white px-4 py-2 rounded hover:bg-brand-600"
          >
            Añadir
          </button>
        )}
      </div>

      {aviso && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm mb-6">
          {aviso}
        </p>
      )}

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
                  className="text-brand-600 hover:underline mr-4"
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
