import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node as RFNode, Edge as RFEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import data from './assets/test.json';

const baseHeight = 50;

type MindMapNode = {
  id: number;
  name: string;
  connections: number;
  longtext: string;
};

// Generate nodes for horizontal layout
const generateNodes = (data: MindMapNode[]): RFNode[] =>
  data.map((n, idx) => ({
    id: n.id.toString(),
    position: { x: idx * 200, y: 0 }, // horizontal layout
    data: { label: n.name },
    style: {
      width: Math.max(100, n.name.length * 12 + n.connections * 10),
      height: baseHeight,
      textAlign: 'center',
    },
  }));

// Generate edges from connections
const generateEdges = (data: MindMapNode[]): RFEdge[] =>
  data.flatMap((n) =>
    Array.from({ length: n.connections }, (_, i) => {
      const targetId = n.id + i + 1;
      return targetId <= data.length
        ? { id: `e${n.id}-${targetId}`, source: n.id.toString(), target: targetId.toString() }
        : null;
    }).filter(Boolean)
  ) as RFEdge[];

export default function App() {
  const [nodes, setNodes] = useState<RFNode[]>(generateNodes(data as MindMapNode[]));
  const [edges, setEdges] = useState<RFEdge[]>(generateEdges(data as MindMapNode[]));

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}
