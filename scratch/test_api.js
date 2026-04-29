const { GoogleGenAI, Type } = require("@google/genai");
require("dotenv").config();

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: ["Hi, tell me a joke in JSON format."],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            joke: { type: Type.STRING }
          }
        }
      }
    });
    console.log("Response Text:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
