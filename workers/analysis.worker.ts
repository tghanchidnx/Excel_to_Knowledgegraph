// workers/analysis.worker.ts
import { analyzeSpreadsheet } from '../services/geminiService';
import { SheetData, KnowledgeGraph, AnalysisConfig } from '../types';

// Define the structure of messages sent to and from the worker
interface WorkerMessagePayload {
    sheets: SheetData[];
    config: AnalysisConfig;
}

interface WorkerMessage {
    type: 'ANALYZE';
    payload: WorkerMessagePayload;
}

type LogLevel = 'info' | 'detail';

interface WorkerProgressPayload {
    message: string;
    level: LogLevel;
}

interface WorkerResponse {
    type: 'PROGRESS' | 'RESULT' | 'ERROR';
    payload: any;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    if (e.data.type === 'ANALYZE') {
        const { sheets, config } = e.data.payload;

        const onProgressUpdate = (message: string, level: LogLevel = 'info') => {
            self.postMessage({ type: 'PROGRESS', payload: { message, level } as WorkerProgressPayload });
        };

        try {
            const graph = await analyzeSpreadsheet(sheets, onProgressUpdate, config);
            self.postMessage({ type: 'RESULT', payload: graph } as WorkerResponse);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred in the worker.';
            self.postMessage({ type: 'ERROR', payload: errorMessage } as WorkerResponse);
        }
    }
};

// This export is needed to satisfy TypeScript's module system, even though it's a worker.
export {};