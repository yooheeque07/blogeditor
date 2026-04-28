import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    // In some versions it might be ai.models.list() or similar
    // Let's try to just check if gemini-1.5-pro works
    console.log("Checking gemini-1.5-pro...");
    const res = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: ["hi"]
    });
    console.log("gemini-1.5-pro works!");
  } catch (e) {
    console.log("gemini-1.5-pro failed:", e.message);
  }
}
checkModels();
