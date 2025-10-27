// services/pythonService.ts

import { SheetData, CellData } from '../types';

/**
 * Converts a column letter (e.g., 'A', 'B') to its zero-based index.
 * @param letter The column letter.
 * @returns The column index.
 */
const columnLetterToIndex = (letter: string): number => {
  return letter.toUpperCase().charCodeAt(0) - 65;
};

/**
 * Sorts sheet data by a specific column.
 * @param sheet The sheet data to sort.
 * @param columnIndex The index of the column to sort by.
 * @param direction The sort direction ('asc' or 'desc').
 * @returns A new, sorted SheetData object.
 */
export const sortData = (sheet: SheetData, columnIndex: number, direction: 'asc' | 'desc'): SheetData => {
  const newSheet: SheetData = JSON.parse(JSON.stringify(sheet));
  const header = newSheet.data.shift();
  if (!header) return newSheet;

  newSheet.data.sort((a, b) => {
    const valA = a[columnIndex]?.value;
    const valB = b[columnIndex]?.value;

    const factor = direction === 'asc' ? 1 : -1;

    if (valA === null || valA === undefined) return 1 * factor;
    if (valB === null || valB === undefined) return -1 * factor;
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * factor;
    }
    
    if (String(valA) < String(valB)) return -1 * factor;
    if (String(valA) > String(valB)) return 1 * factor;
    return 0;
  });

  newSheet.data.unshift(header);
  return newSheet;
};

/**
 * Filters sheet data based on a condition.
 * @param sheet The sheet data to filter.
 * @param columnIndex The index of the column to filter on.
 * @param operator The comparison operator.
 * @param value The value to compare against.
 * @returns A new, filtered SheetData object.
 */
export const filterData = (sheet: SheetData, columnIndex: number, operator: string, value: string): SheetData => {
    const newSheet: SheetData = JSON.parse(JSON.stringify(sheet));
    const header = newSheet.data.shift();
    if (!header) return newSheet;

    const filterValueNum = !isNaN(Number(value)) ? Number(value) : null;

    const filteredData = newSheet.data.filter(row => {
        const cellValue = row[columnIndex]?.value;
        if (cellValue === null || cellValue === undefined) return false;

        const cellValueNum = typeof cellValue === 'number' ? cellValue : null;

        switch(operator) {
            case '==': return filterValueNum !== null && cellValueNum !== null ? cellValueNum === filterValueNum : String(cellValue) === value;
            case '!=': return filterValueNum !== null && cellValueNum !== null ? cellValueNum !== filterValueNum : String(cellValue) !== value;
            case '>': return filterValueNum !== null && cellValueNum !== null ? cellValueNum > filterValueNum : false;
            case '<': return filterValueNum !== null && cellValueNum !== null ? cellValueNum < filterValueNum : false;
            case '>=': return filterValueNum !== null && cellValueNum !== null ? cellValueNum >= filterValueNum : false;
            case '<=': return filterValueNum !== null && cellValueNum !== null ? cellValueNum <= filterValueNum : false;
            case 'contains': return String(cellValue).toLowerCase().includes(value.toLowerCase());
            default: return false;
        }
    });

    newSheet.data = filteredData;
    newSheet.data.unshift(header);
    return newSheet;
}

/**
 * Creates a pivot table from sheet data.
 * @param sheet The source sheet data.
 * @param indexColumnIndex The column to use for rows/grouping.
 * @param valueColumnIndex The column to aggregate.
 * @param aggregation The aggregation method ('sum', 'average', 'count').
 * @returns A new SheetData object representing the pivot table.
 */
export const createPivotTable = (sheet: SheetData, indexColumnIndex: number, valueColumnIndex: number, aggregation: 'sum' | 'average' | 'count'): SheetData => {
    const header = sheet.data[0];
    const dataRows = sheet.data.slice(1);

    const pivot: { [key: string]: { sum: number, count: number } } = {};

    dataRows.forEach(row => {
        const indexKey = row[indexColumnIndex]?.value;
        const value = row[valueColumnIndex]?.value;
        if (indexKey !== null && indexKey !== undefined && typeof value === 'number') {
            const key = String(indexKey);
            if (!pivot[key]) {
                pivot[key] = { sum: 0, count: 0 };
            }
            pivot[key].sum += value;
            pivot[key].count += 1;
        }
    });

    const indexHeader = header[indexColumnIndex]?.value || 'Category';
    let valueHeader = '';
    switch(aggregation) {
        case 'sum': valueHeader = `SUM of ${header[valueColumnIndex]?.value}`; break;
        case 'average': valueHeader = `AVERAGE of ${header[valueColumnIndex]?.value}`; break;
        case 'count': valueHeader = `COUNT of ${header[valueColumnIndex]?.value}`; break;
    }

    const pivotData: CellData[][] = [[
        { address: 'A1', value: indexHeader },
        { address: 'B1', value: valueHeader }
    ]];

    Object.entries(pivot).forEach(([key, values], i) => {
        let aggValue: number | null = null;
         switch(aggregation) {
            case 'sum': aggValue = values.sum; break;
            case 'average': aggValue = values.count > 0 ? values.sum / values.count : 0; break;
            case 'count': aggValue = values.count; break;
        }
        pivotData.push([
            { address: `A${i+2}`, value: key },
            { address: `B${i+2}`, value: aggValue }
        ]);
    });

    return {
        name: `Pivot of ${sheet.name}`,
        data: pivotData,
    };
};
