import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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",
});

async function testNewFormat(wavFilePath) {
  try {
    console.log(`🎵 Testing new format with: ${wavFilePath}`);
    
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavFilePath),
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log("✅ Transcription completed!");
    
    if (response && response.segments && response.segments.length > 0) {
      // Group segments by speaker
      const speakerGroups = {};
      
      response.segments.forEach((segment) => {
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
      
      console.log("\n📝 NEW FORMAT OUTPUT:");
      console.log("=" .repeat(50));
      console.log(transcription);
      console.log("=" .repeat(50));
      
      // Save to file
      const outputFile = path.join(__dirname, "new_format_test.txt");
      fs.writeFileSync(outputFile, transcription + "\n");
      console.log(`\n💾 Saved to: ${outputFile}`);
      
    } else if (response && response.text) {
      const transcription = response.text.trim();
      
      console.log("\n📝 NEW FORMAT OUTPUT (fallback):");
      console.log("=" .repeat(50));
      console.log(transcription);
      console.log("=" .repeat(50));
      
      const outputFile = path.join(__dirname, "new_format_test.txt");
      fs.writeFileSync(outputFile, transcription + "\n");
      console.log(`\n💾 Saved to: ${outputFile}`);
    }

  } catch (error) {
    console.error("❌ Transcription failed:", error.message);
  }
}

// Test with the longer file
testNewFormat("./longer_testing.wav");
