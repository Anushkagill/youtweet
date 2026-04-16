import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateCaption = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
    });

    const result = await model.generateContent(
     `Generate a catchy social media caption.
   Tone: engaging and professional.
   Add 3-5 hashtags.
   Keep it under 2 lines.

   Content: ${text}`
    );

    const response = await result.response;
    const caption = response.text();

    res.status(200).json({ caption });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error generating caption" });
  }
};