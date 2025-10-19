/**
 * Browser-compatible AudioExtractor
 * 
 * This version uses the Web Audio API and MediaRecorder for browser compatibility
 * and communicates with the Node.js AudioExtractor via a simple API.
 */

export class AudioExtractorBrowser {
  private isRunning: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private outputFile: string;

  constructor(outputPath?: string) {
    this.outputFile = outputPath || 'transcription.txt';
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log("AudioExtractor is already running");
      return;
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(5000); // Collect data every 5 seconds
      this.isRunning = true;

      // Process audio chunks every 5 seconds
      this.processingInterval = setInterval(() => {
        this.processAudioChunk();
      }, 5000);

      console.log("🎙️ AudioExtractor started - transcribing to:", this.outputFile);
    } catch (error) {
      console.error("❌ Failed to start audio recording:", error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log("AudioExtractor is not running");
      return;
    }

    this.isRunning = false;

    // Stop MediaRecorder
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log("🛑 AudioExtractor stopped");
  }

  private async processAudioChunk(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      // Create blob from chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Convert to base64 for transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to backend for transcription
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: 'audio/webm'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.transcription) {
          // Append to transcription file
          await fetch('/api/append-transcription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: result.transcription,
              outputFile: this.outputFile
            })
          });
        }
      }
    } catch (error) {
      console.error("❌ Failed to process audio chunk:", error);
    }
  }

  public getOutputFile(): string {
    return this.outputFile;
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}

// Export a default instance
export const audioExtractor = new AudioExtractorBrowser();
