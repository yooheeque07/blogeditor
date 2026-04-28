import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix for dotenv not found: we know this is next.js project, let's just load the string directly or pass via env
// No need to use dotenv since we can run via env var
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  try {
    // try to just test gemini-3-pro-preview or gemini-2.0-pro-exp
    const testModels = ["gemini-1.5-pro-latest", "gemini-1.5-pro", "gemini-2.5-pro", "gemini-2.0-pro-exp-0205"];
    
    for (let m of testModels) {
        try {
            console.log("Testing:", m);
            const res = await ai.models.generateContent({
                model: m,
                contents: ["Say hi"],
                config: { maxOutputTokens: 10 }
            });
            console.log("SUCCESS:", m, "->", res.text);
        } catch (e) {
            console.log("FAILED:", m, e.message);
        }
    }
  } catch (e) {
    console.log(e);
  }
}
listModels();
