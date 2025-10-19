import React, { useEffect, useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { NodeObject, LinkObject } from "react-force-graph-2d";
import data from "./assets/test.json";
import data2 from "./assets/test2.json";
import './App.css';

import { forceCollide } from "d3-force-3d";

type MindMapNode = {
  id: number;
  name: string;
  connections: number[];
  longtext: string;
};

type GraphNode = {
  id: number;
  name: string;
  val: number;
};

type GraphLink = {
  source: number;
  target: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const fgRef = useRef<any>();

  // Function to merge new JSON updates
  const mergeMindMap = (newData: MindMapNode[]) => {
    setGraphData(prev => {
      const nodeMap = new Map(prev.nodes.map(n => [n.id, n]));

      // Add/update nodes
      newData.forEach(n => {
        const val = 5 + n.connections.length * 2 + n.name.length * 0.5;
        nodeMap.set(n.id, { id: n.id, name: n.name, val });
      });

      const nodes = Array.from(nodeMap.values());

      // Rebuild links
      const links: GraphLink[] = [];
      nodes.forEach(node => {
        const origNode = newData.find(n => n.id === node.id) || data.find(n => n.id === node.id);
        if (origNode) {
          origNode.connections.forEach(targetId => {
            if (!links.some(l => (l.source === targetId && l.target === node.id))) {
              links.push({ source: node.id, target: targetId });
            }
          });
        }
      });

      return { nodes, links };
    });
  };

  // Initialize graph with initial data
  useEffect(() => {
    mergeMindMap(data);
  }, []);

  // Poll for updates every 10 seconds using data2 as new data
  useEffect(() => {
    const interval = setInterval(() => {
      mergeMindMap(data2);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;

    const fg = fgRef.current;

    // Strengthen charge force to reduce node overlap
    fg.d3Force("charge").strength(-150);

    // Add collision detection based on node radius (prevents overlapping)
    fg.d3Force("collide", forceCollide((node: any) => (node.val || 5) + 5));

    // Dynamic link distance calculation
    fg.d3Force("link")?.distance((link: any) => {
      const source = link.source;
      const target = link.target;

      const sourceRadius = source?.val || 5;
      const targetRadius = target?.val || 5;

      const sourceConnections = source?.connections?.length || 1;
      const targetConnections = target?.connections?.length || 1;

      const baseDistance = 60;
      const sizeFactor = sourceRadius + targetRadius;
      const connectionFactor = sourceConnections * 8 + targetConnections * 8;

      return baseDistance + sizeFactor + connectionFactor;
    });

    // Reheat simulation to apply changes
    fg.d3ReheatSimulation();
  }, [graphData]);

  return (
    <div id="mindmap" style={{ width: "100vw", height: "100vh" }}>
      <div id="inner-mindmap">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="id"
          linkDirectionalArrowLength={0}
          linkDirectionalArrowRelPos={0}
          linkCurvature={0}
          linkWidth={1}
          linkColor={() => "lightgray"}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;

            // Measure text width and set node radius to fit
            const textWidth = ctx.measureText(label).width;
            const radius = Math.max(10, textWidth / 2 + 6); // minimum radius 10px, padding 6px

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.fillText(label, node.x ?? 0, node.y ?? 0);

            // Update node.val so that link distance calculations account for new radius
            node.val = radius;
          }}
          cooldownTicks={300}
          onNodeClick={(node: any) => {
            const found = (data as MindMapNode[]).find((n) => n.id === node.id) || (data2 as MindMapNode[]).find(n => n.id === node.id);
            if (found) alert(found.longtext);
          }}
        />
      </div>
    </div>
  );
};

export default App;
