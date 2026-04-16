import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateCaption = async (req, res) => {
  try {
    console.log("🔥 API KEY:", process.env.GEMINI_API_KEY);

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
Generate a catchy social media caption.
Add 3-5 hashtags.
Keep it short.

Content: ${text}
`;

    const result = await model.generateContent(prompt);

    console.log("🔥 RAW RESULT:", JSON.stringify(result, null, 2));

    const caption =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!caption) {
      throw new Error("No caption generated");
    }

    return res.status(200).json({
      success: true,
      caption,
    });

  } catch (error) {
    console.error("❌ ERROR DETAILS:", JSON.stringify(error, null, 2));

    return res.status(500).json({
      success: false,
      message: error.message || "Error generating caption",
    });
  }
};