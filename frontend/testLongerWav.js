import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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",
});

async function testLongerWavTranscription(wavFilePath) {
  try {
    console.log(`🎵 Testing longer audio file: ${wavFilePath}`);
    
    if (!fs.existsSync(wavFilePath)) {
      console.error(`❌ File not found: ${wavFilePath}`);
      return;
    }

    const fileStats = fs.statSync(wavFilePath);
    console.log(`📁 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📁 File size: ${(fileStats.size / 1024).toFixed(0)} KB`);

    console.log("🔄 Sending to OpenAI Whisper API...");
    
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavFilePath),
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log("✅ Transcription completed!");
    console.log(`📊 Audio duration: ${response.duration?.toFixed(2)} seconds`);
    console.log(`📊 Number of segments: ${response.segments?.length || 0}`);

    if (response && response.segments && response.segments.length > 0) {
      console.log("\n👥 Speaker Analysis:");
      
      // Analyze speakers
      const speakerCounts = {};
      response.segments.forEach((segment) => {
        const speaker = segment.speaker || "Speaker_Unknown";
        speakerCounts[speaker] = (speakerCounts[speaker] || 0) + 1;
      });
      
      console.log("Speaker distribution:");
      Object.entries(speakerCounts).forEach(([speaker, count]) => {
        console.log(`  ${speaker}: ${count} segments`);
      });
      
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
      const outputFile = path.join(__dirname, "longer_test_transcription.txt");
      fs.writeFileSync(outputFile, transcription + "\n");
      console.log(`\n💾 Saved to: ${outputFile}`);
      
      // Also show detailed segments
      console.log("\n📝 Detailed Segments:");
      response.segments.forEach((segment, index) => {
        const speaker = segment.speaker || "Speaker_Unknown";
        console.log(`${index + 1}. [${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s] ${speaker}: ${segment.text.trim()}`);
      });
      
    } else if (response && response.text) {
      console.log("\n📝 Simple Transcription (no speaker info):");
      const timestamp = new Date().toISOString();
      const transcription = `[${timestamp}] ${response.text.trim()}`;
      console.log(transcription);
      
      // Save to file
      const outputFile = path.join(__dirname, "longer_test_transcription.txt");
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

// Test with the longer file
testLongerWavTranscription("./longer_testing.wav");
