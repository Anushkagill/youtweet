import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateCaption = async (req, res) => {
  try {
    console.log("🔥 Gemini NEW SDK Hit");

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are a viral YouTube content strategist.

Input:
"${text}"

Your job:
Turn this into HIGH-ENGAGEMENT content.

Generate:
1. A scroll-stopping YouTube title (curiosity + emotion)
2. A short engaging description (2–3 lines max)

Rules:
- DO NOT repeat the input
- DO NOT use generic words like "randomness"
- DO NOT use "watch now"
- Make it feel clickable and human
- Use curiosity, relatability, or urgency

Style Examples:
- "I Tried This for 7 Days… Here’s What Happened"
- "Nobody Talks About This Coding Habit (But It Works)"
- "This Changed My Daily Coding Routine Forever"

Format strictly:
Title:
Description:
`,
    });

    const output = response.text;

    let title = "";
    let description = "";

    if (output.includes("Description:")) {
      const parts = output.split("Description:");
      title = parts[0].replace("Title:", "").trim();
      description = parts[1].trim();
    } else {
      title = text;
      description = "Check this out!";
    }

    return res.json({
      success: true,
      title,
      description,
    });

  } catch (error) {
    console.error("❌ Gemini ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error generating content",
    });
  }
};