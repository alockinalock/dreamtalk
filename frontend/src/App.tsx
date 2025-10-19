import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node as RFNode, Edge as RFEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import data from './assets/test.json';
import CustomNode from './CustomNode';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

type MindMapNode = {
  id: number;
  name: string;
  connections: number;
  longtext: string;
};

// Layout graph with dagre to reduce edge crossings. Returns positioned nodes & edges.
const layoutGraph = (data: MindMapNode[]) => {
  const minWidth = 100;
  const maxWidth = 240;
  const horizontalPadding = 32;
  const charWidth = 8;
  const nodeHeight = 40;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // left -> right layout
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 40, marginx: 20, marginy: 20 });

  const ids = data.map((d) => d.id);

  // add nodes with measured width/height
  for (const n of data) {
    const label = n.name ?? '';
    const width = Math.min(maxWidth, Math.max(minWidth, label.length * charWidth + horizontalPadding));
    g.setNode(n.id.toString(), { width, height: nodeHeight });
  }

  // build edges using connections rules (array / id / count)
  const edges: RFEdge[] = [];
  for (const n of data) {
    const src = n.id.toString();
    let targets: number[] = [];
    if (Array.isArray((n as any).connections)) {
      targets = (n as any).connections as number[];
    } else if (typeof (n as any).connections === 'number') {
      const connNum = (n as any).connections as number;
      if (ids.includes(connNum)) targets = [connNum];
      else targets = Array.from({ length: connNum }, (_, i) => n.id + i + 1).filter((tid) => ids.includes(tid));
    }
    for (const tid of targets) {
      const tgt = tid.toString();
      g.setEdge(src, tgt);
      edges.push({ id: `e${n.id}-${tid}`, source: src, target: tgt });
    }
  }

  // compute layout
  dagre.layout(g);

  // extract positioned nodes
  const nodes: RFNode[] = data.map((n) => {
    const d = g.node(n.id.toString());
    const width = d.width as number;
    const height = d.height as number;
    // dagre gives center x/y; convert to top-left for React Flow
    return {
      id: n.id.toString(),
      type: 'custom',
      data: { label: n.name },
      position: { x: (d.x as number) - width / 2, y: (d.y as number) - height / 2 },
      style: { width },
    } as RFNode;
  });

  return { nodes, edges };
};

// edges are computed inside layoutGraph to match dagre layout

export default function App() {
  const { nodes: initialNodes, edges: initialEdges } = layoutGraph(data as MindMapNode[]);
  const [nodes, setNodes] = useState<RFNode[]>(initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(initialEdges);

  // periodically fetch updated data from test1.json every 5s and re-layout
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/src/assets/test1.json');
        if (!res.ok) return;
        const newData = (await res.json()) as MindMapNode[];
        const { nodes: newNodes, edges: newEdges } = layoutGraph(newData);
        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error('Failed to fetch simulated update', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((es) => addEdge(params, es)),
    []
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ custom: CustomNode }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}
