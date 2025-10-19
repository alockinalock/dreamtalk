/**
 * Live Conversation Transcription with Speaker Separation
 * 
 * This script listens to live audio from the microphone and transcribes it in real-time,
 * separating different speakers using OpenAI's Whisper API with speaker diarization.
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

const openai = new OpenAI({
  apiKey: "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",
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
      
      fs.appendFileSync(OUTPUT_FILE, transcription + "\n");
      console.log("📝 Transcribed:", transcription);
    } else if (response && response.text && response.text.trim()) {
      // Fallback to simple transcription if no segments
      const transcription = response.text.trim();
      
      fs.appendFileSync(OUTPUT_FILE, transcription + "\n");
      console.log("📝 Transcribed (no speaker info):", transcription);
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
  clearInterval(fileMonitorInterval);
  micInstance.stop();
  process.exit(0);
});

// Function to print current transcription file contents
function printTranscriptionFile() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const content = fs.readFileSync(OUTPUT_FILE, 'utf8');
      console.log("\n📄 Current transcription file contents:");
      console.log("=" .repeat(50));
      if (content.trim()) {
        console.log(content);
      } else {
        console.log("(File is empty - no transcriptions yet)");
      }
      console.log("=" .repeat(50));
    } else {
      console.log("\n📄 Transcription file not created yet");
    }
  } catch (err) {
    console.error("❌ Error reading transcription file:", err);
  }
}

// Set up periodic file monitoring every 15 seconds
const fileMonitorInterval = setInterval(() => {
  printTranscriptionFile();
}, 15000);

// Start mic
micInstance.start();
console.log("🎙️ Live conversation transcription with speaker separation started!");
console.log("📁 Transcriptions will be saved to:", OUTPUT_FILE);
console.log("👥 Multiple speakers will be separated with | delimiter");
console.log("📝 Format: text | text (no timestamps, no speaker labels)");
console.log("📄 Each chunk on a new line, file contents printed every 15 seconds");
console.log("⏹️  Press Ctrl+C to stop.");
