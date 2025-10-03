const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// AI and Audio Libraries
const OpenAI = require('openai');
const { ElevenLabsClient } = require("elevenlabs");
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- AI and Audio Client Setup ---

// Groq (for story text generation)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ElevenLabs (for audio narration)
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});


// --- Prompt Creation Functions ---

// PROMPT 1: The "Personalized Adventure" Story
function createAdventurePrompt(userInputs) {
  const { age, language, interests, name } = userInputs;
  return `
    Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
    Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
    1. USER PARAMETERS:
    - Name: ${name}
    - Age: ${age}
    - Language: ${language}
    - Stated Interests: ${interests.join(', ')}
    2. STORYTELLING GUIDELINES: ... (rest of prompt)
    Now, generate a story for ${name}.
  `;
}

// PROMPT 2: The "Astronaut Role" Story
function createAstronautRolePrompt(userInputs) {
  const { age, language, interests, name } = userInputs;
  return `
    You are an expert storyteller for children and teenagers, creating a long, immersive, interactive, empathy-focused story about the role of an astronaut.
    Your task is to generate the story in a structured JSON format based on the following 5-part flow.
    ## User Parameters:
    - Name: ${name}
    - Age: ${age}
    - Language: ${language}
    - Interests: ${interests.join(', ')}
    ## Story Structure (Generate one story_card for each section):
    1. Hook / First Scene: ...
    2. Characteristics of an Astronaut: ...
    3. Life of an Astronaut: ...
    4. Impact of an Astronaut: ...
    5. Characteristics (Revisited): ...
    ## Final Quiz: ...
    ## OUTPUT FORMAT: ...
  `;
}


// --- API Endpoints ---

// Story Generation Endpoint (Powered by Groq)
app.post('/api/generate-story', async (req, res) => {
  let text = ''; 
  try {
    const userInputs = req.body;
    console.log("Received request for story type:", userInputs.story_type);

    if (!userInputs.name || !userInputs.age || !userInputs.interests || !userInputs.story_type) {
      return res.status(400).json({ error: "Name, age, interests, and story_type are required." });
    }

    let masterPrompt;
    if (userInputs.story_type === 'astronaut_role') {
      masterPrompt = createAstronautRolePrompt(userInputs);
    } else {
      masterPrompt = createAdventurePrompt(userInputs);
    }

    console.log("Sending prompt to Groq...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful assistant designed to output JSON." },
        { role: "user", content: masterPrompt }
      ],
      response_format: { type: "json_object" }, 
    });

    const jsonResponse = completion.choices[0].message.content;
    text = jsonResponse;

    console.log("AI Raw Response received from Groq. Parsing now...");
    
    const storyJson = JSON.parse(text);
    res.json(storyJson);

  } catch (error) {
    console.error("Error generating story:", error);
    res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
  }
});

// NEW: Audio Generation Endpoint (Powered by ElevenLabs)
app.post('/api/generate-audio', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required." });
      }

      console.log("Received request to generate audio...");

      const fileName = `story_audio_${Date.now()}.mp3`;
      const filePath = path.join(__dirname, 'public/audio', fileName);
      
      const audio = await elevenlabs.generate({
        voice: "Rachel",
        text: text,
        model_id: "eleven_multilingual_v2"
      });

      const fileStream = fs.createWriteStream(filePath);
      audio.pipe(fileStream);

      fileStream.on('finish', () => {
        console.log("Audio file saved:", fileName);
        res.json({ audioUrl: `http://localhost:${PORT}/audio/${fileName}` });
      });

      fileStream.on('error', (err) => {
          console.error("Error writing audio file:", err);
          res.status(500).json({ error: "Failed to save audio file." });
      });

    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ error: "Failed to generate audio." });
    }
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 Multi-Story Server (Groq & ElevenLabs Edition) is running at http://localhost:${PORT}`);
});












// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // --- AI Setup (Using Groq) ---
// const groq = new OpenAI({
//   apiKey: process.env.GROQ_API_KEY,
//   baseURL: 'https://api.groq.com/openai/v1',
// });

// // --- PROMPT 1: The Original "Personalized Adventure" Story (FIXED) ---
// function createAdventurePrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   // FIXED: Restored the full, detailed prompt for the adventure story.
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.

