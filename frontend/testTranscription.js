import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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",
});

// Create a simple test audio file
const testAudioPath = path.join(__dirname, "test_audio.wav");

// Create a minimal WAV file with silence (for testing)
function createTestWavFile() {
  const sampleRate = 48000;
  const duration = 2; // 2 seconds
  const numSamples = sampleRate * duration;
  const dataLength = numSamples * 2; // 16-bit samples
  
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);  // PCM
  header.writeUInt16LE(1, 22);  // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);  // block align
  header.writeUInt16LE(16, 34); // bits per sample
  
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  
  // Create silent audio data
  const audioData = Buffer.alloc(dataLength, 0);
  
  const wavBuffer = Buffer.concat([header, audioData]);
  fs.writeFileSync(testAudioPath, wavBuffer);
  
  console.log(`Created test WAV file: ${testAudioPath}`);
}

async function testTranscription() {
  try {
    createTestWavFile();
    
    console.log("Testing OpenAI Whisper API...");
    
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testAudioPath),
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });
    
    console.log("✅ Transcription API is working!");
    console.log("Response:", response);
    
    // Clean up
    fs.unlinkSync(testAudioPath);
    
  } catch (error) {
    console.error("❌ Transcription test failed:", error.message);
  }
}

testTranscription();
