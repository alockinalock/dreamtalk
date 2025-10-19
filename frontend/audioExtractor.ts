/**
 * Live Conversation Transcription with Speaker Separation
 * 
 * This module provides methods to start and stop live audio transcription
 * with speaker separation using OpenAI's Whisper API.
 * 
 * Output format: text | text (each chunk on new line, no timestamps)
 * 
 * Features:
 * - Real-time audio capture (5-second chunks)
 * - Speaker separation with | delimiter
 * - Clean text output (no timestamps or speaker labels)
 * - Proper WAV format conversion
 * - Error handling and recovery
 */

import fs from "fs";
import path from "path";
import mic from "mic";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export class AudioExtractor {
  private openai: OpenAI;
  private outputFile: string;
  private micInstance: any;
  private micInputStream: any;
  private audioChunks: Buffer[] = [];
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(outputPath?: string) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.outputFile = outputPath || path.join(__dirname, "transcription.txt");
    
    // Initialize mic with optimized settings for speech
    this.micInstance = mic({
      rate: "48000", // Use 48kHz as it's the default on macOS
      channels: "1",
      bitwidth: "16",
      encoding: "signed-integer",
      device: "default",
      exitOnSilence: 0,
    });
    
    this.micInputStream = this.micInstance.getAudioStream();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Collect audio data
    this.micInputStream.on("data", (data: Buffer) => {
      this.audioChunks.push(data);
    });

    // Handle mic errors
    this.micInputStream.on("error", (err: any) => {
      console.error("❌ Microphone error:", err);
    });
  }

  private createWavHeader(dataLength: number): Buffer {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20);  // audio format (PCM)
    header.writeUInt16LE(1, 22);  // number of channels
    header.writeUInt32LE(48000, 24); // sample rate
    header.writeUInt32LE(96000, 28); // byte rate
    header.writeUInt16LE(2, 32);  // block align
    header.writeUInt16LE(16, 34); // bits per sample
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  private async processAudioChunk(): Promise<void> {
    if (this.audioChunks.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    const audioBuffer = Buffer.concat(this.audioChunks);
    this.audioChunks = [];

    try {
      // Create proper WAV file with header
      const wavHeader = this.createWavHeader(audioBuffer.length);
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
      
      const tmpPath = path.join(__dirname, "temp.wav");
      fs.writeFileSync(tmpPath, wavBuffer);

      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

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
        
        // Check if we have multiple speakers
        const speakerKeys = Object.keys(speakerGroups);
        let transcription = "";
        
        if (speakerKeys.length > 1) {
          // Multiple speakers - use | delimiter
          const formattedSegments = speakerKeys.map(speaker => {
            return speakerGroups[speaker].join(" ");
          });
          transcription = formattedSegments.join(" | ");
        } else {
          // Single speaker - just the text
          transcription = speakerGroups[speakerKeys[0]].join(" ");
        }
        
        fs.appendFileSync(this.outputFile, transcription + "\n");
      } else if (response && response.text && response.text.trim()) {
        // Fallback to simple transcription if no segments
        const transcription = response.text.trim();
        fs.appendFileSync(this.outputFile, transcription + "\n");
      }

      fs.unlinkSync(tmpPath); // cleanup
    } catch (err) {
      console.error("❌ Transcription error:", err);
      // Don't lose audio data on error, add it back
      this.audioChunks.unshift(audioBuffer);
    } finally {
      this.isProcessing = false;
    }
  }

  public ae_start(): void {
    if (this.isRunning) {
      console.log("AudioExtractor is already running");
      return;
    }

    this.isRunning = true;
    
    // Start processing audio chunks every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processAudioChunk();
    }, 5000);

    // Start mic
    this.micInstance.start();
    console.log("🎙️ AudioExtractor started - transcribing to:", this.outputFile);
  }

  public ae_stop(): void {
    if (!this.isRunning) {
      console.log("AudioExtractor is not running");
      return;
    }

    this.isRunning = false;

    // Stop processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Stop mic
    this.micInstance.stop();
    console.log("🛑 AudioExtractor stopped");
  }

  public getOutputFile(): string {
    return this.outputFile;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getTranscriptionContent(): string {
    try {
      if (fs.existsSync(this.outputFile)) {
        return fs.readFileSync(this.outputFile, 'utf8');
      }
      return "";
    } catch (err) {
      console.error("❌ Error reading transcription file:", err);
      return "";
    }
  }
}

// Export a default instance for backward compatibility
export const audioExtractor = new AudioExtractor();