//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}

//     2. STORYTELLING GUIDELINES:
//     - Create a completely original story based on the user's interests.
//     - Empathy-Focused: The story must connect emotionally. Show astronaut struggles, teamwork, and the joy of discovery.
//     - Age-Specific:
//       - For kids (<=12): Use simpler words, a playful and wondrous tone. Focus on action and fun facts.
//       - For teens (13+): Use a deeper, more inspirational narrative. Connect the story to real-world challenges like climate change, technology, and human collaboration.
//     - Personalization: Use the user's name, "${name}", throughout the story to make them the main character.
//     - Use Real NASA Resources: Base the story on real missions (ISS, Artemis, Hubble) and real astronaut anecdotes.

//     3. INTERACTIVITY & GAMIFICATION:
//     - After EACH story card, create exactly 2 multiple-choice quiz questions related to that card's content.
//     - Quizzes should be engaging and reinforce learning.

//     4. MULTIMEDIA ENHANCEMENTS:
//     - For each story card, suggest a real, publicly available NASA video link for the "video" field.
//     - For the "image" field, provide a URL to a real, relevant, high-quality space photo from images.nasa.gov.

//     5. OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object.
//     - The JSON object must strictly follow this structure:
//     {
//       "story_title": "A creative, engaging title for the whole story",
//       "story_cards": [
//         {
//           "card_title": "Title for the first part of the story",
//           "content": "Personalized, age-specific story text for this card, at least 150 words long. Use the name '${name}' here.",
//           "quiz": [
//             {
//               "question": "First quiz question for this card?",
//               "options": ["Option A", "Option B", "Option C"],
//               "correct_answer": "The correct option text"
//             },
//             {
//               "question": "Second quiz question for this card?",
//               "options": ["Option X", "Option Y", "Option Z"],
//               "correct_answer": "The correct option text"
//             }
//           ],
//           "media": {
//             "video": "https://www.nasa.gov/valid-video-link-example",
//             "image": "https://images.nasa.gov/details-PIA23701"
//           }
//         }
//       ]
//     }

//     Now, generate a story for ${name}.
//   `;
// }

// // --- PROMPT 2: The NEW "Astronaut Role" Story ---
// function createAstronautRolePrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   return `
//     Create an engaging interactive story about astronauts personalized for ${name} (age ${age}) who likes ${interests.join(', ')}.
    
//     ## CRITICAL REQUIREMENTS:
//     1. Start with a compelling hook that makes readers curious
//     2. Explore essential astronaut characteristics
//     3. Show the challenging daily life in space
//     4. Demonstrate astronaut's impact and consequences if they didn't exist
//     5. Return to characteristics with reflective question
//     6. Output MUST be valid JSON only
    
//     ## STORY FLOW:
//     Generate this exact JSON structure with 5 story cards:
    
//     {
//       "story_title": "Engaging title about space exploration",
//       "story_cards": [
//         {
//           "card_title": "The Big Question",
//           "content": "Start with intriguing hook that connects to ${name}'s interests in ${interests[0]}. Make them wonder about space challenges and create immediate curiosity about what comes next.",
//           "interactive_element": "Rhetorical question that engages ${name}'s imagination"
//         },
//         {
//           "card_title": "What Makes an Astronaut",
//           "content": "Describe key traits like problem-solving, resilience, teamwork. Ask ${name} what THEY think is most important for an astronaut to have.",
//           "interactive_element": "Direct question to ${name} about essential astronaut qualities"
//         },
//         {
//           "card_title": "Life in Space: The Reality",
//           "content": "Show difficult aspects - isolation, dangerous spacewalks, equipment failures, cramped living. Make it relatable to ${name}'s age level. Include a specific challenge astronauts face daily.",
//           "interactive_element": "Scenario: 'What would you miss most about Earth?'"
//         },
//         {
//           "card_title": "Why Astronauts Matter",
//           "content": "Explain their crucial role - scientific research, Earth monitoring, technology development. Show what WOULDN'T exist without astronauts (medical tech, weather satellites, etc).",
//           "interactive_element": "Make it personal: 'Without astronauts, your ${interests[1]} might not work the same way...'"
//         },
//         {
//           "card_title": "The Final Reflection", 
//           "content": "Return to the astronaut characteristics. Ask if ${name} has changed their mind about what's most important after seeing the challenges and impact.",
//           "interactive_element": "Compare their initial thoughts with new perspective: 'Now knowing what you know, would you still pick the same quality as most important?'"
//         }
//       ]
//     }
    
