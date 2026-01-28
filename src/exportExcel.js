import ExcelJS from 'exceljs';
import { DX } from './constants.js';
import { downloadBlob } from './utils.js';

function autoWidth(worksheet){
  worksheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      const txt = v?.richText ? v.richText.map(r=>r.text).join('') : (v?.formula ? String(v.formula) : (v ?? ''));
      max = Math.max(max, String(txt).length + 2);
    });
    col.width = Math.min(Math.max(max, 10), 42);
  });
}

export async function exportDayXlsx({ visits, visitDate, doctorName }){
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OPD LoggerX';
  wb.created = new Date();

  // Raw sheet
  const raw = wb.addWorksheet('Raw Data', { views: [{ state: 'frozen', ySplit: 1 }] });
  raw.addRow([
    'Time','Patient ID','Gender','Age Group','Dx1','Dx2','Category','WW/Non-WW','Disposition'
  ]);
  raw.getRow(1).font = { bold: true };

  const rows = visits
    .slice()
    .sort((a,b)=> (a.time||'').localeCompare(b.time||''))
    .map(v => [
      v.time || '',
      v.patientId || '',
      v.gender || '',
      v.ageGroup || '',
      v.diagnoses?.[0] ?? '',
      v.diagnoses?.[1] ?? '',
      v.isSurgical ? 'S' : 'M',
      v.isSurgical ? (v.wwStatus || '') : '',
      v.disposition || ''
    ]);

  for (const r of rows) raw.addRow(r);
  raw.autoFilter = { from: 'A1', to: 'I1' };
  autoWidth(raw);

  // Summary sheet
  const sum = wb.addWorksheet('Day Summary', { views: [{ state: 'frozen', ySplit: 6 }] });

  const headerStyle = { bold:true, size: 14 };
  sum.getCell('A1').value = 'OPD LoggerX — Day Summary';
  sum.getCell('A1').font = headerStyle;

  sum.getCell('A2').value = 'Doctor';
  sum.getCell('B2').value = doctorName || '';
  sum.getCell('A3').value = 'Date';
  sum.getCell('B3').value = visitDate;
  sum.getCell('A4').value = 'Exported at';
  sum.getCell('B4').value = new Date().toLocaleString();

  sum.getCell('A6').value = 'Key Totals';
  sum.getCell('A6').font = { bold:true };

  // Totals block (formulas reference Raw Data)
  // Raw rows are from row 2 to row N; use whole columns for simplicity.
  sum.addRow(['Total visits', { formula: 'COUNTA(\'Raw Data\'!B:B)-1' }]);
  sum.addRow(['Male',        { formula: 'COUNTIF(\'Raw Data\'!C:C,"Male")' }]);
  sum.addRow(['Female',      { formula: 'COUNTIF(\'Raw Data\'!C:C,"Female")' }]);
  sum.addRow(['Surgical total', { formula: 'COUNTIF(\'Raw Data\'!G:G,"S")' }]);
  sum.addRow(['WW',          { formula: 'COUNTIF(\'Raw Data\'!H:H,"WW")' }]);
  sum.addRow(['Non-WW',      { formula: 'COUNTIF(\'Raw Data\'!H:H,"Non-WW")' }]);

  // Disposition block
  sum.addRow([]);
  const dStart = sum.lastRow.number + 1;
  sum.getCell(`A${dStart}`).value = 'Disposition';
  sum.getCell(`A${dStart}`).font = { bold:true };
  const dispositions = ['Discharged','Admitted','Referred to ED','Referred out'];
  for (const d of dispositions){
    sum.addRow([d, { formula: `COUNTIF(\'Raw Data\'!I:I,"${d}")` }]);
  }

  // Age x Gender block
  sum.addRow([]);
  const aStart = sum.lastRow.number + 1;
  sum.getCell(`A${aStart}`).value = 'Age × Gender';
  sum.getCell(`A${aStart}`).font = { bold:true };
  sum.addRow(['Age Group','Male','Female']);
  const ageRows = [
    ['<5', 'COUNTIFS(\'Raw Data\'!D:D,"<5",\'Raw Data\'!C:C,"Male")', 'COUNTIFS(\'Raw Data\'!D:D,"<5",\'Raw Data\'!C:C,"Female")'],
    ['5-14', 'COUNTIFS(\'Raw Data\'!D:D,"5-14",\'Raw Data\'!C:C,"Male")', 'COUNTIFS(\'Raw Data\'!D:D,"5-14",\'Raw Data\'!C:C,"Female")'],
    ['15-17', 'COUNTIFS(\'Raw Data\'!D:D,"15-17",\'Raw Data\'!C:C,"Male")', 'COUNTIFS(\'Raw Data\'!D:D,"15-17",\'Raw Data\'!C:C,"Female")'],
    ['≥18', 'COUNTIFS(\'Raw Data\'!D:D,"≥18",\'Raw Data\'!C:C,"Male")', 'COUNTIFS(\'Raw Data\'!D:D,"≥18",\'Raw Data\'!C:C,"Female")'],
  ];
  for (const [ag, fm, ff] of ageRows){
    sum.addRow([ag, { formula: fm }, { formula: ff }]);
  }
  const ageHeaderRow = aStart + 1;
  sum.getRow(ageHeaderRow).font = { bold:true };

  // Dx counts
  sum.addRow([]);
  const xStart = sum.lastRow.number + 1;
  sum.getCell(`A${xStart}`).value = 'Diagnosis counts (Dx1 + Dx2)';
  sum.getCell(`A${xStart}`).font = { bold:true };
  sum.addRow(['Dx No','Dx Name','Count']);
  const dxHeader = sum.lastRow.number;
  sum.getRow(dxHeader).font = { bold:true };

  for (const d of DX){
    const countFormula = `COUNTIF(\'Raw Data\'!E:E,${d.no})+COUNTIF(\'Raw Data\'!F:F,${d.no})`;
    sum.addRow([d.no, d.name, { formula: countFormula }]);
  }

  autoWidth(sum);

  // Light styling
  for (const ws of [raw, sum]){
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical:'middle', wrapText:true };
      });
      if (rowNumber === 1) row.height = 18;
    });
  }

  const safeName = (doctorName || 'Doctor').replace(/[^a-z0-9 _-]/gi,'').trim().replace(/\s+/g,'_');
  const filename = `OPD_LoggerX_${visitDate}_${safeName}.xlsx`;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}
