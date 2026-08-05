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
      {/* Formulario */}
      <div className="crm-card p-4 mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Código obra"
            value={formData.obraCodigo}
            onChange={e => setFormData({ ...formData, obraCodigo: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg w-40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
          <input
            type="text"
            placeholder="Nombre (opcional)"
            value={formData.nombre}
            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg flex-1 min-w-48 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
          <input
            type="number"
            placeholder="Importe"
            value={formData.importeTotal || ''}
            onChange={e => setFormData({ ...formData, importeTotal: Number(e.target.value) })}
            className="border border-gray-300 px-3 py-2 rounded-lg w-32 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
          {editando ? (
            <>
              <button onClick={guardarEdicion} className="crm-btn">Guardar</button>
              <button onClick={resetForm} className="crm-btn-ghost">Cancelar</button>
            </>
          ) : (
            <button onClick={agregarObra} className="crm-btn">Añadir</button>
          )}
        </div>
        {aviso && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mt-3">
            {aviso}
          </p>
        )}
      </div>

      {/* Lista */}
      <div className="crm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th className="text-right">Importe</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {obras.map(obra => {
                const isActiva = obra.activa !== false;
                return (
                  <tr key={obra.obraCodigo} className={!isActiva ? 'opacity-60' : ''}>
                    <td className="font-mono text-charcoal">
                      {obra.obraCodigo}
                      {!isActiva && (
                        <span className="crm-badge bg-gray-100 text-gray-500 ml-2">Inactiva</span>
                      )}
                    </td>
                    <td className="text-gray-600">{obra.nombre || '—'}</td>
                    <td className="text-right font-semibold text-charcoal">
                      {obra.importeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => iniciarEdicion(obra)} className="text-brand-600 hover:text-brand-700 font-medium mr-4">
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActiva(obra.obraCodigo)}
                        className={isActiva ? 'text-red-500 hover:text-red-700 font-medium' : 'text-brand-600 hover:text-brand-700 font-medium'}
                      >
                        {isActiva ? 'Eliminar' : 'Restaurar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {obras.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-8">No hay obras</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
