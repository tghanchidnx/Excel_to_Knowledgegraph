import { GoogleGenAI, Type } from "@google/genai";
import { KnowledgeGraph, SheetData, AnalysisConfig } from '../types';
import { logger } from './loggingService';

// Fix: Initialize the GoogleGenAI client to be used for API calls.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Define a response schema for the knowledge graph to ensure structured JSON output from Gemini.
const knowledgeGraphSchema = {
    type: Type.OBJECT,
    properties: {
        nodes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the node. Use snake_case. e.g. sheet_sales_q1" },
                    type: { type: Type.STRING, description: "Type of the node. One of: 'Spreadsheet', 'Sheet', 'Table', 'Cell', 'Formula', 'Analysis', 'Tag', 'Row', 'Column'." },
                    label: { type: Type.STRING, description: "A human-readable label for the node. e.g. 'Sales Q1'" },
                    description: { type: Type.STRING, description: "A detailed description of what this node represents." },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional list of tags associated with the node." },
                    formula: { type: Type.STRING, description: "If the node is a formula, this contains the formula string. e.g. '=SUM(D2:D4)'" },
                    value: { type: Type.STRING, description: "The computed value of the cell or formula. Represent numbers as strings." },
                    address: { type: Type.STRING, description: "The cell address (e.g. 'A1') or range for this node." },
                },
                required: ['id', 'type', 'label']
            }
        },
        links: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the link. e.g. l1_spreadsheet_sheet_sales" },
                    source: { type: Type.STRING, description: "The id of the source node for this link." },
                    target: { type: Type.STRING, description: "The id of the target node for this link." },
                    label: { type: Type.STRING, description: "The type of relationship. e.g. 'CONTAINS', 'REFERENCES'." },
                },
                required: ['id', 'source', 'target', 'label']
            }
        }
    },
    required: ['nodes', 'links']
};


// Fix: Replace mock implementation with a real Gemini API call to analyze spreadsheet data.
export const analyzeSpreadsheet = async (
    data: SheetData[],
    onProgressUpdate: (message: string, level?: 'info' | 'detail') => void,
    config: AnalysisConfig
): Promise<KnowledgeGraph> => {
    onProgressUpdate("Initializing analysis...", 'info');
    await new Promise(res => setTimeout(res, 300));

    onProgressUpdate("Preparing spreadsheet data for AI...", 'info');
    // Slice data to keep the payload reasonable, especially for large sheets
    const spreadsheetDataString = JSON.stringify(data.map(s => ({...s, data: s.data.slice(0, 20)})), null, 2);
    onProgressUpdate(`Data consists of ${data.length} sheets. Payload size for AI: ${spreadsheetDataString.length} characters.`, 'detail');
    await new Promise(res => setTimeout(res, 300));

    const analysisInstructions = config.analysisDepth === 'deep' 
        ? `- Identify tables, important cells, and cells with formulas, and create nodes for them.
- Create an 'Analysis' node that describes the overall purpose of the spreadsheet.
- Links should represent relationships like 'CONTAINS' (e.g., a spreadsheet contains a sheet) and 'REFERENCES' (e.g., a formula cell references another cell).
- Make sure all 'source' and 'target' IDs in links correspond to actual node IDs you've created.
- Generate descriptive labels and descriptions for all nodes.`
        : `- Create a high-level 'Analysis' node describing the spreadsheet's purpose.
- Generate a concise description for each 'Sheet' node.
- Only link sheets to the main spreadsheet node. Do not create detailed cell or formula nodes.`;

    const prompt = `
Analyze the following spreadsheet data and generate a knowledge graph.
The data is provided as an array of sheets, where each sheet has a name and a 2D array of cell data.

Spreadsheet Data:
\`\`\`json
${spreadsheetDataString}
\`\`\`

Based on this data, create a knowledge graph with nodes and links.
- Nodes can be of type 'Spreadsheet', 'Sheet', 'Table', 'Cell', 'Formula', 'Analysis', 'Tag', 'Row', 'Column'.
- Create a root 'Spreadsheet' node.
- Create 'Sheet' nodes for each sheet in the data.
${analysisInstructions}
- Make node and link IDs lowercase and use snake_case.
`;

    onProgressUpdate(`Sending data to Gemini Pro for ${config.analysisDepth} analysis... (This may take a moment)`, 'info');
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: knowledgeGraphSchema,
            },
        });
    
        onProgressUpdate("Receiving knowledge graph from AI...", 'info');
        await new Promise(res => setTimeout(res, 300));
        
        const jsonText = response.text;
        onProgressUpdate(`Received response from AI. Size: ${jsonText.length} characters.`, 'detail');
        onProgressUpdate("Parsing and validating graph structure...", 'info');
        const graph = JSON.parse(jsonText) as KnowledgeGraph;

        if (!graph.nodes || !graph.links) {
            throw new Error("Invalid graph structure received from API.");
        }
        
        onProgressUpdate("Analysis complete!", 'info');
        await new Promise(res => setTimeout(res, 500));
        
        logger.log("Analysis complete.");
        return graph;
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        onProgressUpdate(`Error: ${errorMessage}`, 'info');
        logger.error("Error analyzing spreadsheet with Gemini", e);
        throw new Error("Failed to get a valid knowledge graph from the API.");
    }
};

// Fix: Replace mock implementation with a real Gemini API call to convert natural language to a Cypher query.
export const convertNlToCypher = async (naturalLanguageQuery: string): Promise<string> => {
    logger.log(`Converting "${naturalLanguageQuery}" to Cypher...`);
    
    const prompt = `
You are an expert in Cypher query language. Your task is to convert a natural language question about a spreadsheet knowledge graph into a valid Cypher query.

The knowledge graph has the following node types: 'Spreadsheet', 'Sheet', 'Table', 'Cell', 'Formula', 'Analysis', 'Tag', 'Row', 'Column'.
Nodes have properties like 'id', 'type', 'label', 'description', 'formula', 'value', 'address'.
Links have a label representing the relationship, like 'CONTAINS' or 'REFERENCES'.

Convert the following natural language query into a Cypher query.
Only return the Cypher query itself, without any explanation or code fences.

Natural Language Query: "${naturalLanguageQuery}"
Cypher Query:
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
    
        const cypherQuery = response.text;
        logger.log(`Generated Cypher: ${cypherQuery}`);
        return cypherQuery;
    } catch(e) {
        logger.error("Error converting NL to Cypher", e);
        if (e instanceof Error) {
            logger.error("Error message:", e.message);
        }
        throw new Error("Failed to convert natural language query to Cypher.");
    }
};