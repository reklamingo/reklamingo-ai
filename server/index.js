// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const adminRoutes = require('./admin');
const paytrRoutes = require('./paytr');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const users = [];
app.set('users', users);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'server/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = users.find(u => u.email === email);
  if (existing) return res.status(400).json({ message: 'Zaten kayıtlı.' });
  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed, credits: 1 });
  res.status(201).json({ message: 'Kayıt başarılı' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: 'Bulunamadı' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Şifre yanlış' });
  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

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

app.get('/api/credits', auth, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  res.json({ credits: user?.credits || 0 });
});

app.post('/api/generate-image', auth, upload.fields([{ name: 'logo' }, { name: 'bgImage' }]), async (req, res) => {
  const {
    prompt, overlayText, size = '1080x1080', bgMode, bgColor = '#ffffff',
    logoPosition = 'top', logoScale = 100, textColor = '#ffffff',
    textFont = 'Quicksand', textSize = 48, frameColor = '#3ecf00',
    customWidth, customHeight
  } = req.body;

  const logoFile = req.files['logo']?.[0];
  const bgFile = req.files['bgImage']?.[0];
  const user = users.find(u => u.email === req.user.email);
  if (user.credits <= 0) return res.status(402).json({ message: 'Krediniz yok' });

  let width, height;
  if (size === 'custom') {
    width = parseInt(customWidth);
    height = parseInt(customHeight);
  } else {
    [width, height] = size.split('x').map(Number);
  }

  try {
    let base;
    if (bgMode === 'ai') {
      const dalle = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { prompt, n: 1, size: '1024x1024', model: 'dall-e-3' },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );
      const url = dalle.data.data[0].url;
      const buffer = (await axios.get(url, { responseType: 'arraybuffer' })).data;
      base = sharp(buffer).resize(width, height);
    } else if (bgMode === 'color') {
      const svg = `<svg width='${width}' height='${height}'><rect width='100%' height='100%' fill='${bgColor}'/></svg>`;
      base = sharp(Buffer.from(svg)).resize(width, height);
    } else if (bgMode === 'image' && bgFile) {
      const buffer = await sharp(bgFile.path).resize(width, height).toBuffer();
      base = sharp(buffer);
    } else return res.status(400).json({ message: 'Geçersiz arka plan' });

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
    res.json({ imageUrl: `/${output.split('server/')[1]}` });
  } catch (err) {
    console.error('Görsel hatası:', err);
    res.status(500).json({ error: 'Görsel oluşturulamadı' });
  }
});

app.use('/api/paytr', paytrRoutes);
app.use('/api/admin', adminRoutes);
app.listen(PORT, () => console.log(`✅ Backend çalışıyor: ${PORT}`));
