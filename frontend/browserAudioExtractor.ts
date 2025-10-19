/**
 * Browser-Compatible Audio Transcription with localStorage
 * Uses Web Audio API and saves to localStorage every 3 seconds
 */

import OpenAI from "openai";

export class BrowserAudioExtractor {
  private openai: OpenAI;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private stream: MediaStream | null = null;
  private transcriptionLines: string[] = [];
  private saveInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'audio_transcription';

  constructor(apiKey?: string) {
    const key = apiKey || (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
    
    if (!key) {
      console.error('⚠️ OpenAI API key not found. Please provide it or set VITE_OPENAI_API_KEY in .env');
    }
    
    this.openai = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true, // Only for development/demo
    });
    
    // Load existing transcription from localStorage
    this.loadFromLocalStorage();
  }

  private saveToLocalStorage(): void {
    const content = this.getTranscriptionContent();
    localStorage.setItem(this.STORAGE_KEY, content);
    console.log('💾 Saved to localStorage');
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.transcriptionLines = saved.split('\n').filter(line => line.trim());
      console.log('📂 Loaded existing transcription from localStorage');
    }
  }

  private async processAudioChunk(): Promise<void> {
    // CRITICAL: Check if we should still be running
    if (!this.isRunning || this.audioChunks.length === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    try {
      // Double-check we're still running before making API call
      if (!this.isRunning) {
        this.isProcessing = false;
        return;
      }

      // Create audio blob
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      // Convert to File for OpenAI API
      const audioFile = new File([audioBlob], "audio.webm", { type: 'audio/webm' });

      console.log('📤 Making API call...');
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      // CRITICAL: Check again after async call
      if (!this.isRunning) {
        this.isProcessing = false;
        return;
      }

      if (response && response.segments && response.segments.length > 0) {
        // Group segments by speaker
        const speakerGroups: { [key: string]: string[] } = {};
        
        response.segments.forEach((segment: any) => {
          const speaker = segment.speaker || "Speaker_Unknown";
          if (!speakerGroups[speaker]) {
            speakerGroups[speaker] = [];
          }
          speakerGroups[speaker].push(segment.text.trim());
        });
        
        const speakerKeys = Object.keys(speakerGroups);
        let transcription = "";
        
        if (speakerKeys.length > 1) {
          const formattedSegments = speakerKeys.map(speaker => {
            return speakerGroups[speaker].join(" ");
          });
          transcription = formattedSegments.join(" | ");
        } else {
          transcription = speakerGroups[speakerKeys[0]].join(" ");
        }
        
        this.transcriptionLines.push(transcription);
        this.saveToLocalStorage();
        console.log("📝 Transcription:", transcription);
      } else if (response && response.text && response.text.trim()) {
        const transcription = response.text.trim();
        this.transcriptionLines.push(transcription);
        this.saveToLocalStorage();
        console.log("📝 Transcription:", transcription);
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  public async ae_start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ AudioExtractor is already running");
      return;
    }

    try {
      console.log('🎙️ Starting AudioExtractor...');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
        } 
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm',
      });

      // Collect audio chunks
      this.mediaRecorder.ondataavailable = (event) => {
        // CRITICAL: Only collect if still running
        if (this.isRunning && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Set running flag BEFORE starting
      this.isRunning = true;

      // Start recording in 5-second chunks
      this.mediaRecorder.start();
      console.log('▶️ MediaRecorder started');
      
      this.processingInterval = setInterval(() => {
        if (this.isRunning && this.mediaRecorder && this.mediaRecorder.state === "recording") {
          this.mediaRecorder.stop();
          this.processAudioChunk();
          if (this.isRunning) {
            this.mediaRecorder.start();
          }
        }
      }, 5000);

      // Start auto-save interval (every 3 seconds)
      this.saveInterval = setInterval(() => {
        if (this.isRunning) {
          this.saveToLocalStorage();
        }
      }, 3000);

      console.log("✅ AudioExtractor started successfully");
    } catch (err) {
      console.error("❌ Failed to start audio:", err);
      this.isRunning = false;
      throw err;
    }
  }

  public ae_stop(): void {
    console.log('🛑 STOP called - isRunning:', this.isRunning);
    
    if (!this.isRunning) {
      console.log("⚠️ AudioExtractor is not running");
      return;
    }

    // CRITICAL: Set this FIRST to prevent any new processing
    this.isRunning = false;
    console.log('✅ isRunning set to FALSE');

    // Stop processing interval immediately
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('✅ Processing interval cleared');
    }

    // Stop save interval
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      console.log('✅ Save interval cleared');
    }

    // Clear any pending audio chunks
    const chunkCount = this.audioChunks.length;
    this.audioChunks = [];
    console.log(`✅ Cleared ${chunkCount} pending audio chunks`);

    // Stop recording
    if (this.mediaRecorder) {
      console.log('🎙️ Stopping MediaRecorder, state:', this.mediaRecorder.state);
      
      // Remove ALL event listeners to prevent any callbacks
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.onstart = null;
      
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
      console.log('✅ MediaRecorder stopped and nullified');
    }

    // Stop media stream
    if (this.stream) {
      const trackCount = this.stream.getTracks().length;
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('✅ Stopped track:', track.kind, track.label);
      });
      this.stream = null;
      console.log(`✅ Stopped ${trackCount} media tracks`);
    }

    console.log("🛑🛑🛑 AudioExtractor FULLY STOPPED 🛑🛑🛑");
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getTranscriptionContent(): string {
    return this.transcriptionLines.join("\n");
  }

  public getTranscriptionLines(): string[] {
    return [...this.transcriptionLines];
  }

  public clearTranscription(): void {
    this.transcriptionLines = [];
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Transcription cleared');
  }

  public downloadTranscription(): void {
    const content = this.getTranscriptionContent();
    if (!content) {
      console.log('⚠️ No transcription to download');
      return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 Transcription downloaded');
  }

  // Emergency stop - call this if nothing else works
  public emergencyStop(): void {
    console.log('🚨🚨🚨 EMERGENCY STOP ACTIVATED 🚨🚨🚨');
    this.isRunning = false;
    this.isProcessing = false;
    this.audioChunks = [];
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onerror = null;
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.onstart = null;
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
      } catch (e) {
        console.error('Error in emergency stop:', e);
      }
      this.mediaRecorder = null;
    }
    
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Error stopping tracks:', e);
      }
      this.stream = null;
    }
    
    console.log('🚨 EMERGENCY STOP COMPLETE 🚨');
  }
}