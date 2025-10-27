import { KnowledgeGraph, SheetData } from '../types';

export const mockSheetData: SheetData[] = [
  {
    name: 'Sales Q1',
    data: [
      [{ address: 'A1', value: 'Product' }, { address: 'B1', value: 'Units Sold' }, { address: 'C1', value: 'Unit Price' }, { address: 'D1', value: 'Total Revenue' }],
      [{ address: 'A2', value: 'Gadget Alpha' }, { address: 'B2', value: 150 }, { address: 'C2', value: 50 }, { address: 'D2', value: 7500, formula: '=B2*C2' }],
      [{ address: 'A3', value: 'Widget Beta' }, { address: 'B3', value: 200 }, { address: 'C3', value: 35 }, { address: 'D3', value: 7000, formula: '=B3*C3' }],
      [{ address: 'A4', value: 'Gizmo Gamma' }, { address: 'B4', value: 120 }, { address: 'C4', value: 75 }, { address: 'D4', value: 9000, formula: '=B4*C4' }],
      [{ address: 'A5', value: null }, { address: 'B5', value: null }, { address: 'C5', value: 'Total:' }, { address: 'D5', value: 23500, formula: '=SUM(D2:D4)' }],
    ]
  },
  {
    name: 'Expenses Q1',
    data: [
      [{ address: 'A1', value: 'Category' }, { address: 'B1', value: 'Amount' }],
      [{ address: 'A2', value: 'Marketing' }, { address: 'B2', value: 5000 }],
      [{ address: 'A3', value: 'R&D' }, { address: 'B3', value: 8000 }],
      [{ address: 'A4', value: 'Salaries' }, { address: 'B4', value: 12000 }],
      [{ address: 'A5', value: 'Total:' }, { address: 'B5', value: 25000, formula: '=SUM(B2:B4)' }],
    ]
  },
  {
    name: 'Summary',
    data: [
      [{ address: 'A1', value: 'Metric' }, { address: 'B1', value: 'Value' }],
      [{ address: 'A2', value: 'Total Revenue' }, { address: 'B2', value: 23500, formula: "='Sales Q1'!D5" }],
      [{ address: 'A3', value: 'Total Expenses' }, { address: 'B3', value: 25000, formula: "='Expenses Q1'!B5" }],
      [{ address: 'A4', value: 'Net Profit' }, { address: 'B4', value: -1500, formula: '=B2-B3' }],
    ]
  }
];

export const mockKnowledgeGraph: KnowledgeGraph = {
  nodes: [
    { id: 'spreadsheet', type: 'Spreadsheet', label: 'Q1_Report.xlsx', description: 'This spreadsheet provides a financial overview for the first quarter, including sales, expenses, and a summary of profitability.' },
    { id: 'sheet_sales', type: 'Sheet', label: 'Sales Q1', description: 'This sheet tracks the sales performance of different products in Q1, calculating total revenue per product and overall.' },
    { id: 'sheet_expenses', type: 'Sheet', label: 'Expenses Q1', description: 'This sheet categorizes and sums up all operational expenses for Q1.' },
    { id: 'sheet_summary', type: 'Sheet', label: 'Summary', description: 'This sheet consolidates data from the Sales and Expenses sheets to calculate the net profit for the quarter.' },
    { id: 'table_sales', type: 'Table', label: 'Sales Data (A1:D4)', description: 'A table containing product sales data.' },
    { id: 'formula_d5_sales', type: 'Formula', label: 'SUM(D2:D4)', description: 'Calculates the total revenue from all products.', formula: '=SUM(D2:D4)', address: 'D5' },
    { id: 'formula_b4_summary', type: 'Formula', label: 'B2-B3', description: 'Calculates the net profit by subtracting total expenses from total revenue.', formula: '=B2-B3', address: 'B4' },
    { id: 'cell_b2_summary', type: 'Cell', label: 'Total Revenue', description: 'Pulls the total revenue figure from the Sales Q1 sheet.', address: 'B2', value: 23500, formula: "='Sales Q1'!D5" },
    { id: 'analysis_profitability', type: 'Analysis', label: 'Profitability Analysis', description: 'The spreadsheet performs a basic profitability analysis by comparing revenues against expenses.' },
  ],
  links: [
    { id: 'l1', source: 'spreadsheet', target: 'sheet_sales', label: 'CONTAINS' },
    { id: 'l2', source: 'spreadsheet', target: 'sheet_expenses', label: 'CONTAINS' },
    { id: 'l3', source: 'spreadsheet', target: 'sheet_summary', label: 'CONTAINS' },
    { id: 'l4', source: 'sheet_sales', target: 'table_sales', label: 'CONTAINS' },
    { id: 'l5', source: 'sheet_sales', target: 'formula_d5_sales', label: 'CONTAINS' },
    { id: 'l6', source: 'sheet_summary', target: 'formula_b4_summary', label: 'CONTAINS' },
    { id: 'l7', source: 'sheet_summary', target: 'cell_b2_summary', label: 'CONTAINS' },
    { id: 'l8', source: 'cell_b2_summary', target: 'formula_d5_sales', label: 'REFERENCES' },
    { id: 'l9', source: 'spreadsheet', target: 'analysis_profitability', label: 'PERFORMS' },
  ],
};