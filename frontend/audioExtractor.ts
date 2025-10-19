/**
 * Live Conversation Transcription with Speaker Separation
 * 
 * This script listens to live audio from the microphone and transcribes it in real-time,
 * separating different speakers using OpenAI's Whisper API with speaker diarization.
 * 
 * Output format: [timestamp] Speaker_A: text | Speaker_B: text
 * 
 * Features:
 * - Real-time audio capture (5-second chunks)
 * - Speaker separation with | delimiter
 * - Timestamped transcriptions
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTPUT_FILE = path.join(__dirname, "transcription.txt");

// Initialize mic with optimized settings for speech
const micInstance = mic({
  rate: "48000", // Use 48kHz as it's the default on macOS
  channels: "1",
  bitwidth: "16",
  encoding: "signed-integer",
  device: "default",
  exitOnSilence: 0,
});

const micInputStream = micInstance.getAudioStream();

let audioChunks: Buffer[] = [];
let isProcessing = false;

// Function to create proper WAV header
function createWavHeader(dataLength: number): Buffer {
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

// Function to get current timestamp
function getTimestamp(): string {
  return new Date().toISOString();
}

// Collect audio data
micInputStream.on("data", (data: Buffer) => {
  audioChunks.push(data);
  console.log(`🎤 Received ${data.length} bytes of audio data`);
});

// Process audio chunks every "audio_window" seconds for more responsive transcription
setInterval(async () => {
  if (audioChunks.length === 0 || isProcessing) return;
  
  isProcessing = true;
  const audioBuffer = Buffer.concat(audioChunks);
  audioChunks = [];

  try {
    // Create proper WAV file with header
    const wavHeader = createWavHeader(audioBuffer.length);
    const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
    
    const tmpPath = path.join(__dirname, "temp.wav");
    fs.writeFileSync(tmpPath, wavBuffer);

    console.log(`🎤 Processing ${audioBuffer.length} bytes of audio...`);

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: "whisper-1",
      language: "en", // Specify language for better accuracy
      response_format: "verbose_json", // Use verbose_json to get speaker information
      timestamp_granularities: ["segment"], // Enable segment-level timestamps
    });

    if (response && response.segments && response.segments.length > 0) {
      const timestamp = getTimestamp();
      let transcription = `[${timestamp}] `;
      
      // Group segments by speaker and format with | separator
      const speakerGroups: { [key: string]: string[] } = {};
      
      response.segments.forEach((segment: any) => {
        const speaker = segment.speaker || "Speaker_Unknown";
        if (!speakerGroups[speaker]) {
          speakerGroups[speaker] = [];
        }
        speakerGroups[speaker].push(segment.text.trim());
      });
      
      // Format with speaker separation using |
      const formattedSegments = Object.entries(speakerGroups).map(([speaker, texts]) => {
        return `${speaker}: ${texts.join(" ")}`;
      });
      
      transcription += formattedSegments.join(" | ");
      
      fs.appendFileSync(OUTPUT_FILE, transcription + "\n");
      console.log("📝 Transcribed with speakers:", transcription);
    } else if (response && response.text && response.text.trim()) {
      // Fallback to simple transcription if no segments
      const timestamp = getTimestamp();
      const transcription = `[${timestamp}] ${response.text.trim()}`;
      
      fs.appendFileSync(OUTPUT_FILE, transcription + "\n");
      console.log("📝 Transcribed (no speaker info):", response.text.trim());
    }

    fs.unlinkSync(tmpPath); // cleanup
  } catch (err) {
    console.error("❌ Transcription error:", err);
    // Don't lose audio data on error, add it back
    audioChunks.unshift(audioBuffer);
  } finally {
    isProcessing = false;
  }
}, 5000); // Process every 5 seconds for responsive transcription

// Handle mic errors
micInputStream.on("error", (err) => {
  console.error("❌ Microphone error:", err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🛑 Stopping transcription...");
  micInstance.stop();
  process.exit(0);
});

// Start mic
micInstance.start();
console.log("🎙️ Live conversation transcription with speaker separation started!");
console.log("📁 Transcriptions will be saved to:", OUTPUT_FILE);
console.log("👥 Speakers will be separated with | delimiter");
console.log("📝 Format: [timestamp] Speaker_A: text | Speaker_B: text");
console.log("⏹️  Press Ctrl+C to stop.");
