const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mindee = require("mindee");

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

    if (!process.env.MINDEE_API_KEY) {
      return res.status(500).json({
        error: "Mindee API key is missing"
      });
    }

    const modelId = "d8618d38-4821-40ab-a0e2-201d7f4c549e";

    const mindeeClient = new mindee.Client({
      apiKey: process.env.MINDEE_API_KEY
    });

    const inputSource = new mindee.BufferInput({
      buffer: req.file.buffer,
      filename: req.file.originalname || "receipt.jpg"
    });

    const modelParams = {
      modelId: modelId
    };

    const response = await mindeeClient.enqueueAndGetResult(
      mindee.product.Extraction,
      inputSource,
      modelParams
    );

  const fields = response.inference.result.fields;
console.log("FIELDS RAW:", fields);
function convertMindeeField(field) {
  if (field == null) return null;

  // Mindee ObjectField / nested fields
  if (field.fields && typeof field.fields.entries === "function") {
    const obj = {};
    for (const [key, value] of field.fields.entries()) {
      obj[key] = convertMindeeField(value);
    }
    return obj;
  }

  // Arrays
  if (Array.isArray(field)) {
    return field.map(convertMindeeField);
  }

  // Mindee ListField
  if (field.items && Array.isArray(field.items)) {
    return field.items.map(convertMindeeField);
  }

  // SimpleField
  if (typeof field === "object" && "value" in field) {
    return field.value;
  }

  return field;
}

const receipt = {};

for (const [name, field] of fields.entries()) {
  receipt[name] = convertMindeeField(field);
}
console.log("MINDEE RECEIPT:", receipt);
res.json({
  receipt: receipt
});

  } catch (error) {
    console.error("MINDEE ERROR:", error);

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
