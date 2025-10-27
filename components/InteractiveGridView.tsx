
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SheetData, KnowledgeGraph, Node, NodeType, Link } from '../types';
import { PlusIcon, SortAscIcon, FilterIcon, PivotIcon, RotateCcwIcon, XCircleIcon } from './icons';
import * as pythonService from '../services/pythonService';

// Helper to get consistent colors for tags
const getTagColor = (tagName: string) => {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 80%)`;
  const textColor = `hsl(${hash % 360}, 70%, 20%)`;
  return { backgroundColor: color, color: textColor };
};

const TagEditorPopover: React.FC<{
    anchorEl: HTMLElement;
    node: Node;
    allTags: string[];
    onSave: (nodeId: string, tags: string[]) => void;
    onClose: () => void;
}> = ({ anchorEl, node, allTags, onSave, onClose }) => {
    const [tags, setTags] = useState(node.tags || []);
    const [inputValue, setInputValue] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as globalThis.Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const addTag = (tag: string) => {
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setInputValue('');
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue.trim());
        }
    };

    const rect = anchorEl.getBoundingClientRect();
    const style = {
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX}px`,
    };

    const filteredSuggestions = allTags.filter(t => !tags.includes(t) && t.toLowerCase().includes(inputValue.toLowerCase()));

    return (
        <div ref={popoverRef} style={style} className="fixed bg-secondary rounded-lg shadow-2xl w-72 z-50 border border-secondary/50 text-sm animate-fade-in-up">
            <div className="p-3">
                <div className="flex flex-wrap gap-1 p-2 bg-primary rounded-md min-h-[40px] items-center">
                    {tags.map(tag => (
                        <span key={tag} style={getTagColor(tag)} className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="font-bold">×</button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a tag..."
                        className="bg-transparent flex-grow focus:outline-none p-1"
                        autoFocus
                    />
                </div>
                {(inputValue && !allTags.includes(inputValue.trim())) && (
                    <button onClick={() => addTag(inputValue.trim())} className="text-left w-full p-2 mt-1 rounded text-accent bg-primary/50 hover:bg-primary">
                        Create new tag: "{inputValue.trim()}"
                    </button>
                )}
                <div className="mt-1 max-h-32 overflow-y-auto">
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="text-left w-full p-2 rounded hover:bg-primary">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-primary/50 p-2 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1 rounded bg-secondary/50 hover:bg-secondary">Cancel</button>
                <button onClick={() => onSave(node.id, tags)} className="px-3 py-1 rounded bg-accent text-primary font-semibold hover:bg-sky-400">Save</button>
            </div>
        </div>
    );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-secondary rounded-lg shadow-2xl w-full max-w-md border border-secondary/50">
            <div className="p-4 flex justify-between items-center border-b border-primary">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-text-secondary hover:text-red-400"/></button>
            </div>
            <div className="p-4">{children}</div>
        </div>
    </div>
);


interface InteractiveGridViewProps {
  initialSheets: SheetData[];
  graph: KnowledgeGraph;
  updateGraph: (graph: KnowledgeGraph) => void;
}

const InteractiveGridView: React.FC<InteractiveGridViewProps> = ({ initialSheets, graph, updateGraph }) => {
  const [gridData, setGridData] = useState<SheetData[]>(initialSheets);
  const [activeSheet, setActiveSheet] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [tagEditor, setTagEditor] = useState<{ node: Node, anchorEl: HTMLElement } | null>(null);
  const [modal, setModal] = useState<'sort' | 'filter' | 'pivot' | null>(null);

  useEffect(() => {
    // Reset data and active sheet if initial sheets change
    setGridData(initialSheets);
    setActiveSheet(0);
  }, [initialSheets]);
  
  const currentSheet = gridData[activeSheet];
  const columns = currentSheet?.data[0]?.map((_, i) => ({
    label: String.fromCharCode(65 + i),
    value: i,
    name: currentSheet.data[0][i].value as string
  })) || [];

  const handleSort = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const columnIndex = parseInt(formData.get('column') as string, 10);
    const direction = formData.get('direction') as 'asc' | 'desc';
    const sortedSheet = pythonService.sortData(currentSheet, columnIndex, direction);
    const newGridData = [...gridData];
    newGridData[activeSheet] = sortedSheet;
    setGridData(newGridData);
    setModal(null);
  };
  
  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const columnIndex = parseInt(formData.get('column') as string, 10);
    const operator = formData.get('operator') as string;
    const value = formData.get('value') as string;
    const filteredSheet = pythonService.filterData(currentSheet, columnIndex, operator, value);
    const newGridData = [...gridData];
    newGridData[activeSheet] = filteredSheet;
    setGridData(newGridData);
    setModal(null);
  };
  
  const handlePivot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const indexColumnIndex = parseInt(formData.get('indexColumn') as string, 10);
    const valueColumnIndex = parseInt(formData.get('valueColumn') as string, 10);
    const aggregation = formData.get('aggregation') as 'sum' | 'average' | 'count';
    const pivotSheet = pythonService.createPivotTable(currentSheet, indexColumnIndex, valueColumnIndex, aggregation);
    setGridData([...gridData, pivotSheet]);
    setActiveSheet(gridData.length); // Switch to the new pivot sheet
    setModal(null);
  };

  const activeSheetName = currentSheet?.name;

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    graph.nodes.forEach(node => {
        if(node.type === 'Tag') tagSet.add(node.label)
    });
    return Array.from(tagSet);
  }, [graph]);

  const getNode = (type: NodeType, address: string, name: string): Node | undefined => {
    if (!name) return undefined;
    const id = `${type.toLowerCase()}_${name}_${address}`.replace(/\s/g, '_');
    return graph.nodes.find(n => n.id === id);
  };
  
  const handleOpenTagEditor = (e: React.MouseEvent, type: NodeType, address: string) => {
    e.stopPropagation();
    const sheetName = currentSheet.name;
    const id = `${type.toLowerCase()}_${sheetName}_${address}`.replace(/\s/g, '_');
    let node = graph.nodes.find(n => n.id === id);

    if (!node) {
        let label = '';
        if(type === 'Cell') label = `Cell ${address}`;
        else if(type === 'Row') label = `Row ${address}`;
        else if(type === 'Column') label = `Column ${address}`;
        else if(type === 'Sheet') label = sheetName;
        node = { id, type, label, address, tags: [] };
    }

    setTagEditor({ node, anchorEl: e.currentTarget as HTMLElement });
  }

  const handleSaveTags = (nodeId: string, newTags: string[]) => {
    const newGraph: KnowledgeGraph = JSON.parse(JSON.stringify(graph));
    let node = newGraph.nodes.find((n: Node) => n.id === nodeId);
    
    if (!node) {
        const originalNodeFromState = tagEditor!.node;
        node = { ...originalNodeFromState, tags: [] };
        newGraph.nodes.push(node);
    }

    const currentTags = node.tags || [];
    const tagsToAdd = newTags.filter(t => !currentTags.includes(t));
    const tagsToRemove = currentTags.filter(t => !newTags.includes(t));

    tagsToAdd.forEach(tagLabel => {
        const tagId = `tag_${tagLabel.toLowerCase().replace(/\s/g, '_')}`;
        let tagNode = newGraph.nodes.find((n: Node) => n.id === tagId);
        if (!tagNode) {
            tagNode = { id: tagId, type: 'Tag', label: tagLabel };
            newGraph.nodes.push(tagNode);
        }
        newGraph.links.push({
            id: `link_${nodeId}_${tagId}`,
            source: nodeId,
            target: tagId,
            label: 'HAS_TAG'
        });
    });

    tagsToRemove.forEach(tagLabel => {
        const tagId = `tag_${tagLabel.toLowerCase().replace(/\s/g, '_')}`;
        newGraph.links = newGraph.links.filter((l: Link) => !(l.source === nodeId && l.target === tagId));
    });

    node.tags = newTags;
    updateGraph(newGraph);
    setTagEditor(null);
  };
  
  if (!currentSheet) {
    return <div className="p-4">No sheet data available.</div>;
  }
  
  return (
    <div className="p-4 h-full flex flex-col relative">
        <div className="flex-shrink-0 mb-4 p-2 bg-secondary/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={() => setModal('sort')} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/50 text-text-secondary hover:bg-accent hover:text-primary"><SortAscIcon className="w-4 h-4" /> Sort</button>
                <button onClick={() => setModal('filter')} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/50 text-text-secondary hover:bg-accent hover:text-primary"><FilterIcon className="w-4 h-4" /> Filter</button>
                <button onClick={() => setModal('pivot')} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/50 text-text-secondary hover:bg-accent hover:text-primary"><PivotIcon className="w-4 h-4" /> Pivot Table</button>
            </div>
            <button onClick={() => setGridData(initialSheets)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-900/50 text-red-300 hover:bg-red-500 hover:text-text-primary"><RotateCcwIcon className="w-4 h-4"/> Reset Data</button>
        </div>
      <div className="flex-shrink-0 border-b border-secondary">
        <nav className="flex space-x-2">
          {gridData.map((sheet, index) => (
            <div key={sheet.name} className="relative group">
                <button
                onClick={() => setActiveSheet(index)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                    index === activeSheet
                    ? 'bg-secondary text-accent'
                    : 'text-text-secondary hover:bg-secondary/50'
                }`}
                >
                {sheet.name}
                </button>
                <button onClick={(e) => handleOpenTagEditor(e, 'Sheet', sheet.name)} className="absolute top-1/2 -right-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-primary/50 hover:bg-accent hover:text-primary">
                    <PlusIcon className="w-3 h-3"/>
                </button>
            </div>
          ))}
        </nav>
      </div>
      <div className="flex-grow overflow-auto bg-primary rounded-lg">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="p-2 border border-secondary/50 w-16 text-center font-mono text-text-secondary"></th>
              {currentSheet.data[0]?.map((_, colIndex) => {
                const colAddress = String.fromCharCode(65 + colIndex);
                const colNode = getNode('Column', colAddress, activeSheetName);
                return (
                    <th key={colIndex} className="p-2 border border-secondary/50 text-center font-mono text-text-secondary group relative">
                        {colAddress}
                        <button onClick={(e) => handleOpenTagEditor(e, 'Column', colAddress)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-primary/50 hover:bg-accent hover:text-primary">
                            <PlusIcon className="w-3 h-3"/>
                        </button>
                        <div className="flex gap-1 justify-center mt-1">
                            {colNode?.tags?.map(tag => <div key={tag} style={{backgroundColor: getTagColor(tag).backgroundColor}} className="w-2 h-2 rounded-full" title={tag}/>)}
                        </div>
                    </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {currentSheet.data.slice(1).map((row, rowIndex) => {
              const rowAddress = (rowIndex + 1).toString();
              const rowNode = getNode('Row', rowAddress, activeSheetName);
              return (
              <tr key={rowIndex}>
                <td className="p-2 border border-secondary/50 text-center font-mono bg-secondary text-text-secondary sticky left-0 group relative">
                    {rowAddress}
                    <button onClick={(e) => handleOpenTagEditor(e, 'Row', rowAddress)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-primary/50 hover:bg-accent hover:text-primary">
                        <PlusIcon className="w-3 h-3"/>
                    </button>
                     <div className="flex gap-1 justify-center mt-1">
                        {rowNode?.tags?.map(tag => <div key={tag} style={{backgroundColor: getTagColor(tag).backgroundColor}} className="w-2 h-2 rounded-full" title={tag}/>)}
                    </div>
                </td>
                {row.map((cell, colIndex) => {
                  const cellNode = getNode('Cell', cell.address, activeSheetName);
                  return (
                    <td
                      key={colIndex}
                      onMouseEnter={() => setHoveredCell(cell.address)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`relative p-1 border border-secondary/50 whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-150 group
                        ${hoveredCell === cell.address ? 'bg-highlight/20 ring-2 ring-highlight z-20' : ''}
                      `}
                    >
                        <div className="flex justify-between items-start h-full">
                            <span className={`${cell.formula ? 'text-accent font-mono' : ''} p-1`}>{cell.value}</span>
                            <button onClick={(e) => handleOpenTagEditor(e, 'Cell', cell.address)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-primary/50 hover:bg-accent hover:text-primary flex-shrink-0">
                                <PlusIcon className="w-4 h-4"/>
                            </button>
                        </div>
                        {cellNode?.tags && cellNode.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                                {cellNode.tags.map(tag => (
                                    <span key={tag} style={getTagColor(tag)} className="px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </td>
                  );
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      {tagEditor && (
        <TagEditorPopover 
            anchorEl={tagEditor.anchorEl}
            node={tagEditor.node}
            allTags={allTags}
            onSave={handleSaveTags}
            onClose={() => setTagEditor(null)}
        />
      )}
      {modal === 'sort' && <Modal title="Sort Data" onClose={() => setModal(null)}>
        <form onSubmit={handleSort} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Sort by Column</label><select name="column" className="w-full bg-primary p-2 rounded border border-secondary">{columns.map(c => <option key={c.value} value={c.value}>{c.label} ({c.name})</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Direction</label><select name="direction" className="w-full bg-primary p-2 rounded border border-secondary"><option value="asc">Ascending</option><option value="desc">Descending</option></select></div>
            <button type="submit" className="w-full bg-accent text-primary font-bold py-2 rounded">Apply Sort</button>
        </form>
      </Modal>}
      {modal === 'filter' && <Modal title="Filter Data" onClose={() => setModal(null)}>
        <form onSubmit={handleFilter} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Filter Column</label><select name="column" className="w-full bg-primary p-2 rounded border border-secondary">{columns.map(c => <option key={c.value} value={c.value}>{c.label} ({c.name})</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Operator</label><select name="operator" className="w-full bg-primary p-2 rounded border border-secondary"><option value="==">=</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="contains">contains</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Value</label><input type="text" name="value" required className="w-full bg-primary p-2 rounded border border-secondary"/></div>
            </div>
            <button type="submit" className="w-full bg-accent text-primary font-bold py-2 rounded">Apply Filter</button>
        </form>
      </Modal>}
      {modal === 'pivot' && <Modal title="Create Pivot Table" onClose={() => setModal(null)}>
        <form onSubmit={handlePivot} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Rows (Group by)</label><select name="indexColumn" className="w-full bg-primary p-2 rounded border border-secondary">{columns.map(c => <option key={c.value} value={c.value}>{c.label} ({c.name})</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Values (Aggregate)</label><select name="valueColumn" className="w-full bg-primary p-2 rounded border border-secondary">{columns.filter(c => currentSheet.data.slice(1).some(row => typeof row[c.value]?.value === 'number')).map(c => <option key={c.value} value={c.value}>{c.label} ({c.name})</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Aggregation</label><select name="aggregation" className="w-full bg-primary p-2 rounded border border-secondary"><option value="sum">Sum</option><option value="average">Average</option><option value="count">Count</option></select></div>
            <button type="submit" className="w-full bg-accent text-primary font-bold py-2 rounded">Create Pivot Table</button>
        </form>
      </Modal>}
    </div>
  );
};

export default InteractiveGridView;