//     ## WRITING STYLE:
//     - Age-appropriate for ${age}
//     - Interactive and conversational
//     - Include ${name} personally throughout
//     - Balance education with engagement
//     - Create emotional connection to astronaut's experience
    
//     Remember: Output ONLY valid JSON, no other text.
//   `;
// }
// // --- The Main API Endpoint ---
// app.post('/api/generate-story', async (req, res) => {
//   let text = ''; 
//   try {
//     const userInputs = req.body;
//     console.log("Received request for story type:", userInputs.story_type);

//     if (!userInputs.name || !userInputs.age || !userInputs.interests || !userInputs.story_type) {
//       return res.status(400).json({ error: "Name, age, interests, and story_type are required." });
//     }

//     let masterPrompt;
//     if (userInputs.story_type === 'astronaut_role') {
//       masterPrompt = createAstronautRolePrompt(userInputs);
//     } else {
//       masterPrompt = createAdventurePrompt(userInputs);
//     }

//     console.log("Sending prompt to Groq...");

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
//     text = jsonResponse;

//     console.log("AI Raw Response received from Groq. Parsing now...");
    
//     const storyJson = JSON.parse(text);
//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Multi-Story Server (Groq Edition) is running at http://localhost:${PORT}`);
// });





// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // --- AI Setup (Using Groq) ---
// const groq = new OpenAI({
//   apiKey: process.env.GROQ_API_KEY,
//   baseURL: 'https://api.groq.com/openai/v1',
// });

// // --- PROMPT 1: The Original "Personalized Adventure" Story ---
// function createAdventurePrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   // This is our original, working prompt
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}
//     2. STORYTELLING GUIDELINES: ... (rest of the prompt is the same)
//     Now, generate a story for ${name}.
//   `;
// }

// // --- PROMPT 2: The NEW "Astronaut Role" Story ---
// function createAstronautRolePrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   // This is your new, detailed prompt
//   return `
//     You are an expert storyteller for children and teenagers, creating a long, immersive, interactive, empathy-focused story about the role of an astronaut.

//     Your task is to generate the story in a structured JSON format based on the following 5-part flow. Use the user's parameters to personalize the story.

//     ## User Parameters:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Interests: ${interests.join(', ')}

//     ## Story Structure (Generate one story_card for each section):
//     1.  **Hook / First Scene:** Start with an empathy hook. For example: “Hey ${name}, have you ever wondered what would happen if an astronaut made a mistake during a critical mission? It's a heavy thought! But before we explore that, let’s see what their life is really like…”
//     2.  **Characteristics of an Astronaut:** Introduce traits like discipline, teamwork, and curiosity. Narrate a simple game. For example: "Imagine I'm giving you a special, shiny space wrench, ${name}. Hold onto it for me, it's very important. I might ask you about it later. This is about responsibility, a key astronaut trait!"
//     3.  **Life of an Astronaut:** Describe daily routines. Add an interactive choice. For example: "Suddenly, an alarm blinks! You have two alerts, ${name}. Do you want to help fix the solar panel outside or check the oxygen system inside first?"
//     4.  **Impact of an Astronaut:** Show the impact on Earth if astronauts didn't exist. For example: "Without the work of astronauts on stations like the ISS, we might not have the accurate GPS in your family's car, or the weather forecasts that tell you if you can play football this weekend."
//     5.  **Characteristics (Revisited):** Return to the traits. Ask the user a reflective question. For example: "We talked about responsibility with that wrench earlier, ${name}. Teamwork, staying calm under pressure... after seeing all this, do you think you have what it takes to be an astronaut?"

//     ## Final Quiz:
//     After the 5 story cards, create a final quiz of 3 multiple-choice questions about the story you just told.

