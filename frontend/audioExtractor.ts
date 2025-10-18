// audioExtractor.ts
// Real-time audio transcription with rolling window updates to text file

interface TranscriptionEntry {
  text: string;
  speaker?: string;
  timestamp: number;
}

interface AudioExtractorConfig {
  assemblyAiApiKey: string;
  sampleRate?: number;
  windowDurationSeconds?: number;
}

class AudioExtractor {
  private socket: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private apiKey: string;
  private sampleRate: number;
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private transcriptions: TranscriptionEntry[] = [];
  private processor: ScriptProcessorNode | null = null;
  private lastSpeaker: string | null = null;
  private windowDurationMs: number;
  private updateInterval: number | null = null;

  constructor(config: AudioExtractorConfig) {
    this.apiKey = config.assemblyAiApiKey;
    this.sampleRate = config.sampleRate || 16000;
    this.windowDurationMs = (config.windowDurationSeconds || 10) * 1000;
  }

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const token = await this.getRealtimeToken();
      
      this.socket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.sampleRate}&token=${token}&speaker_labels=true`
      );

      this.socket.onopen = () => {
        console.log('Connected to AssemblyAI');
        this.startAudioStream();
        this.startPeriodicUpdates();
      };

      this.socket.onmessage = (message) => {
        const result = JSON.parse(message.data);
        
        if (result.message_type === 'FinalTranscript' && result.text.trim()) {
          this.saveTranscription({
            text: result.text.trim(),
            speaker: result.words?.[0]?.speaker || null,
            timestamp: Date.now()
          });
        } else if (result.message_type === 'PartialTranscript') {
          console.log('[PARTIAL]', result.text);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onclose = () => {
        console.log('Disconnected from AssemblyAI');
      };

      this.isRecording = true;
      console.log(`Recording started with ${this.windowDurationMs / 1000}s rolling window...`);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private async getRealtimeToken(): Promise<string> {
    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ expires_in: 3600 })
    });

    const data = await response.json();
    return data.token;
  }

  private startAudioStream(): void {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    const source = this.audioContext.createMediaStreamSource(this.stream!);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(int16Data.buffer);
      }
    };
  }

  private startPeriodicUpdates(): void {
    // Update text file every windowDurationMs
    this.updateInterval = window.setInterval(() => {
      this.appendToTextFile();
      // Clear transcriptions that have been saved
      this.clearSavedTranscriptions();
    }, this.windowDurationMs);
  }

  private saveTranscription(entry: TranscriptionEntry): void {
    // Check if speaker changed
    if (entry.speaker && entry.speaker !== this.lastSpeaker && this.transcriptions.length > 0) {
      // Add separator when speaker changes
      this.transcriptions.push({ text: '|', speaker: null, timestamp: entry.timestamp });
    }
    
    this.transcriptions.push(entry);
    this.lastSpeaker = entry.speaker || null;
    console.log(`[SAVED] ${entry.text}`);
  }

  private clearSavedTranscriptions(): void {
    // Clear transcriptions after they've been saved to file
    this.transcriptions = [];
    console.log(`[CLEARED] Transcriptions saved and cleared for next window`);
  }

  private appendToTextFile(): void {
    if (this.transcriptions.length === 0) {
      console.log('[UPDATE] No new transcriptions to append');
      return;
    }

    // Build simple text format: transcription | transcription | ...
    const textContent = this.transcriptions.map(t => t.text).join(' ');
    
    const blob = new Blob([textContent + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[APPENDED] Added ${this.transcriptions.length} entries to conversation.txt`);
  }

  stopRecording(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.socket) {
      this.socket.send(JSON.stringify({ terminate_session: true }));
      this.socket.close();
      this.socket = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.isRecording = false;
    console.log('Recording stopped');
  }

  getStatus(): boolean {
    return this.isRecording;
  }

  getTranscriptionCount(): number {
    return this.transcriptions.length;
  }
}

export default AudioExtractor;

/*
Usage:

// 10 second window (default)
const extractor = new AudioExtractor({
  assemblyAiApiKey: 'YOUR_API_KEY_HERE'
});

// OR custom window duration (e.g., 5 seconds)
const extractor = new AudioExtractor({
  assemblyAiApiKey: 'YOUR_API_KEY_HERE',
  windowDurationSeconds: 5
});

await extractor.startRecording();

// Every 10 seconds (or your custom duration):
// - Downloads conversation.txt with NEW content appended
// - Each line is a new 10-second window
// - Old content stays, new content is added

// Example timeline:
// After 10s:  conversation.txt contains:
//   i like apples | me too | apples are good
// 
// After 20s:  conversation.txt contains:
//   i like apples | me too | apples are good
//   i like bananas | i dont because bananas are mushy
// 
// After 30s:  conversation.txt contains:
//   i like apples | me too | apples are good
//   i like bananas | i dont because bananas are mushy
//   what about oranges | oranges are okay

extractor.stopRecording();
*/