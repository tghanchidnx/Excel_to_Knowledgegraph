import React, { useState, useRef, useEffect } from 'react';
import { KnowledgeGraph, SheetData, AppView, AnalysisConfig, AnalysisDepth } from '../types';
import { UploadCloudIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, FileTextIcon, SettingsIcon, ChevronDownIcon } from './icons';
import { generateCacheKey, getCachedAnalysis, setCachedAnalysis } from '../services/cacheService';
import { parseExcelFile } from '../services/excelParser';
import { logger } from '../services/loggingService';

// --- SUB-COMPONENTS for a cleaner, more modular structure ---

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  setAnalysisError: (error: string | null) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, setAnalysisError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileName = file.name.toLowerCase();
      if (allowedExtensions.some(ext => fileName.endsWith(ext))) {
          onFileSelect(file);
      } else {
          const errorMsg = 'Invalid file type. Please upload a .xlsx or .xls file.';
          setAnalysisError(errorMsg);
          logger.warn(errorMsg);
      }
    }
  };

  const handleDragEvents = (e: React.DragEvent, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div 
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative w-full max-w-2xl text-center p-8 transition-all duration-300 rounded-2xl ${isDragging ? 'bg-accent/10 scale-105' : 'bg-secondary/30'}`}
    >
      <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => handleFileChange(e.target.files)}
          accept=".xlsx, .xls" 
          className="hidden" 
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <FileTextIcon className="w-20 h-20 text-text-secondary/50" />
        <p className="text-xl text-text-secondary">Drag & drop your Excel file here</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-accent text-primary font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105"
        >
          Select From Computer
        </button>
      </div>
    </div>
  );
};

interface FilePreviewProps {
  file: File;
  onClear: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClear }) => (
  <div className="w-full bg-secondary/50 p-4 rounded-lg flex items-center justify-between animate-fade-in">
    <div className="flex items-center gap-3">
        <FileTextIcon className="w-8 h-8 text-accent"/>
        <div>
            <p className="font-semibold">{file.name}</p>
            <p className="text-xs text-text-secondary">{(file.size / 1024).toFixed(2)} KB</p>
        </div>
    </div>
    <button onClick={onClear} className="p-2 rounded-full hover:bg-secondary">
        <XCircleIcon className="w-6 h-6 text-text-secondary hover:text-red-400"/>
    </button>
  </div>
);

interface AnalysisConfigurationProps {
  config: AnalysisConfig;
  setConfig: React.Dispatch<React.SetStateAction<AnalysisConfig>>;
}

const AnalysisConfiguration: React.FC<AnalysisConfigurationProps> = ({ config, setConfig }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const Toggle: React.FC<{label: string, enabled: boolean, onChange: (enabled: boolean) => void}> = ({ label, enabled, onChange }) => (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-text-secondary">{label}</span>
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={enabled} onChange={e => onChange(e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full transition ${enabled ? 'bg-accent' : 'bg-primary'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${enabled ? 'transform translate-x-6' : ''}`}></div>
            </div>
        </label>
    );

    return (
        <div className="w-full bg-secondary/50 rounded-lg animate-fade-in-up">
            <button onClick={() => setIsOpen(p => !p)} className="w-full p-4 flex justify-between items-center text-left">
                <div className="flex items-center gap-3">
                    <SettingsIcon className="w-6 h-6 text-text-secondary"/>
                    <h3 className="font-semibold">Analysis Options</h3>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-secondary space-y-4">
                    <div>
                        <span className="block text-text-secondary mb-2">Analysis Depth</span>
                        <div className="flex rounded-md bg-primary">
                            <button onClick={() => setConfig(c => ({...c, analysisDepth: 'quick'}))} className={`flex-1 p-2 rounded-l-md text-sm ${config.analysisDepth === 'quick' ? 'bg-accent text-primary' : ''}`}>Quick Summary</button>
                            <button onClick={() => setConfig(c => ({...c, analysisDepth: 'deep'}))} className={`flex-1 p-2 rounded-r-md text-sm ${config.analysisDepth === 'deep' ? 'bg-accent text-primary' : ''}`}>Deep Dive</button>
                        </div>
                    </div>
                    <Toggle label="Use Cached Results" enabled={config.useCache} onChange={v => setConfig(c => ({...c, useCache: v}))} />
                    <Toggle label="Show Detailed Log" enabled={config.isDetailedLog} onChange={v => setConfig(c => ({...c, isDetailedLog: v}))} />
                </div>
            )}
        </div>
    );
};


