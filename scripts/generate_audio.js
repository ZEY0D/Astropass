// scripts/generate_audio.js

// Import necessary libraries
require('dotenv').config({ path: '.env' }); // Load API key from .env file
const { ElevenLabsClient } = require("elevenlabs"); // ElevenLabs library
const fs = require('fs'); // Node.js file system library
const path = require('path'); // Node.js path library

// --- Safety check for API key ---
if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found. Please check your backend/.env file.');
    process.exit(1); // Exit the script if the key is missing
}

// Create a new instance of the ElevenLabs client
const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

// Path to your story data and where to save audio
const storiesFilePath = path.join(__dirname, '../data/stories_young_explorer.json');
const audioOutputPath = path.join(__dirname, '../public/audio/');

// Main function to generate audio
async function generateAudio() {
    console.log("🎙️ Starting audio generation...");

    // 1. Read the story data
    const stories = JSON.parse(fs.readFileSync(storiesFilePath, 'utf-8'));

    // 2. Loop through each story
    for (const story of stories) {
        const fullAudioPath = path.join(audioOutputPath, story.audio_filename);
        console.log(`➡️ Generating audio for "${story.title}"...`);

        try {
            // 3. Call the ElevenLabs API
            const audioStream = await elevenlabs.generate({
                voice: "Rachel", // You can choose different voices from their library
                text: story.text,
                model_id: "eleven_multilingual_v2"
            });

            // [FIX] We will collect the audio chunks here
            const chunks = [];
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }

            // [FIX] Combine all chunks into a single buffer
            const audioBuffer = Buffer.concat(chunks);
            
            // [FIX] Write the complete audio buffer to the file
            fs.writeFileSync(fullAudioPath, audioBuffer);
            
            console.log(`✅ Successfully saved: ${story.audio_filename}`);

        } catch (error) {
            console.error(`❌ Error generating audio for "${story.title}":`, error);
        }
    }

    console.log("🎉 Audio generation complete!");
}

// Run the function
generateAudio();









// // // Import necessary libraries
// // require('dotenv').config({ path: '../.env' }); // Load API key from .env file
// // const { ElevenLabsClient } = require("elevenlabs"); // ElevenLabs library
// // const fs = require('fs'); // Node.js file system library
// // const path = require('path'); // Node.js path library

// // // Create a new instance of the ElevenLabs client
// // const elevenlabs = new ElevenLabsClient({
// //     apiKey: process.env.ELEVENLABS_API_KEY,
// // });



// // scripts/generate_audio.js
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// const { ElevenLabsClient } = require('elevenlabs'); // or 'elevenlabs-node' if you installed that
// const fs = require('fs');

// // quick check to confirm env loaded
// if (!process.env.ELEVENLABS_API_KEY) {
//   console.error('❌ ELEVENLABS_API_KEY not found. Check backend/.env and that it has no quotes/spaces.');
//   process.exit(1);
// }

// const elevenlabs = new ElevenLabsClient({
//   apiKey: process.env.ELEVENLABS_API_KEY,
// });


// // Path to your story data and where to save audio
// const storiesFilePath = path.join(__dirname, '../data/stories_young_explorer.json');
// const audioOutputPath = path.join(__dirname, '../public/audio/');

// // Main function to generate audio
// async function generateAudio() {
//     console.log("Starting audio generation...");

//     // 1. Read the story data
//     const stories = JSON.parse(fs.readFileSync(storiesFilePath, 'utf-8'));

//     // 2. Loop through each story
//     for (const story of stories) {
//         const fullAudioPath = path.join(audioOutputPath, story.audio_filename);
//         console.log(`Generating audio for "${story.title}"...`);

//         try {
//             // 3. Call the ElevenLabs API
//             const audio = await elevenlabs.generate({
//                 voice: "Rachel", // You can choose different voices from their library
//                 text: story.text,
//                 model_id: "eleven_multilingual_v2"
//             });

//             // 4. Save the audio file
//             const fileStream = fs.createWriteStream(fullAudioPath);
//             audio.pipe(fileStream);

//             // Wait for the file to finish writing
//             await new Promise((resolve) => fileStream.on('finish', resolve));
//             console.log(`Successfully saved: ${story.audio_filename}`);

//         } catch (error) {
//             console.error(`Error generating audio for "${story.title}":`, error);
//         }
//     }

//     console.log("Audio generation complete!");
// }

// // Run the function
// generateAudio();