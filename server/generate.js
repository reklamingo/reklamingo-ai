const express = require('express');
const router = express.Router();
const axios = require('axios');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'server/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Yetkisiz' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token geçersiz' });
  }
}

router.post('/generate-image', auth, upload.fields([{ name: 'logo' }, { name: 'bgImage' }]), async (req, res) => {
  const {
    overlayText, size = '1080x1080', bgMode, bgColor = '#ffffff',
    logoPosition = 'top', logoScale = 100, textColor = '#ffffff',
    textFont = 'Quicksand', textSize = 48, frameColor = '#3ecf00',
    customWidth, customHeight
  } = req.body;

  const logoFile = req.files['logo']?.[0];
  const bgFile = req.files['bgImage']?.[0];

  const users = req.app.get('users');
  const user = users.find(u => u.email === req.user.email);
  if (!user || user.credits <= 0) return res.status(402).json({ message: 'Krediniz yok' });

  let width, height;
  if (size === 'custom') {
    width = parseInt(customWidth);
    height = parseInt(customHeight);
  } else {
    [width, height] = size.split('x').map(Number);
  }

  try {
    let base;
    if (bgMode === 'color') {
      const svg = `<svg width='${width}' height='${height}'><rect width='100%' height='100%' fill='${bgColor}'/></svg>`;
      base = sharp(Buffer.from(svg)).resize(width, height);
    } else if (bgMode === 'image' && bgFile) {
      const buffer = await sharp(bgFile.path).resize(width, height).toBuffer();
      base = sharp(buffer);
    } else {
      return res.status(400).json({ message: 'Geçersiz arka plan' });
    }

    const composites = [];

    if (logoFile) {
      const logoBuf = await sharp(logoFile.path)
        .resize({ width: Math.round((logoScale / 100) * 200) })
        .toBuffer();
      composites.push({
        input: logoBuf,
        top: logoPosition === 'top' ? 10 : height - Math.round((logoScale / 100) * 200) - 10,
        left: 10,
      });
    }

    if (overlayText) {
      const svg = `<svg width='${width}' height='${height}'>
        <style>.txt{fill:${textColor};font-size:${textSize}px;font-family:${textFont};font-weight:bold;}</style>
        <text x='50%' y='${height - 40}' text-anchor='middle' class='txt'>${overlayText}</text>
      </svg>`;
      composites.push({ input: Buffer.from(svg), top: 0, left: 0 });
    }

    const frameSvg = `<svg width='${width}' height='${height}'>
      <rect x='20' y='20' width='${width - 40}' height='${height - 40}' fill='none' stroke='${frameColor}' stroke-width='4'/>
    </svg>`;
    composites.push({ input: Buffer.from(frameSvg), top: 0, left: 0 });

    const output = `server/uploads/result-${Date.now()}.png`;
    await base.composite(composites).png().toFile(output);
    user.credits--;

    res.json({ imageUrl: `/uploads/${output.split('uploads/')[1]}` });
  } catch (err) {
    console.error('Görsel oluşturma hatası:', err);
    res.status(500).json({ message: 'Görsel oluşturulamadı' });
  }
});

module.exports = router;