// Fix: Removed duplicate declaration of AnalysisProgressModal. The full implementation is at the end of the file.
// --- Types for Analysis Progress Modal ---
type LogLevel = 'info' | 'detail';
interface LogEntry { message: string; timestamp: string; level: LogLevel; }

// --- MAIN UPLOAD VIEW COMPONENT ---

interface UploadViewProps {
  onAnalysisComplete: (graph: KnowledgeGraph, sheets: SheetData[]) => void;
  setActiveView: (view: AppView) => void;
}

const UploadView: React.FC<UploadViewProps> = ({ onAnalysisComplete, setActiveView }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState<AnalysisConfig>({
      analysisDepth: 'deep',
      useCache: true,
      isDetailedLog: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const metadataInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        logger.warn('Analysis worker terminated due to component unmount.');
      }
    };
  }, []);

  const onProgressUpdate = (message: string, level: LogLevel = 'info') => {
    logger.log(message);
    if (level === 'detail' && !config.isDetailedLog) return;
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, timestamp, level }]);
  };

  const startAnalysisProcess = () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setLogs([]);
    setIsSuccess(false);
  };
  
  const handleFileSelect = (file: File) => {
    setAnalysisError(null);
    setSelectedFile(file);
    logger.log(`File selected: ${file.name}`);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    startAnalysisProcess();
    onProgressUpdate(`Starting analysis for ${selectedFile.name}...`, 'info');
    try {
        const actualSheetData = await parseExcelFile(selectedFile);
        onProgressUpdate(`File parsed: ${actualSheetData.length} sheets found.`);

        const cacheKey = config.useCache ? await generateCacheKey(actualSheetData) : null;
        const cachedAnalysis = cacheKey ? getCachedAnalysis(cacheKey) : null;
        
        if (cachedAnalysis) {
            onProgressUpdate("✅ Success! Found cached knowledge graph.", 'info');
            onAnalysisComplete(cachedAnalysis.graph, cachedAnalysis.sheets);
            setIsSuccess(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setActiveView(AppView.GRID);
            }, 1500);
        } else {
            onProgressUpdate("Starting new AI analysis via Web Worker...", 'info');
            if (workerRef.current) workerRef.current.terminate();
            const worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'PROGRESS') {
                    onProgressUpdate(payload.message, payload.level);
                } else if (type === 'RESULT') {
                    const graph = payload as KnowledgeGraph;
                    if(cacheKey) setCachedAnalysis(cacheKey, graph, actualSheetData);
                    onAnalysisComplete(graph, actualSheetData);
                    setIsSuccess(true);
                    setTimeout(() => {
                        setIsAnalyzing(false);
                        setActiveView(AppView.GRID);
                    }, 1500);
                    worker.terminate();
                    workerRef.current = null;
                } else if (type === 'ERROR') {
                    onProgressUpdate(`Error: ${payload}`, 'info');
                    setAnalysisError(payload);
                    worker.terminate();
                    workerRef.current = null;
                }
            };
            
            worker.postMessage({ type: 'ANALYZE', payload: { sheets: actualSheetData, config } });
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        onProgressUpdate(`Error: ${errorMessage}`, 'info');
        setAnalysisError(errorMessage);
    }
  };

  const handleMetadataFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    startAnalysisProcess();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (!parsedData.graph || !parsedData.sheets) throw new Error("Invalid analysis file format.");
        onProgressUpdate("Analysis data loaded successfully.", 'info');
        onAnalysisComplete(parsedData.graph, parsedData.sheets);
        setIsSuccess(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            setActiveView(AppView.GRID);
        }, 1000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid JSON file.";
        onProgressUpdate(`Error: ${msg}`, 'info');
        setAnalysisError(msg);
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-primary">
      <div className="w-full max-w-lg space-y-6">
        {!selectedFile ? (
          <DropZone onFileSelect={handleFileSelect} setAnalysisError={setAnalysisError} />
        ) : (
          <>
            <FilePreview file={selectedFile} onClear={() => setSelectedFile(null)} />
            <AnalysisConfiguration config={config} setConfig={setConfig} />
            <button 
              onClick={handleStartAnalysis}
              className="w-full bg-accent text-primary font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              Analyze File
            </button>
          </>
        )}

        {analysisError && !isAnalyzing && (
            <div className="p-3 bg-red-900/50 text-red-300 rounded-lg text-sm text-left animate-fade-in">
                <strong>Error:</strong> {analysisError}
            </div>
        )}
        
        <div className="pt-4">
            <input type="file" ref={metadataInputRef} onChange={handleMetadataFileChange} accept=".json" className="hidden" />
            <span className="text-sm text-text-secondary">Have existing analysis data? </span>
            <button
                onClick={() => metadataInputRef.current?.click()}
                className="text-accent text-sm font-medium hover:underline"
            >
                Load from .json file
            </button>
        </div>
      </div>
      
      {isAnalyzing && (
        <AnalysisProgressModal
            logs={logs}
            isSuccess={isSuccess}
            analysisError={analysisError}
            onClose={() => setIsAnalyzing(false)}
        />
      )}
    </div>
  );
};

