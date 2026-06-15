const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = '777';
const DATA_FILE = path.join(__dirname, 'data.json');

const USER_NAMES = [
  'Егор Рейдик', 'Назар', 'Лука',
  'Илья Леонов', 'Илья Михайлов',
  'Влад', 'Елисей'
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Data load error:', e);
  }
  const users = {};
  USER_NAMES.forEach(name => {
    users[name] = { aura: 100, fines: [] };
  });
  return { users };
}

let data = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/users', (req, res) => {
  const sorted = Object.entries(data.users)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.aura - a.aura);
  res.json(sorted);
});

app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ role: 'operator', name: 'Оператор' });
  }
  if (name && data.users[name]) {
    return res.json({ role: 'user', name });
  }
  res.status(401).json({ error: 'Неверное имя или пароль' });
});

app.post('/api/aura', (req, res) => {
  const { password, target, amount } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Только оператор' });
  }
  if (!data.users[target]) {
    return res.status(404).json({ error: 'Не найден' });
  }
  data.users[target].aura = Math.max(-9999, Math.min(9999, data.users[target].aura + amount));
  saveData();
  res.json({ success: true, aura: data.users[target].aura, users: data.users });
});

app.post('/api/fine', (req, res) => {
  const { password, target, amount, comment } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Только оператор' });
  }
  if (!data.users[target]) {
    return res.status(404).json({ error: 'Не найден' });
  }
  data.users[target].aura = Math.max(-9999, Math.min(9999, data.users[target].aura - amount));
  data.users[target].fines.push({
    amount,
    comment,
    date: new Date().toLocaleString('ru-RU')
  });
  saveData();
  res.json({ success: true, aura: data.users[target].aura, users: data.users });
});

app.post('/api/reset', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Только оператор' });
  }
  USER_NAMES.forEach(name => {
    data.users[name] = { aura: 100, fines: [] };
  });
  saveData();
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aura Tracker running on http://0.0.0.0:${PORT}`);
});
