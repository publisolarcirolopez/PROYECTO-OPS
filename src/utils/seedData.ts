import { Operario, Obra, CeldaCalendario } from '../types';

export function initSeedData() {
  if (window.localStorage.getItem('seeded_marzo_2026')) {
    return;
  }

  // 1. Generar 18 técnicos
  const nombresTecnicos = [
    'Carlos Martínez', 'Luis Gómez', 'Miguel Fernández', 'José Pérez', 'Antonio López',
    'Javier Sánchez', 'Alejandro García', 'David Rodríguez', 'Manuel González', 'Fernando Díaz',
    'Rafael Muñoz', 'Pedro Ruiz', 'Jorge Alonso', 'Francisco Navarro', 'Sergio Romero',
    'Alberto Torres', 'Víctor Flores', 'Raúl Gil'
  ];

  const operarios: Operario[] = nombresTecnicos.map((nombre, i) => ({
    id: `op-${i + 1}`,
    nombre,
    activo: true,
  }));

  // 2. Generar 35 obras (30% pequeñas, 50% medianas, 20% grandes)
  const nombresObras = [
    'Reforma Baño C/ Mayor', 'Instalación Eléctrica Nave 3', 'Mantenimiento Colegios SUR',
    'Adecuación Local Comercial', 'Sustitución Cuadro Eléctrico', 'Iluminación Parque Central',
    'Cableado Estructurado Oficina', 'Reforma Integral Vivienda', 'Mantenimiento Preventivo Q1',
    'Instalación Clima Planta 2', 'Avería Urgente Cuadro General', 'Ampliación Red Datos',
    'Sustitución Luminarias LED', 'Instalación Ptos Recarga', 'Revisión Alta Tensión',
    'Certificación Eléctrica', 'Reforma Cocina y Baño', 'Instalación Sensores',
    'Mantenimiento Mensual Fábrica', 'Adecuación Oficinas Norte', 'Reparación Línea Principal',
    'Instalación Cuadro Domótica', 'Puesta en Marcha Grupo Electrógeno', 'Acometida Nueva Nave',
    'Instalación Paneles Solares', 'Reforma Local Hostelería', 'Iluminación Fachada',
    'Despliegue Red Wifi', 'Mantenimiento Centro de Datos', 'Instalación Detectores Incendio',
    'Revisión Cuadros Secundarios', 'Tendido Cableado Subterráneo', 'Sustitución Baterías SAI',
    'Ampliación Instalación Taller', 'Reforma Hall Hotel'
  ];

  const obras: Obra[] = nombresObras.map((nombre, i) => {
    // 30% small, 50% medium, 20% large
    const rand = Math.random();
    let min = 300, max = 1500;
    if (rand > 0.3 && rand <= 0.8) {
      min = 1500; max = 5000;
    } else if (rand > 0.8) {
      min = 5000; max = 12000;
    }
    const importeTotal = Math.floor(Math.random() * (max - min) + min);
    return {
      obraCodigo: `OBR-${String(i + 1).padStart(3, '0')}`,
      nombre,
      importeTotal,
      activa: true
    };
  });

  // 3. Calendario para marzo 2026 (días 1 al 31)
  const celdas: CeldaCalendario[] = [];

  // Definir equipos fijos
  const equiposFrecuentes = [
    ['op-1', 'op-2', 'op-3'], // Top activity
    ['op-4', 'op-5'],         // Top activity 
    ['op-6', 'op-7', 'op-8', 'op-9']
  ];
  
  const equiposMedios = [
    ['op-10', 'op-11'],
    ['op-12', 'op-13', 'op-14'],
    ['op-15', 'op-16'],
    ['op-1', 'op-4', 'op-5'], // Mezcla
    ['op-2', 'op-6', 'op-10'],
    ['op-7', 'op-11', 'op-17']
  ];

  // Obras tracking para continuidad de varios días
  // Array de obras activas con su duración y equipo asignado
  const obrasActivas: { obra: Obra, equipo: string[], diasRestantes: number }[] = [];
  let nextObraIndex = 0;

  for (let dia = 1; dia <= 31; dia++) {
    const isWeekend = (dia % 7 === 0 || dia % 7 === 1); // Simplificación aprox para marzo 2026 (1 = domingo)
    
    // Si es fin de semana, poca actividad (1 a 2 obras). Entre semana, 3 a 6 obras.
    const numObrasHoy = isWeekend ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * (7 - 3) + 3);
    
    // Decrementar duración de obras activas
    for (let i = obrasActivas.length - 1; i >= 0; i--) {
      obrasActivas[i].diasRestantes -= 1;
      if (obrasActivas[i].diasRestantes <= 0) {
        obrasActivas.splice(i, 1);
      }
    }

    // Llenar hasta numObrasHoy
    while (obrasActivas.length < numObrasHoy && nextObraIndex < obras.length) {
      const duracion = Math.floor(Math.random() * 4) + 1; // 1 a 4 días
      
      // Elegir un equipo
      let equipo: string[];
      const r = Math.random();
      if (r < 0.4) {
        equipo = equiposFrecuentes[Math.floor(Math.random() * equiposFrecuentes.length)];
      } else if (r < 0.8) {
        equipo = equiposMedios[Math.floor(Math.random() * equiposMedios.length)];
      } else {
        // Equipo ocasional
        const size = Math.floor(Math.random() * (6 - 2) + 2); // 2 a 5
        equipo = [];
        const techs = [...Array(18)].map((_, idx) => `op-${idx + 1}`).sort(() => 0.5 - Math.random());
        for (let t = 0; t < size; t++) equipo.push(techs[t]);
      }

      obrasActivas.push({
        obra: obras[nextObraIndex],
        equipo,
        diasRestantes: duracion
      });
      nextObraIndex++;
    }

    // Formatear día
    const fechaStr = `2026-03-${String(dia).padStart(2, '0')}`;
    
    // Registrar a los técnicos en el calendario
    const operariosOcupadosHoy = new Map<string, Set<string>>();

    for (const oa of obrasActivas) {
      for (const opId of oa.equipo) {
        if (!operariosOcupadosHoy.has(opId)) {
          operariosOcupadosHoy.set(opId, new Set<string>());
        }
        operariosOcupadosHoy.get(opId)!.add(oa.obra.obraCodigo);
      }
    }

    // Rellenar celdas para todos
    for (const op of operarios) {
      const obrasAsignadas = operariosOcupadosHoy.get(op.id);
      if (obrasAsignadas) {
        celdas.push({
          operarioId: op.id,
          fecha: fechaStr,
          estado: 'trabaja',
          obrasCodigos: Array.from(obrasAsignadas)
        });
      } else {
        // Libre o descanso
        celdas.push({
          operarioId: op.id,
          fecha: fechaStr,
          estado: 'libre'
        });
      }
    }
  }

  // Si sobraron obras y ya acabó el mes, ajustamos para que se repartan o no, pero 35 en 30 días daba bien.
  window.localStorage.setItem('operarios', JSON.stringify(operarios));
  window.localStorage.setItem('obras', JSON.stringify(obras));
  window.localStorage.setItem('calendario', JSON.stringify(celdas));
  window.localStorage.setItem('seeded_marzo_2026', 'true');
}
