import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testSchema() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    console.log("SUCCESS");
    console.log(res.text);
  } catch (e) {
    console.log("FAILED WITH JSON:", e.message);
  }
}

testSchema();
