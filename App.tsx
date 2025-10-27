import React, { useState, useCallback, useEffect } from 'react';
import { AppView, KnowledgeGraph, Node, SheetData, Link } from './types';
import Header from './components/Header';
import UploadView from './components/UploadView';
import InteractiveGridView from './components/InteractiveGridView';
import GraphView from './components/GraphView';
import DocumentationView from './components/DocumentationView';
import QueryConsole from './components/QueryConsole';
import { EditIcon, XCircleIcon, CheckCircleIcon } from './components/icons';
import { downloadFile, jsonToYaml } from './utils';
import { useHistoryState } from './hooks/useHistoryState';
import { logger } from './services/loggingService';

const PropertiesPanel: React.FC<{
  selectedItem: Node | Link | null;
  graph: KnowledgeGraph;
  updateGraph: (graph: KnowledgeGraph) => void;
  onClose: () => void;
}> = ({ selectedItem, graph, updateGraph, onClose }) => {
    const [editableItem, setEditableItem] = useState<Node | Link | null>(null);

    useEffect(() => {
        setEditableItem(selectedItem ? {...selectedItem} : null);
    }, [selectedItem]);

    if (!editableItem) return null;

    const handleSave = () => {
        const newGraph = JSON.parse(JSON.stringify(graph));
        if ('type' in editableItem) { // It's a Node
            const nodeIndex = newGraph.nodes.findIndex((n: Node) => n.id === editableItem.id);
            if (nodeIndex > -1) newGraph.nodes[nodeIndex] = editableItem;
        } else { // It's a Link
            const linkIndex = newGraph.links.findIndex((l: Link) => l.id === editableItem.id);
            if (linkIndex > -1) newGraph.links[linkIndex] = editableItem;
        }
        updateGraph(newGraph);
        onClose();
    };

    const isNode = 'type' in editableItem;

    return (
        <div className="w-96 bg-secondary/50 border-l border-secondary flex-shrink-0 p-4 flex flex-col animate-slide-in-left">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><EditIcon className="w-5 h-5 text-accent" /> Properties</h3>
                <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-text-secondary hover:text-text-primary"/></button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                <div className="space-y-4 text-sm">
                    <div>
                        <label className="block text-text-secondary font-semibold mb-1">Label</label>
                        <input type="text" value={editableItem.label} onChange={e => setEditableItem({...editableItem, label: e.target.value})} className="w-full bg-primary p-2 rounded border border-secondary focus:ring-1 focus:ring-accent focus:outline-none"/>
                    </div>
                    {isNode && (
                        <>
                            <div>
                                <label className="block text-text-secondary font-semibold mb-1">Type</label>
                                <p className="bg-primary p-2 rounded">{editableItem.type}</p>
                            </div>
                            <div>
                                <label className="block text-text-secondary font-semibold mb-1">Description</label>
                                <textarea value={(editableItem as Node).description || ''} onChange={e => setEditableItem({...editableItem, description: e.target.value})} rows={4} className="w-full bg-primary p-2 rounded border border-secondary focus:ring-1 focus:ring-accent focus:outline-none resize-none"/>
                            </div>
                             <div>
                                <label className="block text-text-secondary font-semibold mb-1">ID</label>
                                <p className="bg-primary p-2 rounded font-mono text-xs">{editableItem.id}</p>
                            </div>
                        </>
                    )}
                    {!isNode && (
                        <>
                             <div>
                                <label className="block text-text-secondary font-semibold mb-1">Source</label>
                                <p className="bg-primary p-2 rounded">{graph.nodes.find(n => n.id === editableItem.source)?.label}</p>
                            </div>
                             <div>
                                <label className="block text-text-secondary font-semibold mb-1">Target</label>
                                <p className="bg-primary p-2 rounded">{graph.nodes.find(n => n.id === editableItem.target)?.label}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
             <button onClick={handleSave} className="mt-4 bg-accent text-primary font-bold py-2 px-4 rounded-md w-full hover:bg-sky-400 flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-5 h-5"/> Save Changes
            </button>
        </div>
    );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.UPLOAD);
  const [
    knowledgeGraph,
    setKnowledgeGraph,
    undoGraphChange,
    redoGraphChange,
    canUndoGraph,
    canRedoGraph,
    resetKnowledgeGraph
  ] = useHistoryState<KnowledgeGraph | null>(null);
  const [sheetData, setSheetData] = useState<SheetData[] | null>(null);
  const [consoleQuery, setConsoleQuery] = useState('MATCH (n) RETURN n.label, n.type, n.description LIMIT 5;');
  const [selectedItem, setSelectedItem] = useState<Node | Link | null>(null);

  useEffect(() => {
    logger.log("Application initialized and ready.");
  }, []);

  const handleAnalysisComplete = (graph: KnowledgeGraph, sheets: SheetData[]) => {
    resetKnowledgeGraph(graph);
    setSheetData(sheets);
    logger.log("Analysis complete. Knowledge graph and sheet data loaded.");
  };

  const handleDownload = useCallback((format: 'excel' | 'json' | 'yaml') => {
    if (!knowledgeGraph || !sheetData) {
        logger.warn("Download attempted but no data is available.");
        return;
    }
    logger.log(`Downloading analysis data as ${format.toUpperCase()}`);
    switch (format) {
        case 'excel':
            const excelPlaceholder = "This is a placeholder for the demo Excel file. In a real application, the original uploaded .xlsx file would be downloaded here.";
            downloadFile(excelPlaceholder, 'Q1_Report_placeholder.txt', 'text/plain');
            break;
        case 'json':
            const analysisData = {
                graph: knowledgeGraph,
                sheets: sheetData,
            };
            const jsonContent = JSON.stringify(analysisData, null, 2);
            downloadFile(jsonContent, 'analysis_data.json', 'application/json');
            break;
        case 'yaml':
            const yamlContent = jsonToYaml({ graph: knowledgeGraph, sheets: sheetData });
            downloadFile(yamlContent, 'analysis_data.yaml', 'application/x-yaml');
            break;
    }
  }, [knowledgeGraph, sheetData]);

  const handleNodeClick = useCallback((node: Node) => {
    const query = `MATCH (n {id: '${node.id}'})-[r]-(m) RETURN n.label as Source, type(r) as Relationship, m.label as Target;`;
    setConsoleQuery(query);
    setSelectedItem(node);
    logger.log(`Selected node '${node.label}' (${node.id}). Set query to find its relationships.`);
  }, []);
  
  const handleLinkClick = useCallback((link: Link) => {
    setSelectedItem(link);
     logger.log(`Selected link '${link.label}' from '${link.source}' to '${link.target}'.`);
  }, []);

  const handleCreateLink = useCallback((sourceId: string, targetId: string) => {
    setKnowledgeGraph(currentGraph => {
      if (!currentGraph) return null;

      const newLink: Link = {
        id: `link_${sourceId}_${targetId}_${Date.now()}`,
        source: sourceId,
        target: targetId,
        label: 'RELATED_TO'
      };
  
      const newGraph: KnowledgeGraph = {
        ...currentGraph,
        links: [...currentGraph.links, newLink]
      };
      
      setSelectedItem(newLink); // Select the new link to edit its properties
      return newGraph;
    });
  }, [setKnowledgeGraph]);

  const handleRenameNode = useCallback((nodeId: string, newLabel: string) => {
    setKnowledgeGraph(currentGraph => {
        if (!currentGraph) return null;
        const newNodes = currentGraph.nodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, label: newLabel };
            }
            return n;
        });
        return { ...currentGraph, nodes: newNodes };
    });
  }, [setKnowledgeGraph]);


  const renderActiveView = () => {
    switch (activeView) {
      case AppView.UPLOAD:
        return <UploadView onAnalysisComplete={handleAnalysisComplete} setActiveView={setActiveView} />;
      case AppView.GRID:
        return sheetData && knowledgeGraph ? <InteractiveGridView initialSheets={sheetData} graph={knowledgeGraph} updateGraph={setKnowledgeGraph} /> : <p>Loading Grid View...</p>;
      case AppView.GRAPH:
        return knowledgeGraph ? (
            <div className="h-full flex">
                <div className="flex-grow h-full p-4">
                    <GraphView 
                        graph={knowledgeGraph} 
                        onNodeClick={handleNodeClick}
                        onLinkClick={handleLinkClick}
                        onCanvasClick={() => setSelectedItem(null)}
                        selectedId={selectedItem?.id}
                        onCreateLink={handleCreateLink}
                        onRenameNode={handleRenameNode}
                    />
                </div>
                {selectedItem && (
                    <PropertiesPanel
                        selectedItem={selectedItem}
                        graph={knowledgeGraph}
                        updateGraph={setKnowledgeGraph}
                        onClose={() => setSelectedItem(null)}
                    />
                )}
            </div>
        ) : <p>Loading Graph View...</p>;
      case AppView.DOCS:
        return <DocumentationView />;
      default:
        return <UploadView onAnalysisComplete={handleAnalysisComplete} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-primary text-text-primary">
      <Header 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isAnalyzed={!!knowledgeGraph}
        onDownload={handleDownload}
        onUndo={undoGraphChange}
        onRedo={redoGraphChange}
        canUndo={canUndoGraph}
        canRedo={canRedoGraph}
      />
      <main className="flex-grow overflow-hidden relative">
        {renderActiveView()}
      </main>
      <QueryConsole 
        isAnalyzed={!!knowledgeGraph}
        graph={knowledgeGraph} 
        queryText={consoleQuery} 
        setQueryText={setConsoleQuery} 
       />
    </div>
  );
};

export default App;