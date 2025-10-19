/**
 * Live Test for AudioExtractor
 * 
 * This script allows you to speak right now and test the AudioExtractor
 * in real-time. It will run for 30 seconds and then stop.
 */

import { AudioExtractor } from './audioExtractor.js';

async function liveTest() {
  console.log("🎙️ Starting Live AudioExtractor Test");
  console.log("📝 You can start speaking now!");
  console.log("⏱️  Test will run for 30 seconds");
  console.log("📁 Output will be saved to: live_test_transcription.txt");
  console.log("=" .repeat(50));
  
  // Create AudioExtractor instance
  const extractor = new AudioExtractor('./live_test_transcription.txt');
  
  // Start transcription
  extractor.ae_start();
  
  // Show countdown
  let timeLeft = 30;
  const countdown = setInterval(() => {
    timeLeft--;
    console.log(`⏰ Time remaining: ${timeLeft} seconds`);
    
    if (timeLeft <= 0) {
      clearInterval(countdown);
    }
  }, 1000);
  
  // Wait for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Stop transcription
  console.log("\n🛑 Stopping transcription...");
  extractor.ae_stop();
  
  // Show results
  console.log("\n📄 Final Transcription Results:");
  console.log("=" .repeat(50));
  
  const content = extractor.getTranscriptionContent();
  if (content.trim()) {
    console.log(content);
  } else {
    console.log("(No transcription captured - try speaking louder or check microphone)");
  }
  
  console.log("=" .repeat(50));
  console.log("✅ Live test completed!");
  console.log(`📁 Full results saved to: ${extractor.getOutputFile()}`);
  
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log("\n🛑 Test interrupted by user");
  process.exit(0);
});

// Start the test
liveTest().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