// This is the single, correct implementation of the modal.
const AnalysisProgressModal: React.FC<{
    logs: LogEntry[];
    isSuccess: boolean;
    analysisError: string | null;
    onClose: () => void;
}> = ({ logs, isSuccess, analysisError, onClose }) => {
    const title = isSuccess ? 'Success!' : (analysisError ? 'Analysis Failed' : 'Analyzing Spreadsheet...');
    const message = isSuccess ? 'Redirecting to the interactive grid...' : 'Please review the logs below.';
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
            <div className="bg-secondary rounded-lg shadow-2xl w-full max-w-2xl border border-primary/50 p-6">
                <div className="flex items-center gap-3 text-lg font-medium mb-4">
                    {isSuccess ? <CheckCircleIcon className="w-8 h-8 text-green-400"/> : (analysisError ? <XCircleIcon className="w-8 h-8 text-red-400"/> : <LoaderIcon className="w-8 h-8 text-accent"/>)}
                    <p>{title}</p>
                </div>
                
                <div ref={logContainerRef} className="w-full h-64 bg-primary/50 rounded-lg p-2 text-left overflow-y-auto text-xs font-mono border border-secondary scroll-smooth">
                    {logs.map((log, i) => (
                        <div key={i} className="flex">
                            <span className="text-text-secondary/50 mr-2 flex-shrink-0">{log.timestamp}</span>
                             {log.level === 'detail' && <span className="text-sky-400/70 font-bold mr-2 flex-shrink-0">[DETAIL]</span>}
                            <span className={`${log.message.startsWith('Error:') ? 'text-red-400' : ''} whitespace-pre-wrap`}>{log.message}</span>
                        </div>
                    ))}
                </div>

                {analysisError && (
                    <>
                        <p className="text-red-400 text-sm mt-4">Analysis failed. {analysisError}</p>
                        <button onClick={onClose} className="mt-4 bg-red-500 text-primary font-bold py-2 px-4 rounded-md w-full hover:bg-red-400">
                            Close
                        </button>
                    </>
                )}
                {isSuccess && (
                     <p className="text-green-400 text-sm mt-4">{message}</p>
                )}
            </div>
        </div>
    );
};


export default UploadView;