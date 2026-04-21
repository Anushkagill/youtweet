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
You are a viral YouTube strategist.

Input:
"${text}"

Generate:
Title:
Description:
              `,
            },
          ],
        },
      ],
    });

    // 🔥 Extract text safely
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

    return res.json({
      success: true,
      title,
      description,
    });

  } catch (error) {
    console.error("❌ AI ERROR:", error.response?.data || error.message);

    // 🔥 fallback so UI never breaks
    return res.json({
      success: true,
      title: `🔥 ${req.body.text.slice(0, 40)}`,
      description: "Something interesting you should check out!",
      fallback: true,
    });
  }
};