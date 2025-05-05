// server/admin.js
const express = require('express');
const router = express.Router();

const users = []; // Bu listeyi index.js’ten alacağız

router.get('/users', (req, res) => {
  const userList = req.app.get('users') || [];
  res.json(userList.map(user => ({
    email: user.email,
    credits: user.credits
  })));
});

router.post('/users/give-credit', (req, res) => {
  const { email, amount } = req.body;
  const userList = req.app.get('users');
  const user = userList.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  user.credits += Number(amount);
  res.json({ message: 'Kredi eklendi', user });
});

module.exports = router;
