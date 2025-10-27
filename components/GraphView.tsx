import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraph, Node, Link, NodeType } from '../types';
import { EditIcon, RefreshCwIcon, TargetIcon, LayoutGridIcon } from './icons';

interface GraphViewProps {
  graph: KnowledgeGraph;
  onNodeClick: (node: Node) => void;
  onLinkClick: (link: Link) => void;
  onCanvasClick: () => void;
  selectedId?: string;
  onCreateLink: (sourceId: string, targetId: string) => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
}

const linkDrag = (
    rootGroup: d3.Selection<SVGGElement, unknown, null, undefined>, 
    onCreateLink: (sourceId: string, targetId: string) => void
) => { /* ... existing linkDrag implementation ... */ };

const GraphView: React.FC<GraphViewProps> = ({ graph, onNodeClick, onLinkClick, onCanvasClick, selectedId, onCreateLink, onRenameNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rootGroupRef = useRef<SVGGElement | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'default' | 'cluster'>('default');

  useEffect(() => {
    if (!svgRef.current || !graph) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svg.node()!.parentElement!.clientWidth;
    const height = svg.node()!.parentElement!.clientHeight;
    
    const rootGroup = svg.append('g');
    rootGroupRef.current = rootGroup.node();

    svg.attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .on('click', (event) => {
        if (event.target === svg.node()) {
          onCanvasClick();
          setEditingNodeId(null);
        }
      });

    const links = graph.links.map(d => ({...d}));
    const nodes = graph.nodes.map(d => ({...d}));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(d => d.label === 'HAS_TAG' ? 60 : 120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(0, 0).strength(layoutMode === 'default' ? 1 : 0.1));
    
    simulationRef.current = simulation;

    const typeSet = [...new Set(nodes.map(n => n.type))] as NodeType[];
    const typeCoordinates: Record<NodeType, {x: number, y: number}> = Object.fromEntries(
        typeSet.map((type, i) => {
            const angle = (i / typeSet.length) * 2 * Math.PI;
            return [type, { x: Math.cos(angle) * (width/3), y: Math.sin(angle) * (height/3) }];
        })
    ) as any;

    if (layoutMode === 'cluster') {
        simulation
            .force('x', d3.forceX((d: any) => typeCoordinates[d.type]?.x || 0).strength(0.1))
            .force('y', d3.forceY((d: any) => typeCoordinates[d.type]?.y || 0).strength(0.1));
    }

    const link = rootGroup.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => d.id === selectedId ? '#38BDF8' : '#999')
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => d.id === selectedId ? 3 : 1.5)
      .on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick(d);
      });
      
    const linkLabels = rootGroup.append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("fill", "#CBD5E1")
      .attr("font-size", "8px")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(typeSet);

    const node = rootGroup.append("g")
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .join("g")
      .call(drag(simulation) as any);

    node.append("circle")
      .attr("r", d => d.type === 'Tag' ? 6 : 10)
      .attr("fill", d => colorScale(d.type))
      .attr("stroke", d => d.id === selectedId ? '#38BDF8' : '#fff')
      .attr("stroke-width", d => d.id === selectedId ? 3 : 1.5)
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d)
      });
      
    const labels = node.append("text")
      .attr("x", 12)
      .attr("y", 3)
      .attr("fill", "#F8FAFC")
      .attr("font-size", "10px")
      .text(d => d.label)
      .style('display', d => editingNodeId === d.id ? 'none' : 'block');

    const foreignObjects = node.append('foreignObject')
      .attr('x', 10)
      .attr('y', -10)
      .attr('width', 150)
      .attr('height', 25)
      .style('display', d => editingNodeId === d.id ? 'block' : 'none')
      .append('xhtml:body')
      .style('margin', '0px')
      .style('padding', '0px')
      .append('xhtml:input')
      .attr('type', 'text')
      .attr('value', d => d.label)
      .style('width', '100%')
      .style('padding', '2px')
      .style('border-radius', '3px')
      .style('background-color', '#F8FAFC')
      .style('color', '#1E293B')
      .style('border', '1px solid #38BDF8')
      .on('keydown', function(event, d) {
        if (event.key === 'Enter') {
          onRenameNode(d.id, this.value);
          setEditingNodeId(null);
        } else if (event.key === 'Escape') {
          setEditingNodeId(null);
        }
      })
      .on('blur', function(event, d){
        setEditingNodeId(null);
      });
    
    // Auto-focus the input
    if (editingNodeId) {
        foreignObjects.filter(d => d.id === editingNodeId).select('input').node()?.focus();
    }


    node.append("title")
        .text(d => `${d.type}: ${d.label}\n${d.description || ''}`);
    
    const interactiveHandles = node.append('g').attr('class', 'interactive-handles').style('opacity', 0);

    interactiveHandles.append('circle') // Background for better clicking
        .attr('r', 12)
        .attr('fill', 'transparent');
    
    interactiveHandles.append('path') // Edit icon
      .attr('d', 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z')
      .attr('transform', 'translate(10, -22) scale(0.6)')
      .attr('fill', '#38BDF8')
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setEditingNodeId(d.id);
      });

    node.on('mouseenter', (event) => {
        d3.select(event.currentTarget).select('.interactive-handles').style('opacity', 1);
    }).on('mouseleave', (event) => {
        d3.select(event.currentTarget).select('.interactive-handles').style('opacity', 0);
    });

    simulation.on("tick", () => {
      link.attr("x1", d => (d.source as any).x).attr("y1", d => (d.source as any).y)
          .attr("x2", d => (d.target as any).x).attr("y2", d => (d.target as any).y);
      linkLabels.attr("x", d => ((d.source as any).x + (d.target as any).x) / 2)
          .attr("y", d => ((d.source as any).y + (d.target as any).y) / 2);
      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        rootGroup.attr('transform', event.transform);
    });
    svg.call(zoom);
    zoomRef.current = zoom;

    return () => {
        simulation.stop();
        if(svgRef.current) {
            d3.select(svgRef.current).on('.zoom', null);
        }
    };
  }, [graph, selectedId, editingNodeId, layoutMode, onNodeClick, onLinkClick, onCanvasClick, onCreateLink, onRenameNode]);

  const drag = (simulation: d3.Simulation<any, any>) => {
    function dragstarted(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<any, any, any>, d: any) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
  }
  
  const handleRecenter = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
  };
  
  const handleRestartSim = () => {
    simulationRef.current?.alpha(1).restart();
  };

  return (
    <div className="w-full h-full bg-primary rounded-lg overflow-hidden cursor-grab relative">
        <svg ref={svgRef}></svg>
        <div className="absolute top-2 right-2 bg-secondary/70 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 border border-primary/50">
            <button onClick={handleRecenter} title="Recenter View" className="p-2 text-text-secondary hover:bg-highlight/50 hover:text-text-primary rounded-md"><TargetIcon className="w-5 h-5"/></button>
            <button onClick={handleRestartSim} title="Restart Simulation" className="p-2 text-text-secondary hover:bg-highlight/50 hover:text-text-primary rounded-md"><RefreshCwIcon className="w-5 h-5"/></button>
            <button onClick={() => setLayoutMode(p => p === 'default' ? 'cluster' : 'default')} title="Cluster by Type" className={`p-2 rounded-md ${layoutMode === 'cluster' ? 'bg-accent text-primary' : 'text-text-secondary hover:bg-highlight/50 hover:text-text-primary'}`}>
                <LayoutGridIcon className="w-5 h-5"/>
            </button>
        </div>
    </div>
  );
};

export default GraphView;
