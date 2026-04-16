import fetch from "node-fetch";

export const generateCaption = async (req, res) => {
  try {
    console.log("🔥 AI Controller Hit");

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const response = await fetch("https://api.deepai.org/api/text-generator", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Api-key": "quickstart-QUICKSTART",
      },
      body: new URLSearchParams({
        text: `
Generate content for a video post.

Input: ${text}

Give output in this format:
Title:
Description:
        `,
      }),
    });

    const data = await response.json();

    console.log("🔥 DeepAI Response:", data);

    let output = data?.output?.trim();

    // fallback
    if (!output) {
      return res.json({
        success: true,
        title: text,
        description: `${text} - Watch now!`,
      });
    }

    let title = "";
    let description = "";

    if (output.includes("Description:")) {
      const parts = output.split("Description:");
      title = parts[0].replace("Title:", "").trim();
      description = parts[1].trim();
    } else {
      title = output;
      description = "Watch this video for more details!";
    }

    return res.json({
      success: true,
      title,
      description,
    });

  } catch (error) {
    console.error("❌ ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error generating content",
    });
  }
};