import { formatCurrency, formatDate, getDaysRemaining } from './formatters';

/**
 * Maps a Reports module `action` to a concrete dataset (title + columns + rows)
 * pulled from the ERP store. Columns follow the exporter contract:
 *   { label, key?, value?(row), weight? }
 *
 * @param {string} action  report identifier from Reports.jsx
 * @param {object} store   full ERP store snapshot
 * @returns {{ title:string, columns:Array, rows:Array } | null}
 */
export function buildReportData(action, store) {
  const {
    employees = [],
    bikes = [],
    assignments = [],
    payrolls = [],
    loans = [],
    fines = [],
    maintenance = [],
    expenses = [],
    income = [],
    auditLogs = [],
  } = store;

  switch (action) {
    case 'employee':
      return {
        title: 'Employee & Riders Report',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Full Name', key: 'fullName', weight: 1.4 },
          { label: 'Mobile', key: 'mobile' },
          { label: 'Nationality', key: 'nationality' },
          { label: 'Job Title', key: 'jobTitle' },
          { label: 'Status', key: 'status' },
          { label: 'Emirate', key: 'workEmirate' },
          { label: 'Platform', key: 'platformName' },
          { label: 'Salary', value: (r) => formatCurrency(r.salaryAmount) },
          { label: 'WPS', key: 'wpsStatus' },
        ],
        rows: employees,
      };

    case 'fleet':
      return {
        title: 'Fleet Motorbike Inventory',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Plate', value: (r) => `${r.plateCode} ${r.plateNumber}` },
          { label: 'Emirate', key: 'emirate' },
          { label: 'Brand', key: 'brand' },
          { label: 'Model', key: 'model' },
          { label: 'Year', key: 'year' },
          { label: 'Chassis', key: 'chassisNumber', weight: 1.4 },
          { label: 'Insurance Expiry', value: (r) => formatDate(r.insuranceExpiry) },
          { label: 'Status', key: 'status' },
          { label: 'Current Rider', value: (r) => r.currentRider || '—' },
        ],
        rows: bikes,
      };

    case 'assignment':
      return {
        title: 'Active Assignments Trace',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Employee', key: 'employeeName', weight: 1.4 },
          { label: 'Bike', key: 'bikeId' },
          { label: 'Plate', key: 'plateNumber' },
          { label: 'Assigned', value: (r) => formatDate(r.assignDate) },
          { label: 'Returned', value: (r) => (r.returnDate ? formatDate(r.returnDate) : '—') },
          { label: 'Status', key: 'status' },
        ],
        rows: assignments,
      };

    case 'payroll': {
      const rows = payrolls.flatMap((sheet) =>
        sheet.records.map((rec) => ({ ...rec, period: `${sheet.month}/${sheet.year}` }))
      );
      return {
        title: 'Monthly Payroll Statement',
        columns: [
          { label: 'Period', key: 'period' },
          { label: 'Employee', key: 'employeeName', weight: 1.4 },
          { label: 'Gross', value: (r) => formatCurrency(r.grossSalary) },
          { label: 'Loans', value: (r) => formatCurrency(r.loanDeduction) },
          { label: 'Fines', value: (r) => formatCurrency(r.fineDeduction) },
          { label: 'Salik', value: (r) => formatCurrency(r.salikDeduction) },
          { label: 'Penalty', value: (r) => formatCurrency(r.companyPenalty) },
          { label: 'Net', value: (r) => formatCurrency(r.netSalary) },
          { label: 'Channel', key: 'salaryType' },
        ],
        rows,
      };
    }

    case 'loans':
      return {
        title: 'Rider Advance Loans',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Employee', key: 'employeeName', weight: 1.4 },
          { label: 'Loan Date', value: (r) => formatDate(r.loanDate) },
          { label: 'Loan Amount', value: (r) => formatCurrency(r.loanAmount) },
          { label: 'Paid', value: (r) => formatCurrency(r.paidAmount) },
          { label: 'Balance', value: (r) => formatCurrency(r.remainingBalance) },
          { label: 'Monthly', value: (r) => formatCurrency(r.monthlyDeduction) },
          { label: 'Installments Left', key: 'remainingInstallments' },
          { label: 'Status', key: 'status' },
        ],
        rows: loans,
      };

    case 'fines':
      return {
        title: 'Traffic Violations & Fines',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Employee', key: 'employeeName', weight: 1.4 },
          { label: 'Plate', key: 'plateNumber' },
          { label: 'Type', key: 'fineType' },
          { label: 'Date', value: (r) => formatDate(r.fineDate) },
          { label: 'Amount', value: (r) => formatCurrency(r.amount) },
          { label: 'Emirate', key: 'emirate' },
          { label: 'Who Pays', key: 'whoPays' },
          { label: 'Deduction', key: 'deductionStatus' },
          { label: 'Payment', key: 'paymentStatus' },
        ],
        rows: fines,
      };

    case 'maintenance':
      return {
        title: 'Fleet Maintenance Services',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Bike', key: 'bikeId' },
          { label: 'Plate', key: 'plateNumber' },
          { label: 'Date', value: (r) => formatDate(r.date) },
          { label: 'Type', key: 'type' },
          { label: 'Description', key: 'description', weight: 2 },
          { label: 'Cost', value: (r) => formatCurrency(r.cost) },
          { label: 'Supplier', key: 'supplier' },
          { label: 'Next Service', value: (r) => formatDate(r.nextServiceDate) },
          { label: 'Status', key: 'status' },
        ],
        rows: maintenance,
      };

    case 'documents': {
      const docTypes = [
        ['Passport', 'passportExpiry'],
        ['Emirates ID', 'emiratesIdExpiry'],
        ['Visa', 'visaExpiry'],
        ['Labour Card', 'labourCardExpiry'],
        ['Driving License', 'drivingLicenseExpiry'],
      ];
      const rows = employees.flatMap((emp) =>
        docTypes
          .filter(([, field]) => emp[field])
          .map(([docType, field]) => ({
            employee: emp.fullName,
            employeeId: emp.id,
            docType,
            expiry: emp[field],
            daysRemaining: getDaysRemaining(emp[field]),
          }))
      );
      return {
        title: 'Document Expirations Action Log',
        columns: [
          { label: 'Employee', key: 'employee', weight: 1.4 },
          { label: 'Employee ID', key: 'employeeId' },
          { label: 'Document', key: 'docType' },
          { label: 'Expiry Date', value: (r) => formatDate(r.expiry) },
          { label: 'Days Remaining', value: (r) => `${r.daysRemaining} days` },
        ],
        rows,
      };
    }

    case 'expenses':
      return {
        title: 'General Operating Expenses',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Date', value: (r) => formatDate(r.date) },
          { label: 'Category', key: 'category' },
          { label: 'Amount', value: (r) => formatCurrency(r.amount) },
          { label: 'Payment', key: 'paymentMethod' },
          { label: 'Emirate', key: 'emirate' },
          { label: 'Supplier', key: 'supplier', weight: 1.4 },
          { label: 'Invoice', key: 'invoiceNumber' },
          { label: 'Paid By', key: 'paidBy' },
        ],
        rows: expenses,
      };

    case 'platform-income':
      return {
        title: 'Platform Revenues Ledger',
        columns: [
          { label: 'ID', key: 'id' },
          { label: 'Date', value: (r) => formatDate(r.date) },
          { label: 'Income Type', key: 'incomeType' },
          { label: 'Platform', key: 'platformName' },
          { label: 'Emirate', key: 'emirate' },
          { label: 'Amount', value: (r) => formatCurrency(r.amount) },
          { label: 'Reference', key: 'referenceNumber' },
          { label: 'Settlement', key: 'settlementMonth' },
        ],
        rows: income,
      };

    case 'profit-loss': {
      const totalRevenue = income.reduce((s, i) => s + (i.amount || 0), 0);
      const payrollCost = employees.reduce((s, e) => s + (e.salaryAmount || 0), 0);
      const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const maintenanceTotal = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
      const finesTotal = fines.reduce((s, f) => s + (f.amount || 0), 0);
      const netMargin = totalRevenue - payrollCost - expensesTotal - maintenanceTotal;
      const rows = [
        { item: 'Total Platform Revenue', type: 'Revenue', amount: totalRevenue },
        { item: 'Gross Driver Payroll', type: 'Cost', amount: -payrollCost },
        { item: 'Operating Expenses', type: 'Cost', amount: -expensesTotal },
        { item: 'Fleet Maintenance', type: 'Cost', amount: -maintenanceTotal },
        { item: 'Traffic Fines (recorded)', type: 'Memo', amount: -finesTotal },
        { item: 'NET OPERATING MARGIN', type: 'Result', amount: netMargin },
      ];
      return {
        title: 'Corporate Profit & Loss Statement',
        columns: [
          { label: 'Line Item', key: 'item', weight: 2 },
          { label: 'Type', key: 'type' },
          { label: 'Amount (AED)', value: (r) => formatCurrency(r.amount) },
        ],
        rows,
      };
    }

    case 'audit-logs':
      return {
        title: 'System Activity Logs',
        columns: [
          { label: 'Timestamp', value: (r) => formatDate(r.timestamp, 'DD MMM YYYY HH:mm:ss') },
          { label: 'User', key: 'user', weight: 1.3 },
          { label: 'Action', key: 'action' },
          { label: 'Module', key: 'module' },
          { label: 'Record ID', key: 'recordId' },
          { label: 'IP Address', key: 'ipAddress' },
          { label: 'Device', key: 'device', weight: 1.3 },
        ],
        rows: auditLogs,
      };

    default:
      return null;
  }
}
