const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const upload = multer();

app.use(cors({
  origin: "https://point-4kh4.onrender.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Points backend is running" });
});

app.post("/api/receipts/scan", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No receipt image uploaded" });
    }

    if (!process.env.MINDEE_API_KEY) {
      return res.status(500).json({ error: "Mindee API key is not configured" });
    }

    const form = new FormData();

    form.append("document", req.file.buffer, {
      filename: req.file.originalname || "receipt.jpg",
      contentType: req.file.mimetype
    });

    const response = await axios.post(
      "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict",
      form,
      {
        headers: {
          Authorization: `Token ${process.env.MINDEE_API_KEY}`,
          ...form.getHeaders()
        }
      }
    );

    const prediction =
      response.data?.document?.inference?.prediction || {};

    res.json({
      receiptNumber: prediction.receipt_number?.value || null,
      date: prediction.date?.value || null,
      time: prediction.time?.value || null,
      totalAmount: prediction.total_amount?.value ?? null,
      totalNet: prediction.total_net?.value ?? null,
      totalTax: prediction.total_tax?.value ?? null,
      supplier: prediction.supplier_name?.value || null,
      currency: prediction.locale?.currency || "CLP"
    });

  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json({
      error: "Receipt processing failed",
      details: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
