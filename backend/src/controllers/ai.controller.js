import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateCaption = async (req, res) => {
  try {
    console.log("🔥 Gemini API HIT");

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY missing");
      return res.status(500).json({
        success: false,
        message: "Server config error",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are a viral YouTube content strategist.

Input:
"${text}"

Generate:
Title:
Description:
`,
    });

    // 🔥 SAFE RESPONSE EXTRACTION (handles all Gemini formats)
    let output = "";

    try {
      if (typeof response.text === "function") {
        output = response.text();
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        output = response.candidates[0].content.parts[0].text;
      } else {
        console.log("⚠️ Unknown Gemini response:", response);
        output = text;
      }
    } catch (err) {
      console.error("❌ Parsing error:", err);
      output = text;
    }

    console.log("AI OUTPUT:", output);

    // 🔥 SAFE TITLE + DESCRIPTION PARSING
    let title = "";
    let description = "";

    if (output.includes("Description:")) {
      const parts = output.split("Description:");
      title = parts[0].replace("Title:", "").trim();
      description = parts[1].trim();
    } else {
      // fallback if AI format breaks
      title = output.split("\n")[0] || text;
      description = output || "Check this out!";
    }

    return res.json({
      success: true,
      title,
      description,
    });

  } catch (error) {
    console.error("❌ Gemini ERROR FULL:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI generation failed",
    });
  }
};