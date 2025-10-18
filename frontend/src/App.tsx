import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { NodeObject, LinkObject } from "react-force-graph-2d";
import data from "./assets/test.json";
import data2 from "./assets/test1.json";
import './App.css';

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

  // Function to merge new JSON updates
  const mergeMindMap = (newData: MindMapNode[]) => {
    setGraphData(prev => {
      const nodeMap = new Map(prev.nodes.map(n => [n.id, n]));

      // Add/update nodes
      newData.forEach(n => {
        // const val = 5 + n.connections.length * 3; // size based on number of connections
        const val = 7; // size based on number of connections
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

  return (
    <div id="mindmap" style={{ width: "100vw", height: "100vh" }}>
      <div id="inner-mindmap">
        <ForceGraph2D
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
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, node.val ?? 5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.fillText(label, node.x ?? 0, node.y ?? 0);
          }}
          cooldownTicks={100}
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
