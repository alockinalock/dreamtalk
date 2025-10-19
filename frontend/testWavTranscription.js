import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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",
});

async function testWavTranscription(wavFilePath) {
  try {
    console.log(`🎵 Testing transcription of: ${wavFilePath}`);
    
    if (!fs.existsSync(wavFilePath)) {
      console.error(`❌ File not found: ${wavFilePath}`);
      return;
    }

    const fileStats = fs.statSync(wavFilePath);
    console.log(`📁 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    console.log("🔄 Sending to OpenAI Whisper API...");
    
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavFilePath),
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log("✅ Transcription completed!");
    console.log("\n📝 Full Response:");
    console.log(JSON.stringify(response, null, 2));

    if (response && response.segments && response.segments.length > 0) {
      console.log("\n👥 Speaker-Separated Transcription:");
      
      // Group segments by speaker
      const speakerGroups = {};
      
      response.segments.forEach((segment) => {
        const speaker = segment.speaker || "Speaker_Unknown";
        if (!speakerGroups[speaker]) {
          speakerGroups[speaker] = [];
        }
        speakerGroups[speaker].push({
          text: segment.text.trim(),
          start: segment.start,
          end: segment.end
        });
      });
      
      // Format with speaker separation
      const timestamp = new Date().toISOString();
      let transcription = `[${timestamp}] `;
      
      const formattedSegments = Object.entries(speakerGroups).map(([speaker, segments]) => {
        const texts = segments.map(s => s.text).join(" ");
        return `${speaker}: ${texts}`;
      });
      
      transcription += formattedSegments.join(" | ");
      
      console.log(transcription);
      
      // Save to file
      const outputFile = path.join(__dirname, "test_transcription.txt");
      fs.writeFileSync(outputFile, transcription + "\n");
      console.log(`\n💾 Saved to: ${outputFile}`);
      
    } else if (response && response.text) {
      console.log("\n📝 Simple Transcription (no speaker info):");
      const timestamp = new Date().toISOString();
      const transcription = `[${timestamp}] ${response.text.trim()}`;
      console.log(transcription);
      
      // Save to file
      const outputFile = path.join(__dirname, "test_transcription.txt");
      fs.writeFileSync(outputFile, transcription + "\n");
      console.log(`\n💾 Saved to: ${outputFile}`);
    }

  } catch (error) {
    console.error("❌ Transcription failed:", error.message);
    if (error.status) {
      console.error(`Status: ${error.status}`);
    }
  }
}

// Get the WAV file path from command line argument
const wavFilePath = process.argv[2];

if (!wavFilePath) {
  console.log("Usage: node testWavTranscription.js <path-to-wav-file>");
  console.log("Example: node testWavTranscription.js ./my_audio.wav");
  process.exit(1);
}

testWavTranscription(wavFilePath);

