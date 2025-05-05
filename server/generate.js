const express = require('express');
const multer = require('multer');
const { Configuration, OpenAIApi } = require('openai');
const { verifyToken } = require('./auth'); // JWT kontrolü varsa
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// OpenAI ayarları
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Yardımcı: boyutları ayıkla
function parseSize(size) {
  const [w, h] = size.split('x');
  return { width: parseInt(w), height: parseInt(h) };
}

router.post('/generate-image', verifyToken, upload.any(), async (req, res) => {
  try {
    const {
      prompt,
      overlayText,
      size,
      bgMode,
      bgColor,
      logoPosition,
      logoScale,
      textColor,
      textFont,
      textSize,
      frameColor,
      customWidth,
      customHeight
    } = req.body;

    const { width, height } =
      size === 'custom'
        ? { width: parseInt(customWidth), height: parseInt(customHeight) }
        : parseSize(size || '1080x1080');

    // AI ile arka plan üretilecekse:
    let backgroundImage;
    if (bgMode === 'ai' && prompt) {
      const aiRes = await openai.createImage({
        prompt,
        n: 1,
        size: `${width}x${height}`,
        response_format: 'url',
      });
      backgroundImage = aiRes.data.data[0].url;
    }

    // Örnek: basit sahte bir görsel URL döndürüyoruz (gerçek uygulamada buraya canvas eklenir)
    res.json({
      status: 'success',
      imageUrl: backgroundImage || 'https://via.placeholder.com/1080',
    });
  } catch (err) {
    console.error('Hata:', err.message);
    res.status(500).json({ status: 'failed', reason: err.message });
  }
});

module.exports = router;
