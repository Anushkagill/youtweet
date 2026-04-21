import axios from "axios";

export const generateCaption = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

    const response = await axios.post(url, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are a viral YouTube content strategist.

Input:
"${text}"

Your task:
- Create a HIGHLY engaging YouTube title
- DO NOT repeat the input directly
- Add emotion, curiosity, or storytelling
- Make it feel human and clickable
- Keep it natural (not robotic)

Examples:
Input: sad
Output: "I Hit My Lowest Point… Then Something Changed"

Input: coding
Output: "This One Coding Habit Changed Everything"

Now generate:

Title:
Description:
              `,
            },
          ],
        },
      ],
    });

    const output =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("AI OUTPUT:", output);

    let title = "";
    let description = "";

    if (output.includes("Description:")) {
      const parts = output.split("Description:");
      title = parts[0].replace("Title:", "").trim();
      description = parts[1].trim();
    } else {
      title = output.split("\n")[0] || text;
      description = output || "Check this out!";
    }

    // 🔥 SMALL SAFETY FIX (NO LOGIC CHANGE)
    if (title.toLowerCase().trim() === text.toLowerCase().trim()) {
      title = `This Changed Everything About ${text}`;
    }

    return res.json({
      success: true,
      title,
      description,
    });

  } catch (error) {
    console.error("❌ AI ERROR:", error.response?.data || error.message);

    return res.json({
      success: true,
      title: `🔥 ${req.body.text.slice(0, 40)}`,
      description: "Something interesting you should check out!",
      fallback: true,
    });
  }
};