//     ## OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text or explanations outside the JSON.
//     - Follow this structure exactly:
//     {
//       "story_title": "What Does It Take to Be an Astronaut?",
//       "story_cards": [
//         { "card_title": "A Big Question", "content": "...", "quiz": [...] },
//         { "card_title": "An Astronaut's Qualities", "content": "...", "quiz": [...] },
//         { "card_title": "A Day in Zero Gravity", "content": "...", "quiz": [...] },
//         { "card_title": "A World Without Astronauts", "content": "...", "quiz": [...] },
//         { "card_title": "Could You Be an Astronaut?", "content": "...", "quiz": [...] }
//       ]
//     }
//   `;
// }

// // --- The Main API Endpoint ---
// app.post('/api/generate-story', async (req, res) => {
//   let text = ''; 
//   try {
//     const userInputs = req.body;
//     console.log("Received request for story type:", userInputs.story_type);

//     if (!userInputs.name || !userInputs.age || !userInputs.interests || !userInputs.story_type) {
//       return res.status(400).json({ error: "Name, age, interests, and story_type are required." });
//     }

//     let masterPrompt;
//     // We choose which prompt to use based on the user's selection
//     if (userInputs.story_type === 'astronaut_role') {
//       masterPrompt = createAstronautRolePrompt(userInputs);
//     } else {
//       masterPrompt = createAdventurePrompt(userInputs); // Default to adventure
//     }

//     console.log("Sending prompt to Groq...");

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
//     text = jsonResponse;

//     console.log("AI Raw Response received from Groq. Parsing now...");
    
//     const storyJson = JSON.parse(text);
//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Multi-Story Server (Groq Edition) is running at http://localhost:${PORT}`);
// });









// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// // We use the OpenAI library because Groq's API is compatible with it
// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // --- AI Setup (Using Groq) ---
// const groq = new OpenAI({
//   apiKey: process.env.GROQ_API_KEY,
//   baseURL: 'https://api.groq.com/openai/v1',
// });

// // This function creates the detailed instructions for our AI Storyteller
// function createMasterPrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.

//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}

//     2. STORYTELLING GUIDELINES:
//     - Empathy-Focused: The story must connect emotionally. Show astronaut struggles, teamwork, and the joy of discovery.
//     - Age-Specific:
//       - For kids (<=12): Use simpler words, a playful and wondrous tone. Focus on action and fun facts.
//       - For teens (13+): Use a deeper, more inspirational narrative. Connect the story to real-world challenges like climate change, technology, and human collaboration.
//     - Personalization: Use the user's name, "${name}", throughout the story to make them the main character.
//     - Use Real NASA Resources: Base the story on real missions (ISS, Artemis, Hubble) and real astronaut anecdotes.

//     3. INTERACTIVITY & GAMIFICATION:
//     - After EACH story card, create exactly 2 multiple-choice quiz questions related to that card's content.
//     - Quizzes should be engaging and reinforce learning.

//     4. MULTIMEDIA ENHANCEMENTS:
//     - For each story card, suggest a real, publicly available NASA video link for the "video" field.
//     - For the "image" field, provide a URL to a real, relevant, high-quality space photo from images.nasa.gov.

//     5. OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object.
//     - The JSON object must strictly follow this structure:
//     {
//       "story_title": "A creative, engaging title for the whole story",
//       "story_cards": [
//         {
//           "card_title": "Title for the first part of the story",
//           "content": "Personalized, age-specific story text for this card, at least 150 words long. Use the name '${name}' here.",
//           "quiz": [
//             {
//               "question": "First quiz question for this card?",
//               "options": ["Option A", "Option B", "Option C"],
//               "correct_answer": "The correct option text"
//             },
//             {
//               "question": "Second quiz question for this card?",
//               "options": ["Option X", "Option Y", "Option Z"],
//               "correct_answer": "The correct option text"
//             }
//           ],
//           "media": {
//             "video": "https://www.nasa.gov/valid-video-link-example",
//             "image": "https://images.nasa.gov/details-PIA23701"
//           }
//         }
//       ]
//     }

//     Now, generate a story for ${name}.
//   `;
// }

