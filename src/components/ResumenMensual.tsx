import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Operario, Obra, CeldaCalendario } from '../types';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function ResumenMensual() {
  const [operarios] = useLocalStorage<Operario[]>('operarios', []);
  const [obras] = useLocalStorage<Obra[]>('obras', []);
  const [calendario] = useLocalStorage<CeldaCalendario[]>('calendario', []);

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  // Filtrar celdas del mes seleccionado
  const celdasDelMes = useMemo(() => {
    return calendario.filter(celda => {
      const fecha = new Date(celda.fecha + 'T00:00:00');
      return fecha.getFullYear() === anio && fecha.getMonth() === mes;
    });
  }, [calendario, anio, mes]);

  // Operarios activos
  const operariosActivos = useMemo(() => {
    return operarios.filter(o => o.activo);
  }, [operarios]);

  // Obtener participaciones válidas por obra (fraccionadas si hay múltiples)
  const participacionesPorObra = useMemo(() => {
    const mapa = new Map<string, { celda: CeldaCalendario, fraccion: number }[]>();
    
    celdasDelMes.forEach(celda => {
      if (celda.estado !== 'trabaja') return;
      
      const listaObras = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);
      if (listaObras.length === 0) return;
      
      const operarioActivo = operarios.some(o => o.id === celda.operarioId && o.activo);
      if (!operarioActivo) return;

      // Filtramos obras que existan en el sistema
      const obrasValidas = listaObras.filter(codigo => obras.some(o => o.obraCodigo === codigo));
      if (obrasValidas.length === 0) return;
      
      const fraccion = 1 / obrasValidas.length;
      
      obrasValidas.forEach(codigo => {
        if (!mapa.has(codigo)) {
          mapa.set(codigo, []);
        }
        mapa.get(codigo)!.push({ celda, fraccion });
      });
    });
    
    return mapa;
  }, [celdasDelMes, obras, operarios]);

  // Calcular valor por participación para cada obra
  const datosObras = useMemo(() => {
    return obras
      .filter(obra => {
        const celdas = participacionesPorObra.get(obra.obraCodigo) || [];
        return celdas.length > 0;
      })
      .map(obra => {
        const participaciones = participacionesPorObra.get(obra.obraCodigo) || [];
        const numParticipaciones = participaciones.reduce((sum, p) => sum + p.fraccion, 0);
        const valorPorParticipacion = numParticipaciones > 0 
          ? obra.importeTotal / numParticipaciones 
          : 0;
        
        return {
          obraCodigo: obra.obraCodigo,
          nombre: obra.nombre || '-',
          importeTotal: obra.importeTotal,
          numParticipaciones,
          valorPorParticipacion
        };
      });
  }, [obras, participacionesPorObra]);

  // Resumen por operario
  const datosOperarios = useMemo(() => {
    return operariosActivos.map(operario => {
      let participaciones = 0;
      let facturacion = 0;
      
      datosObras.forEach(datosObra => {
        if (datosObra.numParticipaciones === 0) return;
        
        const participacionesObra = participacionesPorObra.get(datosObra.obraCodigo) || [];
        const participacionesOperario = participacionesObra.filter(p => p.celda.operarioId === operario.id);
        
        if (participacionesOperario.length > 0) {
          const participacionesFraccionadas = participacionesOperario.reduce((sum, p) => sum + p.fraccion, 0);
          participaciones += participacionesFraccionadas;
          facturacion += participacionesFraccionadas * datosObra.valorPorParticipacion;
        }
      });
      
      return {
        id: operario.id,
        nombre: operario.nombre,
        participaciones,
        facturacion
      };
    });
  }, [operariosActivos, datosObras, participacionesPorObra]);

  // Totales del mes
  const resumenTotales = useMemo(() => {
    let facturacionTotal = 0;
    let participacionesTotales = 0;
    let obrasActivas = 0;

    datosObras.forEach(obra => {
      if (obra.numParticipaciones > 0) {
        obrasActivas++;
      }
    });

    datosOperarios.forEach(op => {
      participacionesTotales += op.participaciones;
      facturacionTotal += op.facturacion;
    });

    return { facturacionTotal, participacionesTotales, obrasActivas };
  }, [datosObras, datosOperarios]);

  // Ranking de instaladores
  const rankingInstaladores = useMemo(() => {
    return [...datosOperarios]
      .filter(op => op.participaciones > 0)
      .sort((a, b) => b.facturacion - a.facturacion);
  }, [datosOperarios]);

  const [ordenEquipos, setOrdenEquipos] = useState<'eficiencia' | 'frecuencia'>('eficiencia');

  // Ranking por Equipos
  const rankingEquipos = useMemo(() => {
    const eventos = new Map<string, { operariosIds: string[], obraCodigo: string, fecha: string, fraccionTotal: number }>();

    celdasDelMes.forEach(celda => {
      if (celda.estado !== 'trabaja') return;
      const operarioActivo = operarios.some(o => o.id === celda.operarioId && o.activo);
      if (!operarioActivo) return;

      const listaObras = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);
      const obrasValidas = listaObras.filter(codigo => obras.some(o => o.obraCodigo === codigo));
      if (obrasValidas.length === 0) return;
      
      const fraccion = 1 / obrasValidas.length;
      
      obrasValidas.forEach(codigo => {
        const key = `${celda.fecha}_${codigo}`;
        if (!eventos.has(key)) {
          eventos.set(key, { operariosIds: [], obraCodigo: codigo, fecha: celda.fecha, fraccionTotal: 0 });
        }
        const evento = eventos.get(key)!;
        if (!evento.operariosIds.includes(celda.operarioId)) {
          evento.operariosIds.push(celda.operarioId);
          evento.fraccionTotal += fraccion;
        }
      });
    });

    interface EquipoData {
      firma: string;
      diasSet: Set<string>;
      obrasSet: Set<string>;
      facturacion: number;
      equiposDia: number;
    }
    const equiposMap = new Map<string, EquipoData>();

    const valorObraMap = new Map<string, number>();
    datosObras.forEach(d => valorObraMap.set(d.obraCodigo, d.valorPorParticipacion));

    Array.from(eventos.values()).forEach(evento => {
      const firma = [...evento.operariosIds].sort().join(',');
      
      if (!equiposMap.has(firma)) {
        equiposMap.set(firma, {
          firma,
          diasSet: new Set(),
          obrasSet: new Set(),
          facturacion: 0,
          equiposDia: 0
        });
      }
      
      const eq = equiposMap.get(firma)!;
      eq.diasSet.add(evento.fecha);
      eq.obrasSet.add(evento.obraCodigo);
      
      const valorPart = valorObraMap.get(evento.obraCodigo) || 0;
      eq.facturacion += evento.fraccionTotal * valorPart;
      
      eq.equiposDia += evento.operariosIds.length / 3;
    });

    return Array.from(equiposMap.values())
      .filter(eq => eq.firma.length > 0)
      .map(eq => {
        const integrantesNombres = eq.firma.split(',').map(id => {
          const op = operarios.find(o => o.id === id);
          return op ? op.nombre : 'Desconocido';
        }).join(', ');

        const eurPorEquipoDia = eq.equiposDia > 0 ? eq.facturacion / eq.equiposDia : 0;

        return {
          firma: eq.firma,
          integrantesNombres,
          diasJuntos: eq.diasSet.size,
          obrasCompartidas: eq.obrasSet.size,
          facturacion: eq.facturacion,
          equiposDia: eq.equiposDia,
          eurPorEquipoDia
        };
      })
      .sort((a, b) => {
        if (ordenEquipos === 'eficiencia') {
          if (Math.abs(b.eurPorEquipoDia - a.eurPorEquipoDia) > 0.01) {
            return b.eurPorEquipoDia - a.eurPorEquipoDia;
          }
          return b.facturacion - a.facturacion;
        } else {
          if (b.diasJuntos !== a.diasJuntos) {
            return b.diasJuntos - a.diasJuntos;
          }
          return b.eurPorEquipoDia - a.eurPorEquipoDia;
        }
      });
  }, [celdasDelMes, operarios, obras, datosObras, ordenEquipos]);

  // Alertas de coherencia de datos
  const alertasDatos = useMemo(() => {
    const advertencias: { id: string; tipo: 'error' | 'warning'; mensaje: string }[] = [];
    let idCounter = 0;

    obras.forEach(obra => {
      if (obra.activa === false) return; // Ignoramos alertas en obras inactivas
      if (!obra.importeTotal || isNaN(obra.importeTotal) || obra.importeTotal <= 0) {
        advertencias.push({
          id: `obra-importe-${idCounter++}`,
          tipo: 'error',
          mensaje: `Obra sin importe válido: [${obra.obraCodigo}] ${obra.nombre || ''}`
        });
      }
    });

    celdasDelMes.forEach(celda => {
      const operario = operarios.find(o => o.id === celda.operarioId);
      const nombreOp = operario ? operario.nombre : 'Operario eliminado';
      const fecha = celda.fecha;
      const listaObras = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);

      if (celda.estado === 'trabaja' && listaObras.length === 0) {
        advertencias.push({
          id: `celda-sinobra-${idCounter++}`,
          tipo: 'error',
          mensaje: `Celda "trabaja" sin obra - Operario: ${nombreOp} - Fecha: ${fecha}`
        });
      }

      listaObras.forEach(codigo => {
        const existe = obras.some(o => o.obraCodigo === codigo);
        if (!existe) {
          advertencias.push({
            id: `celda-obrainvalida-${idCounter++}`,
            tipo: 'error',
            mensaje: `Obra inexistente ("${codigo}") - Operario: ${nombreOp} - Fecha: ${fecha}`
          });
        }
      });

      if (celda.estado !== 'trabaja' && listaObras.length > 0) {
        advertencias.push({
          id: `celda-incoherente-${idCounter++}`,
          tipo: 'warning',
          mensaje: `Obras asignadas en estado "${celda.estado}" - Operario: ${nombreOp} - Fecha: ${fecha}`
        });
      }

      if (operario && !operario.activo && celda.estado !== 'libre') {
        advertencias.push({
          id: `celda-inactivo-${idCounter++}`,
          tipo: 'warning',
          mensaje: `Imputación de inactivo - Operario: ${nombreOp} - Fecha: ${fecha} - Estado: ${celda.estado}`
        });
      }
    });

    return advertencias;
  }, [celdasDelMes, obras, operarios]);

  // Años disponibles (año actual ± 2)
  const anios = [anio - 2, anio - 1, anio, anio + 1, anio + 2];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Resumen Mensual</h2>
      
      {/* Selectores */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="border rounded px-3 py-2 text-gray-700"
            >
              {anios.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border rounded px-3 py-2 text-gray-700"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alertas de Datos */}
      {alertasDatos.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg shadow mb-6">
          <div className="p-4 border-b border-orange-200">
            <h3 className="text-orange-800 font-bold flex items-center gap-2">
              <span>⚠️</span> Alertas de datos ({alertasDatos.length})
            </h3>
          </div>
          <div className="p-4 max-h-48 overflow-y-auto">
            <ul className="space-y-2">
              {alertasDatos.map(alerta => (
                <li key={alerta.id} className="text-sm text-orange-800 flex gap-2">
                  <span className="font-bold shrink-0">{alerta.tipo === 'error' ? '🔴 Error:' : '🟠 Aviso:'}</span>
                  <span>{alerta.mensaje}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Facturación Total</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {resumenTotales.facturacionTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Participaciones Totales</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {resumenTotales.participacionesTotales}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Obras Activas</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {resumenTotales.obrasActivas}
          </p>
        </div>
      </div>

      {/* Ranking de Instaladores */}
      <div className="bg-white rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">
          Ranking de Instaladores individuales
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 w-16">Pos</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Facturación (€)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Participaciones</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Media/Part. (€)</th>
              </tr>
            </thead>
            <tbody>
              {rankingInstaladores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay datos en el mes seleccionado
                  </td>
                </tr>
              ) : (
                rankingInstaladores.map((op, index) => {
                  const media = op.participaciones > 0 ? op.facturacion / op.participaciones : 0;
                  return (
                    <tr key={op.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-center font-bold text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{op.nombre}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-bold">
                        {op.facturacion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{op.participaciones}</td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {media.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking por Equipos */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b gap-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Ranking por Equipos
          </h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setOrdenEquipos('eficiencia')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                ordenEquipos === 'eficiencia' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por Eficiencia
            </button>
            <button
              onClick={() => setOrdenEquipos('frecuencia')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                ordenEquipos === 'frecuencia' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por Frecuencia
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 w-16">Pos</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Integrantes</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Días Juntos</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Obras Comp.</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Producción Total (€)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Equipos-día</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Eficiencia (€/día)</th>
              </tr>
            </thead>
            <tbody>
              {rankingEquipos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay equipos detectados en el mes
                  </td>
                </tr>
              ) : (
                rankingEquipos.map((eq, index) => (
                  <tr key={eq.firma} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-center font-bold text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium text-sm">
                      {eq.integrantesNombres}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {eq.diasJuntos}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {eq.obrasCompartidas}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-bold">
                      {eq.facturacion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {eq.equiposDia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800 font-bold">
                      {eq.eurPorEquipoDia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen por Operario */}
      <div className="bg-white rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">
          Resumen por Operario
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Operario</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Participaciones</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Facturación (€)</th>
              </tr>
            </thead>
            <tbody>
              {datosOperarios.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No hay operarios activos
                  </td>
                </tr>
              ) : (
                datosOperarios.map(op => (
                  <tr key={op.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{op.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{op.participaciones}</td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium">
                      {op.facturacion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen por Obra */}
      <div className="bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">
          Resumen por Obra
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Importe Total (€)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Participaciones</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Valor/Part. (€)</th>
              </tr>
            </thead>
            <tbody>
              {datosObras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay obras registradas
                  </td>
                </tr>
              ) : (
                datosObras.map(obra => (
                  <tr key={obra.obraCodigo} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 font-medium">{obra.obraCodigo}</td>
                    <td className="px-4 py-3 text-gray-600">{obra.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {obra.importeTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{obra.numParticipaciones}</td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium">
                      {obra.valorPorParticipacion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
