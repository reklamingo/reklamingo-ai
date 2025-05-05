const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const adminRoutes = require('./admin');
const generateRoutes = require('./generate');
// const paytrRoutes = require('./paytr'); // Şimdilik pasif

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Kullanıcılar bellekte tutuluyor
const users = [];
app.set('users', users);

// Yetkilendirme middleware'i
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

// Register/Login
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

app.get('/api/credits', auth, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  res.json({ credits: user?.credits || 0 });
});

// Route'ları bağla
app.use('/api/generate-image', generateRoutes); // ✔ taşındı
// app.use('/api/paytr', paytrRoutes); // devre dışı
app.use('/api/admin', adminRoutes);

// Sunucuyu başlat
app.listen(PORT, () => console.log(`✅ Backend çalışıyor: ${PORT}`));