// // --- Dynamic Storyteller Endpoint (Powered by Groq) ---
// app.post('/api/generate-story', async (req, res) => {
//   let text = ''; 
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);

//     console.log("Sending prompt to Groq...");

//     const completion = await groq.chat.completions.create({
//       // NOTE: If this model is decommissioned, find the new one at https://console.groq.com/docs/models
//       model: "llama-3.1-8b-instant",
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
//     text = jsonResponse;

//     console.log("AI Raw Response received from Groq. Parsing now...");
    
//     const storyJson = JSON.parse(text);

//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     console.log("--- AI RAW TEXT THAT CAUSED ERROR ---");
//     console.log(text);
//     console.log("--- END OF AI RAW TEXT ---");
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server (Groq Edition) is running at http://localhost:${PORT}`);
// });







// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// const groq = new OpenAI({
//   apiKey: process.env.GROQ_API_KEY,
//   baseURL: 'https://api.groq.com/openai/v1',
// });

// function createMasterPrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}
//     2. STORYTELLING GUIDELINES: ...
//     3. INTERACTIVITY & GAMIFICATION: ...
//     4. MULTIMEDIA ENHANCEMENTS: ...
//     5. OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object.
//     - The JSON object must strictly follow this structure:
//     { "story_title": "A creative, engaging title for the whole story", "story_cards": [ ... ] }
//     Now, generate a story for ${name}.
//   `;
// }

// app.post('/api/generate-story', async (req, res) => {
//   // We define 'text' here so it's accessible in the catch block
//   let text = ''; 
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);

//     console.log("Sending prompt to Groq...");

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
    
//     // Assign the raw response to our 'text' variable
//     text = jsonResponse;

//     console.log("AI Raw Response received from Groq. Parsing now...");
    
//     const storyJson = JSON.parse(text);

//     res.json(storyJson);

//   } catch (error) {
//     // --- THIS IS THE IMPORTANT CHANGE ---
//     // Now, if an error happens, we will log the actual text that caused it.
//     console.error("Error generating story:", error);
//     console.log("--- AI RAW TEXT THAT CAUSED ERROR ---");
//     console.log(text); // Log the raw text
//     console.log("--- END OF AI RAW TEXT ---");
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server (Groq Edition) is running at http://localhost:${PORT}`);
// });






// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// // We still use the OpenAI library because Groq is compatible with it
// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // --- AI Setup (Now using Groq) ---
// const groq = new OpenAI({
//   // CHANGE 1: Use the Groq API key from your .env file
//   apiKey: process.env.GROQ_API_KEY,
//   // CHANGE 2: This magic line tells the library to talk to Groq's servers
//   baseURL: 'https://api.groq.com/openai/v1',
// });

// // This Master Prompt function is IDENTICAL. It works with any powerful AI.
// function createMasterPrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   return `
//     Role: You are an empathetic NASA-inspired storyteller...
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
//     1. USER PARAMETERS: ... (rest of your prompt is the same)
//     2. STORYTELLING GUIDELINES: ...
//     3. INTERACTIVITY & GAMIFICATION: ...
//     4. MULTIMEDIA ENHANCEMENTS: ...
//     5. OUTPUT FORMAT: ...
//     Now, generate a story for ${name}.
//   `;
// }

// // --- Dynamic Storyteller Endpoint (Powered by Groq) ---
// app.post('/api/generate-story', async (req, res) => {
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);

//     console.log("Sending prompt to Groq...");

//     // The API call is almost identical to the OpenAI one
//     const completion = await groq.chat.completions.create({
//       // We use a model available on Groq, like Llama 3
// model: "llama-3.1-8b-instant",
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
//     console.log("AI Raw Response received from Groq. Parsing now...");
    
//     const storyJson = JSON.parse(jsonResponse);

//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server (Groq Edition) is running at http://localhost:${PORT}`);
// });







// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// // NEW: Import the OpenAI library
// const OpenAI = require('openai');

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// // --- AI Setup ---
// // Initialize the OpenAI Client with your API key
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // This Master Prompt function is IDENTICAL to before. The instructions are universal.
// function createMasterPrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}
//     2. STORYTELLING GUIDELINES: ... (rest of your prompt is the same)
//     3. INTERACTIVITY & GAMIFICATION: ...
//     4. MULTIMEDIA ENHANCEMENTS: ...
//     5. OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object.
//     - The JSON object must strictly follow this structure:
//     { "story_title": "...", "story_cards": [ ... ] }
//     Now, generate a story for ${name}.
//   `;
// }

