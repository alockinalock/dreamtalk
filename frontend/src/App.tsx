import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node as RFNode, Edge as RFEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import data from './assets/test.json';
import CustomNode from './CustomNode';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

type MindMapNode = {
  id: number;
  name: string;
  connections: number | number[];
  longtext: string;
};

// Browser Audio Extractor (in-memory, no localStorage)
class BrowserAudioExtractor {
  private openai: any;
  private apiKey: string;
  private onTranscriptionUpdate: (text: string) => void;
  private mediaRecorder: MediaRecorder | null;
  private audioChunks: Blob[];
  private isProcessing: boolean;
  private processingInterval: NodeJS.Timeout | null;
  private isRunning: boolean;
  private stream: MediaStream | null;
  private transcriptionLines: string[];

  constructor(apiKey: string, onTranscriptionUpdate: (text: string) => void) {
    this.openai = null;
    this.apiKey = apiKey;
    this.onTranscriptionUpdate = onTranscriptionUpdate;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isProcessing = false;
    this.processingInterval = null;
    this.isRunning = false;
    this.stream = null;
    this.transcriptionLines = [];
  }

  async processAudioChunk(): Promise<void> {
    if (!this.isRunning || this.audioChunks.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    try {
      if (!this.isRunning) {
        this.isProcessing = false;
        return;
      }

      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], "audio.webm", { type: 'audio/webm' });

      if (!this.openai) {
        const OpenAIModule = await import('openai');
        const OpenAI = OpenAIModule.default || OpenAIModule;
        this.openai = new OpenAI({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true,
        });
      }

      console.log('📤 Transcribing audio...');
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
      });

      if (!this.isRunning) {
        this.isProcessing = false;
        return;
      }

      if (response?.text?.trim()) {
        const transcription = response.text.trim();
        this.transcriptionLines.push(transcription);
        console.log("📝 New transcription:", transcription);
        
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(this.getFullText());
        }
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Already running");
      return;
    }

    try {
      console.log('🎙️ Starting audio capture...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { channelCount: 1, sampleRate: 48000 } 
      });

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (this.isRunning && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.isRunning = true;
      this.mediaRecorder.start();
      
      this.processingInterval = setInterval(() => {
        if (this.isRunning && this.mediaRecorder?.state === "recording") {
          this.mediaRecorder.stop();
          this.processAudioChunk();
          if (this.isRunning) this.mediaRecorder.start();
        }
      }, 5000);

      console.log("✅ Audio capture started");
    } catch (err) {
      console.error("❌ Failed to start:", err);
      this.isRunning = false;
      throw err;
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.audioChunks = [];

    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      if (this.mediaRecorder.state !== "inactive") this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    console.log("🛑 Audio capture stopped");
  }

  getFullText(): string {
    return this.transcriptionLines.join('\n');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Layout graph with dagre to reduce edge crossings
const layoutGraph = (data: MindMapNode[]) => {
  const minWidth = 100;
  const maxWidth = 240;
  const horizontalPadding = 32;
  const charWidth = 8;
  const nodeHeight = 40;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 40, marginx: 20, marginy: 20 });

  const ids = data.map((d) => d.id);

  for (const n of data) {
    const label = n.name ?? '';
    const width = Math.min(maxWidth, Math.max(minWidth, label.length * charWidth + horizontalPadding));
    g.setNode(n.id.toString(), { width, height: nodeHeight });
  }

  const edges: RFEdge[] = [];
  for (const n of data) {
    const src = n.id.toString();
    let targets: number[] = [];
    if (Array.isArray(n.connections)) {
      targets = n.connections as number[];
    } else if (typeof n.connections === 'number') {
      const connNum = n.connections as number;
      if (ids.includes(connNum)) targets = [connNum];
      else targets = Array.from({ length: connNum }, (_, i) => n.id + i + 1).filter((tid) => ids.includes(tid));
    }
    for (const tid of targets) {
      const tgt = tid.toString();
      g.setEdge(src, tgt);
      edges.push({ id: `e${n.id}-${tid}`, source: src, target: tgt });
    }
  }

  dagre.layout(g);

  const nodes: RFNode[] = data.map((n) => {
    const d = g.node(n.id.toString());
    const width = d.width as number;
    const height = d.height as number;
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

export default function App() {
  const { nodes: initialNodes, edges: initialEdges } = layoutGraph(data as MindMapNode[]);
  const [nodes, setNodes] = useState<RFNode[]>(initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [backendUrl] = useState('http://localhost:5000');
  
  const extractorRef = useRef<BrowserAudioExtractor | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (extractorRef.current?.isActive()) {
        extractorRef.current.stop();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Periodically fetch updated data from test1.json every 5s and re-layout
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     try {
  //       const res = await fetch('/src/assets/test1.json');
  //       if (!res.ok) return;
  //       const newData = (await res.json()) as MindMapNode[];
  //       const { nodes: newNodes, edges: newEdges } = layoutGraph(newData);
  //       setNodes(newNodes);
  //       setEdges(newEdges);
  //     } catch (err) {
  //       console.error('Failed to fetch simulated update', err);
  //     }
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

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
    setSelectedNode(node);
  }, []);

  // Callback when transcription updates
  const handleTranscriptionUpdate = useCallback((fullText: string) => {
    setCurrentText(fullText);
    console.log('📝 Transcription updated:', fullText.length, 'characters');
  }, []);

  // Use refs to avoid stale closure issues
  const sessionIdRef = useRef<string | null>(null);
  const currentTextRef = useRef<string>('');

  // Update refs when state changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  // Send update to backend every 15 seconds
  const sendUpdateToBackend = useCallback(async () => {
    if (!sessionIdRef.current || !currentTextRef.current) {
      console.log('⏭️ Skipping update - no session or no text');
      return;
    }

    try {
      console.log('📤 Sending update to backend...');
      console.log('Session:', sessionIdRef.current);
      console.log('Text length:', currentTextRef.current.length);
      
      const blob = new Blob([currentTextRef.current], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('session_id', sessionIdRef.current);
      formData.append('file', blob, 'transcription.txt');

      const res = await fetch(`${backendUrl}/update_mindmap`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = await res.json();
      const { nodes: newNodes, edges: newEdges } = layoutGraph(data.mindmap);
      
      setNodes(newNodes);
      setEdges(newEdges);
      console.log('✅ Mindmap updated with', data.mindmap.length, 'nodes');
    } catch (err) {
      console.error('❌ Backend update failed:', err);
    }
  }, [backendUrl]);

  const handleStart = async () => {
    // Get API key from environment
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey) {
      alert('OpenAI API key not found in .env file. Please set VITE_OPENAI_API_KEY');
      return;
    }

    try {
      console.log('📞 Creating session...');
      
      const sessionRes = await fetch(`${backendUrl}/create_session`, { 
        method: 'POST' 
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to create session');
      }
      
      const sessionData = await sessionRes.json();
      const newSessionId = sessionData.session_id;
      setSessionId(newSessionId);
      console.log('✅ Session created:', newSessionId);
      
      if (!extractorRef.current) {
        extractorRef.current = new BrowserAudioExtractor(openaiKey, handleTranscriptionUpdate);
      }

      await extractorRef.current.start();
      setIsListening(true);
      
      // Start 15-second backend update interval
      updateIntervalRef.current = setInterval(() => {
        console.log('⏰ 15-second interval triggered');
        sendUpdateToBackend();
      }, 15000);
      
      console.log('✅ All systems started');
    } catch (err) {
      console.error('❌ Start failed:', err);
      alert('Failed to start: ' + (err as Error).message);
    }
  };

  const handleStop = async () => {
    console.log('🛑 Stopping...');
    
    if (extractorRef.current) {
      extractorRef.current.stop();
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    setIsListening(false);
    console.log('✅ Stopped all processes');
  };

  // Close modal with Escape
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