import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  try {
    const testModels = ["gemini-1.5-pro-latest", "gemini-1.5-pro", "gemini-2.1-pro", "gemini-2.5-pro", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3-pro-preview"];
    
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
