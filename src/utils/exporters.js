import { formatDate } from './formatters';

/**
 * Generic export helpers used across Reports, Audit Logs and Payroll.
 *
 * - exportToCsv  → produces an Excel-friendly .csv (UTF-8 BOM so Arabic / AED
 *                  symbols open correctly in Excel).
 * - exportToPdf  → renders a paginated table straight into jsPDF. We draw the
 *                  table programmatically instead of screenshotting the DOM
 *                  (html2canvas can't parse Tailwind v4 `oklch()` colors, which
 *                  is what made the old payslip download fail).
 *
 * Columns are described as: { label, key?, value?(row), weight? }
 *   - `key`    reads row[key]
 *   - `value`  custom accessor (takes precedence over key)
 *   - `weight` relative column width for PDF (defaults to 1)
 */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function cellValue(col, row) {
  const raw = typeof col.value === 'function' ? col.value(row) : row[col.key];
  return raw === null || raw === undefined ? '' : raw;
}

function csvCell(value) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvCell(cellValue(c, row))).join(','))
    .join('\r\n');

  const content = `﻿${header}\r\n${body}\r\n`;
  const name = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), name);
}

export async function exportToPdf(filename, { title, subtitle, columns, rows }) {
  const { jsPDF } = await import('jspdf');

  const landscape = columns.length > 5;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableW = pageW - margin * 2;

  const totalWeight = columns.reduce((sum, c) => sum + (c.weight || 1), 0);
  const widths = columns.map((c) => ((c.weight || 1) / totalWeight) * usableW);

  let y = margin;

  const drawDocHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text('MUZN Delivery Services LLC — Dubai, UAE | Operations & Fleet', margin, y + 9);
    if (subtitle) {
      const sub = doc.splitTextToSize(subtitle, usableW);
      doc.text(sub, margin, y + 13);
      y += 13 + sub.length * 3.6;
    } else {
      y += 13;
    }
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let x = margin;
    columns.forEach((c, i) => {
      doc.text(String(c.label).toUpperCase(), x + 1.5, y + 5.3, { maxWidth: widths[i] - 3 });
      x += widths[i];
    });
    y += 8;
  };

  drawDocHeader();
  drawTableHeader();

  const lineH = 3.6;
  rows.forEach((row, ri) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const cells = columns.map((c, i) =>
      doc.splitTextToSize(String(cellValue(c, row)), widths[i] - 3)
    );
    const rowLines = Math.max(1, ...cells.map((c) => c.length));
    const rowH = rowLines * lineH + 3;

    if (y + rowH > pageH - margin - 8) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }

    if (ri % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usableW, rowH, 'F');
    }

    doc.setTextColor(30, 41, 59);
    let x = margin;
    cells.forEach((lines, i) => {
      doc.text(lines, x + 1.5, y + 4);
      x += widths[i];
    });
    y += rowH;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 160, 175);
  doc.text(
    `${rows.length} record(s)  •  Generated ${formatDate(new Date(), 'DD MMM YYYY HH:mm')}`,
    margin,
    pageH - 6
  );

  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(name);
}
