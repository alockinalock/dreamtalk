import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node as RFNode, Edge as RFEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import data from './assets/test.json';
import CustomNode from './CustomNode';
import '@xyflow/react/dist/style.css';
import { BrowserAudioExtractor } from "../browserAudioExtractor.ts"
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
      data: { label: n.name, longtext: n.longtext },
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
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // CRITICAL FIX: Use useRef to maintain the same extractor instance
  const extractorRef = useRef<BrowserAudioExtractor | null>(null);
  
  // Initialize extractor once
  if (!extractorRef.current) {
    extractorRef.current = new BrowserAudioExtractor();
  }
  
  const extractor = extractorRef.current;

  // Expose to window for emergency console access
  useEffect(() => {
    (window as any).audioExtractor = extractorRef.current;
    console.log('🔧 Extractor exposed globally as window.audioExtractor');
    
    return () => {
      delete (window as any).audioExtractor;
    };
  }, []);

  // Cleanup: stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (extractorRef.current?.isActive()) {
        console.log('🧹 Component unmounting - stopping audio');
        extractorRef.current.emergencyStop();
      }
    };
  }, []);

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

  const onNodeClick = useCallback((_event: any, node: RFNode) => {
    // open modal with node longtext
    setSelectedNode(node);
  }, []);

  const handleStart = async () => {
    console.log('🎙️ Audio listening started');
    try {
      // this is where the fetch is happening
      const [sessionId, setSessionId] = useState(null);
      const response = await fetch('http:localhost:5000/create_session', {
        method: 'POST'
      });

      const data = await response.json();
      setSessionId(data.session_id);


      await extractor.ae_start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start audio:', err);
    }
  };

  const handleStop = async () => {
    console.log('🛑 Audio listening stopped');
    try {
      extractor.ae_stop();
      setIsListening(false);
    } catch (err) {
      console.error('Failed to stop audio:', err);
    }
  };

  // close modal with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    if (selectedNode) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNode]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: 10 }}>
        {!isListening ? (
          <button
            onClick={handleStart}
            style={{
              padding: '10px 18px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            🎙️ Start Audio
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              padding: '10px 18px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            ⏹️ Stop Audio
          </button>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ custom: CustomNode }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      />
      {selectedNode ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setSelectedNode(null)}
        >
          <div
            style={{
              background: 'white',
              color: '#000',
              maxWidth: '720px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '20px',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{(selectedNode.data as any)?.label ?? 'Details'}</h2>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{(selectedNode.data as any)?.longtext}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}