// // --- NEW DYNAMIC STORYTELLER ENDPOINT (using OpenAI) ---
// app.post('/api/generate-story', async (req, res) => {
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);

//     console.log("Sending prompt to OpenAI...");

//     // Call the OpenAI API
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo-1106", // A reliable and fast model that supports JSON mode
//       messages: [
//         { role: "system", content: "You are a helpful assistant designed to output JSON." },
//         { role: "user", content: masterPrompt }
//       ],
//       // This is a powerful feature that forces the AI to return valid JSON
//       response_format: { type: "json_object" }, 
//     });

//     const jsonResponse = completion.choices[0].message.content;
//     console.log("AI Raw Response received. Parsing now...");
    
//     const storyJson = JSON.parse(jsonResponse);

//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server (OpenAI Edition) is running at http://localhost:${PORT}`);
// });










// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const app = express();
// const PORT = 3001;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// function createMasterPrompt(userInputs) {
//   // ... (This function remains exactly the same as before)
//   const { age, language, interests, name } = userInputs;
//   return `
//     Role: You are an empathetic NASA-inspired storyteller...
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.
//     // ... (rest of the prompt is the same)
//     Now, generate a story for ${name}.
//   `;
// }

// app.post('/api/generate-story', async (req, res) => {
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);

//     // --- IMPROVEMENT: Added Safety Settings ---
//     const safetySettings = [
//       { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
//       { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
//       { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
//       { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
//     ];
    
//     // Pass the prompt and safety settings to the model
//     const result = await model.generateContent({
//       contents: [{ role: "user", parts: [{ text: masterPrompt }] }],
//       safetySettings,
//     });
//     // --- END IMPROVEMENT ---

//     const response = await result.response;
//     let text = response.text();

//     console.log("AI Raw Response received. Parsing now...");
    
//     text = text.replace(/```json/g, '').replace(/```/g, '').trim();
//     const storyJson = JSON.parse(text);

//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server is running at http://localhost:${PORT}`);
// });










// // backend/index.js

// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config(); // Loads .env file contents into process.env

// // NEW: Import the Google Generative AI library
// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const app = express();
// const PORT = 3001;

// // --- Middleware ---
// app.use(cors());
// app.use(express.json()); // IMPORTANT: This allows our server to read JSON from POST requests
// app.use(express.static('public'));

// // --- AI Setup ---
// // Initialize the Google AI Client with your API key
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });


// // This function builds the detailed set of instructions for our AI Storyteller
// function createMasterPrompt(userInputs) {
//   const { age, language, interests, name } = userInputs;

//   // This is the "brain" of our storyteller. We are programming the AI's personality and task.
//   return `
//     Role: You are an empathetic NASA-inspired storyteller and interactive learning guide. Your name is NOVA.
//     Goal: Generate a specialized, long, engaging, empathy-focused, and gamified space story for a user.

//     1. USER PARAMETERS:
//     - Name: ${name}
//     - Age: ${age}
//     - Language: ${language}
//     - Stated Interests: ${interests.join(', ')}

//     2. STORYTELLING GUIDELINES:
//     - Empathy-Focused: The story must connect emotionally. Show astronaut struggles, teamwork, and the joy of discovery.
//     - Age-Specific:
//       - For kids (<=12): Use simpler words, a playful and wondrous tone. Focus on action and fun facts.
//       - For teens (13+): Use a deeper, more inspirational narrative. Connect the story to real-world challenges like climate change, technology, and human collaboration.
//     - Personalization: Use the user's name, "${name}", throughout the story to make them the main character.
//     - Use Real NASA Resources: Base the story on real missions (ISS, Artemis, Hubble) and real astronaut anecdotes.

//     3. INTERACTIVITY & GAMIFICATION:
//     - After EACH story card, create exactly 2 multiple-choice quiz questions related to that card's content.
//     - Quizzes should be engaging and reinforce learning.

