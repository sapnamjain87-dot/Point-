const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();
const upload = multer();

app.use(cors({
  origin: "https://point-4kh4.onrender.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Points backend is running" });
});

app.post("/api/receipts/scan", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No receipt file uploaded"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key is missing"
      });
    }

 const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const base64Image = req.file.buffer.toString("base64");
const mimeType = req.file.mimetype || "image/jpeg";

const response = await client.responses.create({
  model: "gpt-5.6-luna",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Read this Chilean purchase receipt.

Return ONLY valid JSON in exactly this format:
{
  "store": "store name",
  "date": "YYYY-MM-DD",
  "total": 0,
  "currency": "CLP"
}

The total must be a number without currency symbols or thousands separators.
If a value cannot be found, use null.`
        },
        {
          type: "input_image",
          image_url: `data:${mimeType};base64,${base64Image}`
        }
      ]
    }
  ]
});

let text = response.output_text.trim();

text = text
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/, "")
  .replace(/\s*```$/, "");

const receipt = JSON.parse(text);

res.json({
  receipt: receipt
}); 
    

 

  } catch (error) {
    console.error("OPENAI ERROR:", error);

    res.status(500).json({
      error: "Receipt processing failed",
      details: error.message || String(error)
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
