import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Operario, Obra, CeldaCalendario, Festivo, EstadoCelda } from '../types';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const LABEL: Record<EstadoCelda, string> = {
  trabaja: '',
  vacaciones: 'Vacaciones',
  baja: 'Baja',
  permiso: 'Permiso',
  festivo: 'Festivo',
  libre: '',
};

// Colores de relleno por estado (RGB), en línea con la app.
const FILL: Record<EstadoCelda, [number, number, number]> = {
  trabaja: [227, 240, 209],   // verde marca claro
  vacaciones: [254, 249, 195], // amarillo
  baja: [254, 226, 226],       // rojo
  permiso: [255, 237, 213],    // naranja
  festivo: [243, 232, 255],    // morado
  libre: [255, 255, 255],
};

function fechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface ExportParams {
  dias: Date[];             // 7 días de la semana (lunes a domingo)
  operarios: Operario[];    // activos, en orden de aparición
  celdas: CeldaCalendario[];
  obras: Obra[];
  festivos: Festivo[];
}

export function exportarPlanningSemanalPDF({ dias, operarios, celdas, obras, festivos }: ExportParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // --- Cabecera de marca ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(85, 137, 46);
  doc.text('Publisolar', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Planning semanal de instaladores', 14, 22);

  const ini = dias[0];
  const fin = dias[6];
  const rango =
    ini.getMonth() === fin.getMonth()
      ? `Semana del ${ini.getDate()} al ${fin.getDate()} de ${MESES[fin.getMonth()]} de ${fin.getFullYear()}`
      : `Semana del ${ini.getDate()} de ${MESES[ini.getMonth()]} al ${fin.getDate()} de ${MESES[fin.getMonth()]} de ${fin.getFullYear()}`;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(rango, pageW - 14, 16, { align: 'right' });

  doc.setDrawColor(107, 168, 58);
  doc.setLineWidth(0.8);
  doc.line(14, 25, pageW - 14, 25);

  const esFestivo = (fecha: string) => festivos.some(f => f.fecha === fecha);

  // --- Cabecera de la tabla ---
  const head = [[
    'Instalador',
    ...dias.map((d, i) => {
      const fecha = fechaLocal(d);
      const base = `${DIAS[i]}\n${d.getDate()}/${d.getMonth() + 1}`;
      return esFestivo(fecha) ? `${base}\n(Festivo)` : base;
    }),
  ]];

  // --- Cuerpo ---
  const body: any[] = operarios.map(op => {
    const row: any[] = [{
      content: op.nombre,
      styles: { fontStyle: 'bold', fillColor: [245, 245, 244], textColor: [40, 40, 40], halign: 'left' },
    }];
    dias.forEach(d => {
      const fecha = fechaLocal(d);
      const celda = celdas.find(c => c.operarioId === op.id && c.fecha === fecha);
      const estado: EstadoCelda = celda?.estado || 'libre';
      let text = '';
      if (estado === 'trabaja') {
        const cods = celda?.obrasCodigos || (celda?.obraCodigo ? [celda.obraCodigo] : []);
        text = cods.join('\n');
      } else {
        text = LABEL[estado];
      }
      row.push({
        content: text,
        styles: { fillColor: FILL[estado], halign: 'center', textColor: [50, 50, 50] },
      });
    });
    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: 29,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [60, 60, 59], textColor: [255, 255, 255], halign: 'center', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 42 } },
  });

  // --- Leyenda de obras que aparecen esta semana ---
  const codigosSemana = new Set<string>();
  const rangoIni = fechaLocal(dias[0]);
  const rangoFin = fechaLocal(dias[6]);
  celdas.forEach(c => {
    if (c.fecha < rangoIni || c.fecha > rangoFin) return;
    if (c.estado !== 'trabaja') return;
    (c.obrasCodigos || (c.obraCodigo ? [c.obraCodigo] : [])).forEach(cod => codigosSemana.add(cod));
  });

  const leyenda = Array.from(codigosSemana)
    .sort()
    .map(cod => {
      const obra = obras.find(o => o.obraCodigo === cod);
      return obra?.nombre ? `${cod} — ${obra.nombre}` : cod;
    });

  let y = (doc as any).lastAutoTable.finalY + 8;
  if (leyenda.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(85, 137, 46);
    doc.text('Obras de la semana', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    leyenda.forEach(linea => {
      if (y > pageH - 12) return; // no desbordar la página
      doc.text(linea, 16, y);
      y += 4.5;
    });
  }

  // --- Pie ---
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Publisolar · 951 55 20 20', 14, pageH - 8);

  doc.save(`planning-semana-${fechaLocal(dias[0])}.pdf`);
}
