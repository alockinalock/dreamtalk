/**
 * Test the refactored AudioExtractor
 */

import { AudioExtractor } from './audioExtractor.js';

async function testAudioExtractor() {
  console.log("🧪 Testing AudioExtractor...");
  
  // Create instance
  const extractor = new AudioExtractor('./test_transcription.txt');
  
  console.log("📁 Output file:", extractor.getOutputFile());
  console.log("🔄 Is active:", extractor.isActive());
  
  // Start transcription
  console.log("▶️ Starting transcription...");
  extractor.ae_start();
  
  // Wait 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check content
  const content = extractor.getTranscriptionContent();
  console.log("📄 Current content:", content);
  
  // Stop transcription
  console.log("⏹️ Stopping transcription...");
  extractor.ae_stop();
  
  console.log("✅ Test completed");
}

testAudioExtractor().catch(console.error);
