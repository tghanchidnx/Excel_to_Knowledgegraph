// services/excelParser.ts

import * as XLSX from 'xlsx';
import { SheetData, CellData } from '../types';
import { logger } from './loggingService';


export const parseExcelFile = (file: File): Promise<SheetData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) {
                    const error = new Error("Failed to read file.");
                    logger.error(error.message);
                    return reject(error);
                }
                
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                // Read the workbook with cellFormula: true to ensure formulas are captured
                const workbook = XLSX.read(data, { type: 'array', cellFormula: true });

                const sheets: SheetData[] = workbook.SheetNames.map(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // If a sheet is empty (no !ref), return a minimal valid grid to prevent downstream errors.
                    if (!worksheet || !worksheet['!ref']) {
                        return { name: sheetName, data: [[{ address: 'A1', value: '' }]] };
                    }

                    const sheetCellData: CellData[][] = [];
                    const range = XLSX.utils.decode_range(worksheet['!ref']);

                    // Iterate over rows in the range
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        const row: CellData[] = [];
                        // Iterate over columns in the range
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const address = XLSX.utils.encode_cell({ r: R, c: C });
                            const cell = worksheet[address]; // Get cell object from worksheet
                            
                            row.push({
                                address: address,
                                // Prefer formatted text ('w'), fall back to raw value ('v'), otherwise null
                                value: cell ? (cell.w ?? cell.v ?? null) : null,
                                formula: cell ? cell.f : undefined
                            });
                        }
                        sheetCellData.push(row);
                    }
                    
                    return { name: sheetName, data: sheetCellData };
                });

                resolve(sheets);
            } catch (error) {
                logger.error("Error parsing Excel file", error);
                const message = error instanceof Error ? error.message : "Unknown parsing error";
                reject(new Error(`The provided file appears to be corrupted or in an unsupported format. Details: ${message}`));
            }
        };

        reader.onerror = (error) => {
            const err = new Error("An error occurred while reading the file.");
            logger.error(err.message, error);
            reject(err);
        };

        reader.readAsArrayBuffer(file);
    });
};