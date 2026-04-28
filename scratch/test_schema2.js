import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testAll() {
  const modelPriority = ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-3-flash-preview"];

  for (let m of modelPriority) {
    try {
      console.log(`Testing ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: ["Hello"],
        config: {
          systemInstruction: "You are a helpful assistant.",
          temperature: 0.5,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING }
            }
          }
        }
      });
      console.log(`SUCCESS ${m}:`, res.text);
    } catch (e) {
      console.log(`FAILED ${m}:`, e.message);
    }
  }
}

testAll();
