import React, { useState } from 'react';
import { LightbulbIcon, CheckCircleIcon, CopyIcon } from './icons';

const navItems = [
    { href: '#workflow', text: 'Application Workflow' },
    { href: '#components', text: 'Component Breakdown' },
    { href: '#functions', text: 'Core Functions' },
    { href: '#changelog', text: 'Changelog' },
];

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="my-6 bg-secondary rounded-lg overflow-hidden border border-primary/50">
            <div className="flex justify-between items-center px-4 py-2 bg-primary/50 text-xs text-text-secondary">
                <span className="font-semibold uppercase">{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs hover:text-text-primary transition-colors">
                    {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre><code className={`language-${language} block p-4 overflow-x-auto text-sm`}>{code}</code></pre>
        </div>
    );
};

const Callout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="my-6 p-4 rounded-lg border-l-4 bg-sky-900/50 border-sky-500">
        <h4 className="font-bold flex items-center gap-2 text-text-primary"><LightbulbIcon className="w-5 h-5 text-sky-400"/> {title}</h4>
        <div className="text-text-secondary prose-p:mt-2 prose-p:text-text-secondary">{children}</div>
    </div>
);


const DocumentationView: React.FC = () => {
  return (
    <div className="h-full w-full flex bg-primary">
        <aside className="w-64 flex-shrink-0 border-r border-secondary h-full p-4">
            <nav className="sticky top-20">
                <h3 className="font-bold text-sm uppercase text-text-secondary mb-2">On this page</h3>
                <ul>
                    {navItems.map(item => (
                        <li key={item.href}>
                            <a href={item.href} className="block text-text-secondary hover:text-text-primary py-1.5 text-sm rounded transition-colors">{item.text}</a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
        <main className="flex-grow p-8 lg:p-12 h-full overflow-y-auto">
            <div className="max-w-4xl prose prose-invert prose-headings:text-accent prose-a:text-sky-400 prose-strong:text-text-primary">
                <h1>Documentation</h1>
                <p className="lead text-lg text-text-secondary">
                    Welcome to the Excel Knowledge Graph Explorer. This document provides a comprehensive overview of the application's architecture, functionality, and core components.
                </p>

                <section id="workflow">
                    <h2>Application Workflow</h2>
                    <p>This application transforms a standard Excel spreadsheet into a rich, interactive knowledge graph, enabling deep insights and easy exploration of your data's structure and meaning. The workflow is as follows:</p>
                    <ol>
                        <li><strong>Upload & Parse:</strong> The process begins when a user provides an Excel file. The system parses the file to extract raw data, including sheet names, cell values, and formulas. In this demo, we use pre-loaded mock data.</li>
                        <li><strong>AI-Powered Analysis:</strong> The parsed data is sent to the Gemini API. A sophisticated prompt instructs the AI to analyze the spreadsheet's structure, identify relationships, describe the purpose of sheets and formulas, and determine the overall analytical goal.</li>
                        <li><strong>Knowledge Graph Generation:</strong> Gemini returns a structured JSON object representing the knowledge graph. This graph consists of nodes (e.g., Sheets, Tables, Formulas) and links (e.g., CONTAINS, REFERENCES) that define their relationships.</li>
                        <li><strong>Interactive Exploration:</strong> The application presents this knowledge graph in multiple, powerful ways for the user to interact with.</li>
                    </ol>
                </section>

                <section id="components">
                    <h2>Component Breakdown</h2>
                    <p>The application is built with a modular component architecture, ensuring a clean separation of concerns.</p>
                    
                    <h4><code>UploadView.tsx</code></h4>
                    <p>The initial landing page. It handles file input (or demo data initiation) and kicks off the analysis process by calling the Gemini service. It provides real-time, detailed feedback on the analysis status.</p>

                    <h4><code>InteractiveGridView.tsx</code></h4>
                    <p>Displays the spreadsheet data in a familiar grid format. It is deeply linked to the knowledge graph, allowing users to add tags to cells, rows, columns, and sheets, which dynamically updates the graph in real-time.</p>

                    <h4><code>GraphView.tsx</code></h4>
                    <p>Renders the knowledge graph as a force-directed graph using D3.js. Users can visually explore the relationships between different parts of their spreadsheet by dragging nodes, zooming, and clicking on elements to view their properties.</p>
                    
                    <Callout title="Dynamic Interaction">
                        <p>Clicking a node in the graph view not only highlights it but also populates the Query Console with a relevant query to explore its connections.</p>
                    </Callout>

                    <h4><code>QueryConsole.tsx</code></h4>
                    <p>A persistent, collapsible console at the bottom of the screen. It features a "Cypher" tab for direct graph queries and a "Natural Language" tab that uses Gemini to convert user questions into Cypher queries, making data exploration accessible to everyone.</p>

                    <h4><code>geminiService.ts</code></h4>
                    <p>A dedicated service module that abstracts all interactions with the Google Gemini API. It handles formatting prompts for both the main knowledge graph analysis and the natural language-to-Cypher conversions.</p>
                </section>
                
                <section id="functions">
                    <h2>Core Functions</h2>
                    <p>While this is a web application, the core logic is modular and can be thought of as a series of commands or functions:</p>
                    
                    <h4><code>analyzeSpreadsheet(data, onProgress)</code></h4>
                    <p>Takes parsed sheet data and a progress callback as input, sends it to Gemini for analysis, and returns a fully formed knowledge graph.</p>
                    <CodeBlock language="typescript" code={`async function analyzeSpreadsheet(\n  data: SheetData[],\n  onProgressUpdate: (message: string) => void\n): Promise<KnowledgeGraph>`} />

                    <h4><code>convertNlToCypher(query)</code></h4>
                    <p>Takes a natural language string, queries Gemini to convert it to a Cypher query, and returns the result string.</p>
                    <CodeBlock language="typescript" code={`async function convertNlToCypher(\n  naturalLanguageQuery: string\n): Promise<string>`} />
                </section>

                <section id="changelog">
                    <h2>Changelog</h2>
                    <h4>v1.2.0 (Current)</h4>
                    <ul>
                        <li>Revamped documentation page with a professional, multi-column layout.</li>
                        <li>Implemented a real-time progress log on the Upload/Analysis screen for better UX during processing.</li>
                        <li>Added advanced data manipulation (Sort, Filter, Pivot) to Interactive Grid.</li>
                        <li>Integrated file download (Excel, JSON, YAML) and metadata upload functionality.</li>
                    </ul>
                    <h4>v1.0.0 (Initial Release)</h4>
                    <ul>
                        <li>Initial application structure and core components.</li>
                        <li>Implemented views: Upload, Interactive Grid, Graph Visualization, and Documentation.</li>
                        <li>Added interactive Query Console with Cypher and Natural Language tabs.</li>
                    </ul>
                </section>
            </div>
        </main>
    </div>
  );
};

export default DocumentationView;