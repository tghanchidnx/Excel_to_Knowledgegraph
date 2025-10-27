import { KnowledgeGraph, SheetData } from './types';

/**
 * Triggers a file download in the browser.
 * @param content The content of the file.
 * @param fileName The desired name for the downloaded file.
 * @param contentType The MIME type of the file.
 */
export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

// A simple recursive converter for JSON to a readable YAML-like format.
const toYaml = (obj: any, depth = 0): string => {
  const indent = '  '.repeat(depth);
  if (obj === null) return 'null';
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '\n' + obj.map(item => {
      const value = toYaml(item, depth + 1);
      if (typeof item === 'object' && item !== null) {
        const lines = value.trim().split('\n');
        const firstLine = lines.shift() || '';
        const restLines = lines.map(l => `${'  '.repeat(depth + 1)}${l}`).join('\n');
        return `${indent}- ${firstLine}${restLines ? '\n' + restLines : ''}`;
      } else {
        return `${indent}- ${value}`;
      }
    }).join('\n');
  }

  if (Object.keys(obj).length === 0) return '{}';
  return '\n' + Object.entries(obj).map(([key, value]) => {
    const valueStr = toYaml(value, depth + 1);
    if (typeof value === 'object' && value !== null) {
      return `${indent}${key}:${valueStr}`;
    }
    return `${indent}${key}: ${valueStr}`;
  }).join('\n');
};

/**
 * Converts an object containing analysis data into a YAML formatted string.
 * @param data The object containing graph and sheets to convert.
 * @returns A string representing the data in YAML format.
 */
// Fix: The function was incorrectly typed to only accept a KnowledgeGraph, causing an error when passing an object with both a graph and sheet data. The type has been updated to reflect the actual usage.
export const jsonToYaml = (data: { graph: KnowledgeGraph; sheets: SheetData[] }): string => {
  return toYaml(data).trim();
};
