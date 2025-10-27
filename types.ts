export enum AppView {
  UPLOAD = 'UPLOAD',
  GRID = 'GRID',
  GRAPH = 'GRAPH',
  DOCS = 'DOCS',
}

export type NodeType = 'Spreadsheet' | 'Sheet' | 'Table' | 'Cell' | 'Formula' | 'Analysis' | 'Tag' | 'Row' | 'Column';

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  tags?: string[];
  formula?: string;
  value?: string | number;
  address?: string;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  label:string;
}

export interface KnowledgeGraph {
  nodes: Node[];
  links: Link[];
}

export interface CellData {
  address: string;
  value: string | number | null;
  formula?: string;
}

export interface SheetData {
  name: string;
  data: CellData[][];
}

export interface CachedAnalysis {
    metadata: {
        key: string;
        generatedAt: string;
    };
    graph: KnowledgeGraph;
    sheets: SheetData[];
}

export type AnalysisDepth = 'quick' | 'deep';

export interface AnalysisConfig {
    analysisDepth: AnalysisDepth;
    useCache: boolean;
    isDetailedLog: boolean;
}
