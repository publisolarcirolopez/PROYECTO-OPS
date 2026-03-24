import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Operario, Obra, CeldaCalendario, Festivo, Ausencia } from '../types';
import { calcularCapacidadMes } from '../utils/capacidad';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine
} from 'recharts';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function Dashboard() {
  const [operarios] = useLocalStorage<Operario[]>('operarios', []);
  const [obras] = useLocalStorage<Obra[]>('obras', []);
  const [calendario] = useLocalStorage<CeldaCalendario[]>('calendario', []);
  const [festivos] = useLocalStorage<Festivo[]>('festivos', []);
  const [ausencias] = useLocalStorage<Ausencia[]>('ausencias', []);

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  // 1. Filtrar celdas del mes
  const celdasDelMes = useMemo(() => {
    return calendario.filter(celda => {
      const fecha = new Date(celda.fecha + 'T00:00:00');
      return fecha.getFullYear() === anio && fecha.getMonth() === mes;
    });
  }, [calendario, anio, mes]);

  const operariosActivos = useMemo(() => operarios.filter(o => o.activo), [operarios]);

  // Capacidad laboral real del mes (días laborables, festivos, ausencias)
  const capacidad = useMemo(() => calcularCapacidadMes({
    anio, mes,
    operariosActivos,
    festivos,
    ausencias,
    hoy,
  }), [anio, mes, operariosActivos, festivos, ausencias]);

  // Participaciones y valor de obras (Lógica compartida con ResumenMensual)
  const participacionesPorObra = useMemo(() => {
    const mapa = new Map<string, { celda: CeldaCalendario, fraccion: number }[]>();
    celdasDelMes.forEach(celda => {
      if (celda.estado !== 'trabaja') return;
      const lsOb = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);
      if (lsOb.length === 0) return;
      const val = lsOb.filter(codigo => obras.some(o => o.obraCodigo === codigo));
      if (val.length === 0) return;
      const fraccion = 1 / val.length;
      val.forEach(codigo => {
        if (!mapa.has(codigo)) mapa.set(codigo, []);
        mapa.get(codigo)!.push({ celda, fraccion });
      });
    });
    return mapa;
  }, [celdasDelMes, obras]);

  const datosObras = useMemo(() => {
    return obras
      .filter(obra => participacionesPorObra.has(obra.obraCodigo))
      .map(obra => {
        const parts = participacionesPorObra.get(obra.obraCodigo) || [];
        const numPart = parts.reduce((sum, p) => sum + p.fraccion, 0);
        return {
          obraCodigo: obra.obraCodigo,
          importeTotal: obra.importeTotal,
          numParticipaciones: numPart,
          valorPorParticipacion: numPart > 0 ? obra.importeTotal / numPart : 0
        };
      });
  }, [obras, participacionesPorObra]);

  const diasDelMesUnicos = useMemo(() => {
    const s = new Set<string>();
    celdasDelMes.forEach(c => s.add(c.fecha));
    return Array.from(s).sort();
  }, [celdasDelMes]);

  // KPIs Principales
  const kpis = useMemo(() => {
    let produccionTotal = 0;
    datosObras.forEach(o => {
      if (o.numParticipaciones > 0) produccionTotal += o.importeTotal;
    });
    let equiposDia = 0;
    const prodDiariaMap = new Map<string, number>();

    celdasDelMes.forEach(c => {
      if (c.estado === 'trabaja') {
        equiposDia += 1 / 3; // Estimación simple (1 op = 1/3 equipo-dia si equipos son de ~3)
        // O más exacto, sumamos las fracciones de obras de cada día para la producción diaria
      }
    });

    // Producción diaria exacta
    diasDelMesUnicos.forEach(d => prodDiariaMap.set(d, 0));
    const valorObraMap = new Map<string, number>();
    datosObras.forEach(d => valorObraMap.set(d.obraCodigo, d.valorPorParticipacion));

    celdasDelMes.forEach(celda => {
      if (celda.estado !== 'trabaja') return;
      const lsOb = celda.obrasCodigos || (celda.obraCodigo ? [celda.obraCodigo] : []);
      const val = lsOb.filter(codigo => valorObraMap.has(codigo));
      const fraccion = 1 / val.length;
      val.forEach(cod => {
        const obj = prodDiariaMap.get(celda.fecha) || 0;
        prodDiariaMap.set(celda.fecha, obj + (fraccion * valorObraMap.get(cod)!));
      });
    });

    const numObras = datosObras.filter(o => o.numParticipaciones > 0).length;
    const arrProds = Array.from(prodDiariaMap.values());
    const prodMediaDia = arrProds.length > 0 ? produccionTotal / arrProds.length : 0;
    const prodMediaTech = operariosActivos.length > 0 ? produccionTotal / operariosActivos.length : 0;

    // ----- Bloque de Control Global Empresa -----
    const OBJETIVO_MENSUAL = 425000;
    // Usar días laborables reales del mes (sin fines de semana ni festivos)
    const diasLaborablesMes = capacidad.diasLaborablesMes || 1;
    const objetivoDiario = OBJETIVO_MENSUAL / diasLaborablesMes;

    let prodAcumulada = 0;
    let objAcumulado = 0;

    const datosAcumulados = diasDelMesUnicos.map((fecha) => {
      const prodDia = prodDiariaMap.get(fecha) || 0;
      prodAcumulada += prodDia;
      // Solo suma objetivo en días laborables (no fines de semana ni festivos)
      const esDiaConEntrada = true; // ya filtramos por diasDelMesUnicos
      const dow = new Date(fecha + 'T00:00:00').getDay();
      const esFinSemana = dow === 0 || dow === 6;
      const esFestivoDia = festivos.some(f => f.fecha === fecha);
      if (!esFinSemana && !esFestivoDia) {
        objAcumulado += objetivoDiario;
      }
      void esDiaConEntrada;
      return {
        fecha,
        dia: fecha.split('-')[2],
        prodDia,
        prodRealAcumulada: prodAcumulada,
        objetivoAcumulado: objAcumulado,
        desviacion: prodAcumulada - objAcumulado
      };
    });

    // KPI de control global
    const ultimosDatos = datosAcumulados[datosAcumulados.length - 1] || {
      objetivoAcumulado: 0,
      prodRealAcumulada: 0,
      desviacion: 0
    };

    // Proyección correcta: basada en días laborables, no en días naturales
    const diasTranscurridos = capacidad.diasLaborablesTranscurridos || 1;
    const prodPorDiaLaboral = diasTranscurridos > 0 ? produccionTotal / diasTranscurridos : 0;
    const proyeccionFinMes = prodPorDiaLaboral * diasLaborablesMes;

    // Media diaria requerida para cumplir objetivo con los días laborables restantes
    const diasRestantes = capacidad.diasLaborablesRestantes;
    const pendiente = Math.max(0, OBJETIVO_MENSUAL - produccionTotal);
    const mediaDiariaRequerida = diasRestantes > 0 ? pendiente / diasRestantes : 0;

    return {
      produccionTotal,
      numObras,
      equiposDia,
      prodMediaDia,
      prodMediaTech,
      prodDiariaArr: datosAcumulados.map(d => ({ fecha: d.fecha, dia: d.dia, prod: d.prodDia })),
      datosAcumulados,
      control: {
        objetivoMensual: OBJETIVO_MENSUAL,
        objetivoAcumulado: ultimosDatos.objetivoAcumulado,
        produccionAcumulada: ultimosDatos.prodRealAcumulada,
        desviacion: ultimosDatos.desviacion,
        proyeccionFinMes,
        diasLaborablesRestantes: diasRestantes,
        mediaDiariaRequerida,
      }
    };
  }, [datosObras, celdasDelMes, diasDelMesUnicos, operariosActivos, capacidad, festivos]);

  // Datos Operarios
  const statsOperarios = useMemo(() => {
    return operariosActivos.map(op => {
      let diasTrabajados = 0;
      let diasLibres = 0;
      let prodIndividual = 0;

      celdasDelMes.filter(c => c.operarioId === op.id).forEach(cel => {
        if (cel.estado === 'trabaja') diasTrabajados++;
        else diasLibres++;
      });

      datosObras.forEach(datosObra => {
        if (datosObra.numParticipaciones === 0) return;
        const pts = participacionesPorObra.get(datosObra.obraCodigo) || [];
        const opPts = pts.filter(p => p.celda.operarioId === op.id);
        if (opPts.length > 0) {
          const tF = opPts.reduce((s, p) => s + p.fraccion, 0);
          prodIndividual += tF * datosObra.valorPorParticipacion;
        }
      });

      return {
        id: op.id,
        nombre: op.nombre,
        diasTrabajados,
        diasLibres,
        prodIndividual
      };
    }).sort((a, b) => b.prodIndividual - a.prodIndividual);
  }, [operariosActivos, celdasDelMes, datosObras, participacionesPorObra]);

  // Ranking Equipos
  const statsEquipos = useMemo(() => {
    const eventos = new Map<string, { ops: string[], cod: string, fec: string, frac: number }>();
    celdasDelMes.forEach(c => {
      if (c.estado !== 'trabaja') return;
      const val = (c.obrasCodigos || (c.obraCodigo ? [c.obraCodigo] : [])).filter(cd => obras.some(o => o.obraCodigo === cd));
      if (val.length === 0) return;
      const f = 1 / val.length;
      val.forEach(cod => {
        const k = `${c.fecha}_${cod}`;
        if (!eventos.has(k)) eventos.set(k, { ops: [], cod, fec: c.fecha, frac: 0 });
        const ev = eventos.get(k)!;
        if (!ev.ops.includes(c.operarioId)) {
          ev.ops.push(c.operarioId);
          ev.frac += f;
        }
      });
    });

    const valorObraMap = new Map<string, number>();
    datosObras.forEach(d => valorObraMap.set(d.obraCodigo, d.valorPorParticipacion));

    const eqMap = new Map<string, { firma: string, diasSet: Set<string>, prod: number, eqDia: number }>();
    Array.from(eventos.values()).forEach(ev => {
      const f = [...ev.ops].sort().join(',');
      if (!eqMap.has(f)) eqMap.set(f, { firma: f, diasSet: new Set(), prod: 0, eqDia: 0 });
      const eq = eqMap.get(f)!;
      eq.diasSet.add(ev.fec);
      eq.prod += ev.frac * (valorObraMap.get(ev.cod) || 0);
      eq.eqDia += ev.ops.length / 3;
    });

    return Array.from(eqMap.values()).map(e => ({
      ...e,
      efic: e.eqDia > 0 ? e.prod / e.eqDia : 0,
      nombres: e.firma.split(',').map(id => operarios.find(o => o.id === id)?.nombre || id).join(', ')
    })).sort((a, b) => b.efic - a.efic);
  }, [celdasDelMes, obras, datosObras, operarios]);

  // Alertas
  const alertas = useMemo(() => {
    const alerts: string[] = [];
    
    // Días de baja producción (<= umbral, excluyendo 0 que podrían ser domingos puros)
    const mediaProdDiaria = kpis.prodMediaDia;
    const diasBajos = kpis.prodDiariaArr.filter(d => d.prod > 0 && d.prod < mediaProdDiaria * 0.4);
    if (diasBajos.length > 0) {
      alerts.push(`Hay ${diasBajos.length} día(s) con producción anormalmente baja (<40% media).`);
    }

    // Técnicos infrautilizados
    const techBajos = statsOperarios.filter(t => t.diasTrabajados > 0 && t.diasTrabajados <= 5);
    if (techBajos.length > 0) {
      alerts.push(`${techBajos.length} técnico(s) tuvieron 5 o menos días asignados este mes.`);
    }

    // Variabilidad grande
    const arrP = kpis.prodDiariaArr.filter(d => d.prod > 0).map(d => d.prod);
    if (arrP.length > 0) {
      const maxP = Math.max(...arrP);
      const minP = Math.min(...arrP);
      if (maxP > minP * 5 && minP !== 0) {
        alerts.push(`Se detectan picos extremos de producción (Max: ${Math.round(maxP)}€ vs Min activo: ${Math.round(minP)}€).`);
      }
    }

    return alerts;
  }, [kpis, statsOperarios]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Operativo</h2>
        <div className="flex gap-4">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="border rounded px-3 py-2">
            {[anio - 1, anio, anio + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="border rounded px-3 py-2">
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Control Global Empresa */}
      <div className="bg-gray-900 text-white rounded-xl shadow-lg p-6 mb-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>🌍</span> Control Global de Empresa
        </h3>
        
        {/* KPIs Control */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-gray-600 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Objetivo Mensual</h4>
            <p className="text-xl font-bold mt-1 text-gray-100">{kpis.control.objetivoMensual.toLocaleString('es-ES')} €</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Obj. Acumulado</h4>
            <p className="text-xl font-bold mt-1 text-gray-100">{Math.round(kpis.control.objetivoAcumulado).toLocaleString('es-ES')} €</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-emerald-500 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Prod. Acumulada</h4>
            <p className="text-xl font-bold mt-1 text-white">{Math.round(kpis.control.produccionAcumulada).toLocaleString('es-ES')} €</p>
          </div>
          <div className={`bg-gray-800 p-4 rounded-lg border-l-4 shadow-inner ${kpis.control.desviacion >= 0 ? 'border-emerald-400' : 'border-red-500'}`}>
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Desviación Acum.</h4>
            <p className={`text-xl font-bold mt-1 ${kpis.control.desviacion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {kpis.control.desviacion > 0 ? '+' : ''}{Math.round(kpis.control.desviacion).toLocaleString('es-ES')} €
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-purple-500 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Proyección Fin Mes</h4>
            <p className="text-xl font-bold mt-1 text-gray-100">{Math.round(kpis.control.proyeccionFinMes).toLocaleString('es-ES')} €</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-sky-500 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Días Lab. Restantes</h4>
            <p className="text-xl font-bold mt-1 text-sky-300">{kpis.control.diasLaborablesRestantes}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-amber-500 shadow-inner">
            <h4 className="text-gray-400 text-xs uppercase font-semibold">Media Diaria Req.</h4>
            <p className="text-xl font-bold mt-1 text-amber-300">{Math.round(kpis.control.mediaDiariaRequerida).toLocaleString('es-ES')} €</p>
          </div>
        </div>

        {/* Gráficas de Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolución Acumulada */}
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Evolución Acumulada (Real vs Objetivo)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.datosAcumulados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="dia" stroke="#9ca3af" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tick={{fontSize: 11}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '0.375rem' }}
                    itemStyle={{ color: '#fff', fontSize: '13px' }}
                    labelStyle={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(val: any) => [`${Math.round(val).toLocaleString('es-ES')} €`, '']}
                  />
                  <Line type="monotone" dataKey="objetivoAcumulado" name="Objetivo Acum." stroke="#6b7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="prodRealAcumulada" name="Prod. Real" stroke="#10b981" strokeWidth={3} dot={{r: 2, fill: '#10b981'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diferencia Acumulada */}
          <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Diferencia Acumulada Diaria</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.datosAcumulados} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="dia" stroke="#9ca3af" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tick={{fontSize: 11}} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={40} />
                  <Tooltip 
                    cursor={{fill: '#374151'}}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '0.375rem' }}
                    labelStyle={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(val: any) => [`${val > 0 ? '+' : ''}${Math.round(val).toLocaleString('es-ES')} €`, 'Desviación']}
                  />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                  <Bar dataKey="desviacion" radius={[2, 2, 0, 0]} maxBarSize={40}>
                    {kpis.datosAcumulados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.desviacion >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-b-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Producción Total</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{kpis.produccionTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-b-4 border-emerald-500">
          <h3 className="text-sm font-medium text-gray-500">Obras Activas</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{kpis.numObras}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-b-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">Media Diaria</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{kpis.prodMediaDia.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-b-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-500">Med. por Técnico</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{kpis.prodMediaTech.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-b-4 border-pink-500">
          <h3 className="text-sm font-medium text-gray-500">Equipos-Día</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{kpis.equiposDia.toFixed(1)}</p>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow">
          <h4 className="font-bold text-orange-800 mb-2">Alertas Inteligentes</h4>
          <ul className="list-disc pl-5 text-sm text-orange-700 space-y-1">
            {alertas.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Evolución Temporal (Gráfica Real con Recharts) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Evolución Diaria de Producción</h3>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kpis.prodDiariaArr}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="fecha" 
                tickFormatter={(val) => val.split('-')[2]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#6b7280' }} 
                dy={10}
              />
              <YAxis 
                tickFormatter={(val) => `${val.toLocaleString()}€`} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={65}
              />
              <Tooltip 
                cursor={{ fill: '#f3f4f6' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const val = Number(payload[0].value);
                    return (
                      <div className="bg-gray-900 border border-gray-700 text-white text-xs py-2 px-3 rounded shadow-lg pointer-events-none">
                        <p className="font-bold border-b border-gray-700 pb-1 mb-1">{label}</p>
                        <p>{val.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="prod" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {kpis.prodDiariaArr.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.prod > 0 ? '#3b82f6' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Rendimiento Individual */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 p-5 border-b bg-gray-50/50">
            Rendimiento Técnico <span className="text-sm font-normal text-gray-500 ml-2">(Top 5)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Técnico</th>
                  <th className="px-6 py-4 text-center">Días Activos</th>
                  <th className="px-6 py-4 text-right">Producción Total</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {statsOperarios.slice(0, 5).map(op => (
                  <tr key={op.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">{op.nombre}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      <span className="font-medium">{op.diasTrabajados}</span>
                      <span className="text-gray-400 text-xs ml-1">({op.diasLibres} L)</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                        {Math.round(op.prodIndividual).toLocaleString()} €
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking por Equipos Destacados */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 p-5 border-b bg-gray-50/50">
            Equipos Eficientes <span className="text-sm font-normal text-gray-500 ml-2">(Top 5)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4 text-center">Frecuencia</th>
                  <th className="px-6 py-4 text-right">Eficiencia Media</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {statsEquipos.slice(0, 5).map((eq, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800 text-xs">
                      <div className="max-w-[200px] truncate" title={eq.nombres}>
                        {eq.nombres}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      <span className="font-medium">{eq.diasSet.size} días</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                        {Math.round(eq.efic).toLocaleString()} €/d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