//     4. MULTIMEDIA ENHANCEMENTS:
//     - For each story card, suggest a real, publicly available NASA video link for the "video" field.
//     - For the "image" field, provide a URL to a real, relevant, high-quality space photo from images.nasa.gov.

//     5. OUTPUT FORMAT:
//     - Your entire response MUST be a single, valid JSON object.
//     - Do NOT include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object.
//     - The JSON object must strictly follow this structure:
//     {
//       "story_title": "A creative, engaging title for the whole story",
//       "story_cards": [
//         {
//           "card_title": "Title for the first part of the story",
//           "content": "Personalized, age-specific story text for this card, at least 150 words long. Use the name '${name}' here.",
//           "quiz": [
//             {
//               "question": "First quiz question for this card?",
//               "options": ["Option A", "Option B", "Option C"],
//               "correct_answer": "The correct option text"
//             },
//             {
//               "question": "Second quiz question for this card?",
//               "options": ["Option X", "Option Y", "Option Z"],
//               "correct_answer": "The correct option text"
//             }
//           ],
//           "media": {
//             "video": "https://www.nasa.gov/valid-video-link-example",
//             "image": "https://images.nasa.gov/details-PIA23701"
//           }
//         }
//       ]
//     }

//     Now, generate a story for ${name}.
//   `;
// }

// // --- NEW DYNAMIC STORYTELLER ENDPOINT ---
// app.post('/api/generate-story', async (req, res) => {
//   try {
//     console.log("Received request to generate story for:", req.body.name);
//     const userInputs = req.body;

//     // Validate inputs
//     if (!userInputs.name || !userInputs.age || !userInputs.interests) {
//       return res.status(400).json({ error: "Name, age, and interests are required." });
//     }

//     const masterPrompt = createMasterPrompt(userInputs);
//     const result = await model.generateContent(masterPrompt);
//     const response = await result.response;
//     let text = response.text();

//     console.log("AI Raw Response received. Parsing now...");
    
//     // Clean the response to ensure it's valid JSON
//     text = text.replace(/```json/g, '').replace(/```/g, '').trim();
//     const storyJson = JSON.parse(text);

//     res.json(storyJson);

//   } catch (error) {
//     console.error("Error generating story:", error);
//     res.status(500).json({ error: "Failed to generate story. The AI may be busy. Please try again." });
//   }
// });


// // --- Start the server ---
// app.listen(PORT, () => {
//     console.log(`🚀 Dynamic Storyteller Server is running at http://localhost:${PORT}`);
// });




// // Import necessary libraries
// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');

// // Create the Express app
// const app = express();
// const PORT = 3001; // The port our server will run on

// // --- Middleware ---
// app.use(cors()); // Enable CORS for all routes
// // This makes the 'public' folder accessible to the web
// app.use(express.static('public'));

// // --- API Endpoints ---

// // Endpoint to get Cupola location data
// app.get('/api/cupola-locations', (req, res) => {
//     const filePath = path.join(__dirname, 'data/cupola_locations.json');
//     res.sendFile(filePath);
// });

// // Endpoint to get stories for young explorers
// app.get('/api/stories/young-explorer', (req, res) => {
//     const filePath = path.join(__dirname, 'data/stories_young_explorer.json');
//     const stories = JSON.parse(fs.readFileSync(filePath, 'utf-8'));


// // Endpoint to get stories for mission specialists
// app.get('/api/stories/mission-specialist', (req, res) => {
//     const filePath = path.join(__dirname, 'data/stories_mission_specialist.json');
//     res.sendFile(filePath);
// });

//     // Add the full URL for the audio file
//     const storiesWithAudioUrl = stories.map(story => ({
//         ...story,
//         audio_url: `http://localhost:${PORT}/audio/${story.audio_filename}`
//     }));

//     res.json(storiesWithAudioUrl);
// });

// // Endpoint to get the live ISS position
// app.get('/api/iss-position', async (req, res) => {
//     try {
//         const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
//         res.json(response.data);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch ISS position' });
//     }
// });

// // --- Start the server ---
// app.listen(PORT, () => {
//     console.log(`🚀 Server is running at http://localhost:${PORT}`);
// });