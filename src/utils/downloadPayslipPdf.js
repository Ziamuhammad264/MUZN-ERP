import { formatCurrency, formatDate } from './formatters';

/**
 * Build a salary payslip PDF directly with jsPDF.
 *
 * The previous implementation screenshotted the modal with html2canvas, which
 * throws on Tailwind v4's `oklch()` colors ("Could not generate PDF"). Drawing
 * the document programmatically is reliable across themes and yields crisp,
 * selectable text.
 *
 * @param {object} slip    A single payroll record (employeeName, grossSalary, …)
 * @param {object} payroll The parent payroll sheet (month, year, status, …)
 */
export async function downloadPayslipPdf(slip, payroll) {
  if (!slip || !payroll) {
    throw new Error('Payslip data is not available.');
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 22;

  // ---- Company header ---------------------------------------------------
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y - 6, 9, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('M', margin + 4.5, y + 0.7, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text('MUZN DELIVERY SERVICES LLC', margin + 13, y - 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text('Dubai, UAE  |  Operations & Fleet Head Office', margin + 13, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text(String(payroll.status || 'DRAFT').toUpperCase(), pageW - margin, y - 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(`Statement Month: ${payroll.month}/${payroll.year}`, pageW - margin, y + 2, { align: 'right' });
  doc.text(`Date Generated: ${formatDate(payroll.generatedDate)}`, pageW - margin, y + 6, { align: 'right' });

  y += 13;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---- Employee & payment box ------------------------------------------
  const boxH = 27;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'FD');

  const colX1 = margin + 5;
  const colX2 = margin + contentW / 2 + 3;
  const drawLabel = (text, x, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(text.toUpperCase(), x, yy);
  };
  const drawValue = (text, x, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(String(text), x, yy);
  };

  drawLabel('Rider / Employee', colX1, y + 7);
  drawValue(slip.employeeName, colX1, y + 12);
  drawLabel('Employee ID', colX1, y + 19);
  drawValue(slip.employeeId, colX1, y + 24);

  drawLabel('Transfer Channel', colX2, y + 7);
  drawValue(`${slip.salaryType} (${slip.wpsStatus})`, colX2, y + 12);
  drawLabel('Currency', colX2, y + 19);
  drawValue('AED (UAE Dirham)', colX2, y + 24);

  y += boxH + 11;

  // ---- Ledger breakdown -------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('LEDGER STATEMENT BREAKDOWN', margin, y);
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const lineItem = (name, amount, { bold = false, color = [71, 85, 105] } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(name, margin, y);
    doc.text(amount, pageW - margin, y, { align: 'right' });
    y += bold ? 9 : 7.5;
  };

  lineItem('Basic / Gross Monthly Salary', formatCurrency(slip.grossSalary), { color: [30, 41, 59] });
  if (slip.loanDeduction > 0)
    lineItem('Loan Installment Deduction', `-${formatCurrency(slip.loanDeduction)}`, { color: [225, 29, 72] });
  if (slip.fineDeduction > 0)
    lineItem('Traffic Fines Deducted', `-${formatCurrency(slip.fineDeduction)}`, { color: [225, 29, 72] });
  if (slip.salikDeduction > 0)
    lineItem('Salik Toll Fees Deducted', `-${formatCurrency(slip.salikDeduction)}`, { color: [225, 29, 72] });
  if (slip.companyPenalty > 0)
    lineItem('Company Penalties / Damages', `-${formatCurrency(slip.companyPenalty)}`, { color: [225, 29, 72] });

  y += 3;

  // ---- Net pay highlight -----------------------------------------------
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentW, 13, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('NET DISBURSED SALARY', margin + 4, y + 8.4);
  doc.setTextColor(4, 120, 87);
  doc.setFontSize(11);
  doc.text(formatCurrency(slip.netSalary), pageW - margin - 4, y + 8.4, { align: 'right' });

  y += 35;

  // ---- Signatures -------------------------------------------------------
  const sigW = (contentW - 20) / 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + sigW, y);
  doc.line(margin + sigW + 20, y, margin + contentW, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text('Prepared By: Finance Officer', margin, y + 5);
  doc.text('Approved By: Owner Representative', margin + sigW + 20, y + 5);

  const fileName = `Payslip_${slip.employeeId}_${payroll.month}-${payroll.year}.pdf`;
  doc.save(fileName);
}
