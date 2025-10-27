import React, { useState, useEffect } from 'react';
import { BotIcon, TerminalIcon, LoaderIcon, ChevronUpIcon, ChevronDownIcon, FileTextIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, Trash2Icon } from './icons';
import { convertNlToCypher } from '../services/geminiService';
import { KnowledgeGraph } from '../types';
import { logger, LogEntry } from '../services/loggingService';

interface QueryConsoleProps {
  isAnalyzed: boolean;
  graph: KnowledgeGraph | null;
  queryText: string;
  setQueryText: (text: string) => void;
}

type ConsoleTab = 'cypher' | 'natural_language' | 'log';

const QueryConsole: React.FC<QueryConsoleProps> = ({ isAnalyzed, graph, queryText, setQueryText }) => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('log');
  const [nlQuery, setNlQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Subscribe to logger updates
    const unsubscribe = logger.subscribe(setLogs);
    // Switch to log tab if analysis is not yet complete
    if (!isAnalyzed) {
      setActiveTab('log');
    }
    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [isAnalyzed]);

  const recommendations = [
    "Show me all the sheets",
    "Which cells have formulas?",
    "How is the Summary sheet connected to others?",
    "List all high-level analyses"
  ];

  const handleNlSubmit = async () => {
    if (!nlQuery) return;
    setIsLoading(true);
    setResults(null);
    try {
      const cypher = await convertNlToCypher(nlQuery);
      setQueryText(cypher);
      setActiveTab('cypher');
    } catch (error) {
      logger.error('Failed to convert Natural Language to Cypher.', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCypherSubmit = () => {
    if (!graph) return;
    logger.log(`Executing Cypher query: ${queryText}`);
    try {
        // This is a mock query runner. A real implementation would use a library like `cypher-js`.
        const query = queryText.toLowerCase();
        let res: any[] = [];
        if (query.includes("match (s:sheet)")) {
            res = graph.nodes.filter(n => n.type === 'Sheet').map(n => ({ 's.label': n.label, 's.description': n.description }));
        } else if (query.includes("match (f:formula)")) {
            res = graph.nodes.filter(n => n.type === 'Formula').map(n => ({ 'f.label': n.label, 'f.description': n.description, 'f.formula': n.formula }));
        } else if (query.includes("match (a)-[r]->(b)")) {
            res = graph.links.slice(0, 10).map(l => {
                const source = graph.nodes.find(n => n.id === l.source);
                const target = graph.nodes.find(n => n.id === l.target);
                return { 'a.label': source?.label, relationship: l.label, 'b.label': target?.label };
            });
        } else {
            res = graph.nodes.slice(0,5).map(n => ({ 'n.label': n.label, 'n.type': n.type, 'n.description': n.description?.substring(0, 50) + '...' }));
        }
        setResults(res);
        logger.log(`Query successful, returned ${res.length} results.`);
    } catch (e) {
        logger.error('Cypher query execution failed', e);
        setResults([]);
    }
  };
  
  const renderResults = () => {
    if(!results) return <div className="text-text-secondary">Run a query to see results.</div>
    if(results.length === 0) return <div className="text-text-secondary">Query returned no results.</div>

    const headers = Object.keys(results[0]);
    return (
        <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50">
                <tr>{headers.map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
                {results.map((row, i) => (
                    <tr key={i} className="border-b border-secondary">
                        {headers.map(h => <td key={h} className="p-2 align-top">{String(row[h] ?? '')}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
  };
  
  const renderLogs = () => {
    const levelStyles = {
        info: 'text-sky-400',
        warn: 'text-amber-400',
        error: 'text-red-400',
    };
    const LevelIcons = {
        info: <InfoIcon className="w-4 h-4 mr-2 flex-shrink-0" />,
        warn: <AlertTriangleIcon className="w-4 h-4 mr-2 flex-shrink-0" />,
        error: <XCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />,
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 flex justify-between items-center mb-2">
                <h3 className="font-bold">Application Log</h3>
                <button onClick={() => logger.clear()} title="Clear Log" className="p-1 text-text-secondary hover:text-red-400 rounded-md flex items-center gap-1 text-xs">
                    <Trash2Icon className="w-4 h-4" /> Clear
                </button>
            </div>
            <div className="flex-grow overflow-y-auto bg-primary rounded p-2 font-mono text-xs border border-secondary/50">
                {logs.length === 0 ? (
                    <div className="text-text-secondary/50">No log messages yet.</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`flex items-start ${levelStyles[log.level]}`}>
                            <span className="text-text-secondary/50 mr-2 flex-shrink-0">{log.timestamp}</span>
                            {LevelIcons[log.level]}
                            <span className="whitespace-pre-wrap break-words">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-secondary/80 backdrop-blur-md border-t border-secondary z-50 transition-all duration-300 ease-in-out ${isMinimized ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'}`}>
      <button onClick={() => setIsMinimized(!isMinimized)} className="absolute -top-8 right-10 bg-secondary px-4 py-1 rounded-t-lg flex items-center gap-2 text-text-secondary hover:text-text-primary">
        {isMinimized ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
        Query Console
      </button>
      <div className="flex items-center px-4 py-2 border-b border-secondary/50">
        <div className="flex gap-2">
            {[
                {id: 'log', icon: <FileTextIcon className="w-4 h-4"/>, label: 'Log', disabled: false},
                {id: 'cypher', icon: <TerminalIcon className="w-4 h-4"/>, label: 'Cypher', disabled: !isAnalyzed},
                {id: 'natural_language', icon: <BotIcon className="w-4 h-4"/>, label: 'Natural Language', disabled: !isAnalyzed},
            ].map(tab => (
                 <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as ConsoleTab)}
                    disabled={tab.disabled} 
                    className={`flex items-center gap-2 px-3 py-1 text-sm rounded ${activeTab === tab.id ? 'bg-accent text-primary' : 'hover:bg-primary/50'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>
      </div>

      {activeTab === 'log' && (
          <div className="h-[40vh] p-4">
            {renderLogs()}
          </div>
      )}

      {(activeTab === 'cypher' || activeTab === 'natural_language') && (
        <div className="grid grid-cols-1 md:grid-cols-2 h-[40vh] divide-x divide-secondary/50">
          <div className="flex flex-col p-4">
              {activeTab === 'cypher' ? (
                  <>
                      <textarea value={queryText} onChange={e => setQueryText(e.target.value)} className="w-full flex-grow bg-primary p-2 rounded-md font-mono text-sm border border-secondary/50 resize-none focus:ring-1 focus:ring-accent focus:outline-none" placeholder="MATCH (n) RETURN n LIMIT 10" />
                      <button onClick={handleCypherSubmit} className="mt-2 bg-accent text-primary font-bold py-2 px-4 rounded-md w-full hover:bg-sky-400">Run Query</button>
                  </>
              ) : (
                  <>
                      <textarea value={nlQuery} onChange={e => setNlQuery(e.target.value)} className="w-full flex-grow bg-primary p-2 rounded-md text-sm border border-secondary/50 resize-none focus:ring-1 focus:ring-accent focus:outline-none" placeholder="What is this spreadsheet about?" />
                      <div className="text-xs text-text-secondary my-2">Query Recommendations:</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                          {recommendations.map(r => <button key={r} onClick={() => setNlQuery(r)} className="text-xs bg-primary px-2 py-1 rounded hover:bg-highlight/50">{r}</button>)}
                      </div>
                      <button onClick={handleNlSubmit} disabled={isLoading} className="mt-2 bg-highlight text-text-primary font-bold py-2 px-4 rounded-md w-full hover:bg-indigo-500 flex items-center justify-center gap-2">
                          {isLoading ? <><LoaderIcon className="w-5 h-5"/> Converting...</> : 'Convert to Cypher'}
                      </button>
                  </>
              )}
          </div>
          <div className="p-4 overflow-auto">
              <h3 className="font-bold mb-2">Results</h3>
              {renderResults()}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryConsole;
