const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = '777';
const DATA_FILE = path.join(__dirname, 'data.json');

let maintenanceMode = false;
let globalAnimation = null; // { name, time }

const USER_NAMES = [
  'Егор Рейдик', 'Назар', 'Лука',
  'Илья Леонов', 'Илья Михайлов',
  'Влад', 'Елисей'
];

const QUIZ = [
  { q: 'Что такое солнце?', opts: ['Звезда', 'Планета', 'Спутник', 'Астероид'], ans: 0 },
  { q: 'Сколько дней в неделе?', opts: ['5', '6', '7', '8'], ans: 2 },
  { q: 'Какого цвета небо?', opts: ['Зелёного', 'Красного', 'Голубого', 'Жёлтого'], ans: 2 },
  { q: 'Кто написал "Войну и мир"?', opts: ['Достоевский', 'Толстой', 'Пушкин', 'Чехов'], ans: 1 },
  { q: 'Столица Франции?', opts: ['Лондон', 'Берлин', 'Париж', 'Мадрид'], ans: 2 },
  { q: 'Сколько континентов на Земле?', opts: ['5', '6', '7', '8'], ans: 2 },
  { q: 'Какое животное самое быстрое?', opts: ['Лев', 'Гепард', 'Тигр', 'Лошадь'], ans: 1 },
  { q: 'Из чего делают бумагу?', opts: ['Металл', 'Пластик', 'Древесина', 'Стекло'], ans: 2 },
  { q: 'Сколько месяцев в году?', opts: ['10', '11', '12', '13'], ans: 2 },
  { q: 'Как называется наша галактика?', opts: ['Андромеда', 'Млечный Путь', 'Туманность', 'Солнечная'], ans: 1 },
  { q: 'Что измеряют в градусах?', opts: ['Вес', 'Длину', 'Температуру', 'Громкость'], ans: 2 },
  { q: 'Какой газ мы вдыхаем?', opts: ['Углекислый', 'Азот', 'Кислород', 'Водород'], ans: 2 },
  { q: 'Сколько букв в русском алфавите?', opts: ['30', '31', '32', '33'], ans: 3 },
  { q: 'Кто изобрёл телефон?', opts: ['Эдисон', 'Белл', 'Тесла', 'Маркони'], ans: 1 },
  { q: 'В каком году человек высадился на Луну?', opts: ['1965', '1967', '1969', '1971'], ans: 2 }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Activation sessions: { [name]: { index, startTime } }
const activationSessions = {};

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
    users[name] = { aura: 100, fines: [], faourines: { unactivated: 0, activated: 0 } };
  });
  return { users };
}

let data = loadData();

// Migrate old data
Object.values(data.users).forEach(u => {
  if (!u.faourines) u.faourines = { unactivated: 0, activated: 0 };
});

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateKey() {
  const parts = [
    crypto.randomBytes(5).toString('hex'),
    crypto.randomBytes(3).toString('hex'),
    crypto.randomBytes(3).toString('hex')
  ];
  return parts.join('-');
}

app.get('/api/users', (req, res) => {
  const sorted = Object.entries(data.users)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.aura - a.aura);
  res.json({ users: sorted, maintenance: maintenanceMode, globalAnimation });
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
    data.users[name] = { aura: 100, fines: [], faourines: { unactivated: 0, activated: 0 } };
  });
  saveData();
  res.json({ success: true });
});

app.post('/api/mine/check', (req, res) => {
  const { name } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });

  const key = generateKey();
  const success = Math.random() < 0.01;

  if (success) {
    data.users[name].faourines.unactivated += 1;
    saveData();
    res.json({ success: true, key, unactivated: data.users[name].faourines.unactivated });
  } else {
    res.json({ success: false, key });
  }
});

app.post('/api/activate/start', (req, res) => {
  const { name } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  if (data.users[name].faourines.unactivated < 1) {
    return res.status(400).json({ error: 'Нет неактивированных фауринов' });
  }
  activationSessions[name] = { index: 0, startTime: Date.now() };
  res.json({
    total: QUIZ.length,
    question: QUIZ[0].q,
    options: QUIZ[0].opts,
    index: 0
  });
});

app.post('/api/activate/answer', (req, res) => {
  const { name, answer } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  const session = activationSessions[name];
  if (!session) return res.status(400).json({ error: 'Активация не начата' });

  const elapsed = (Date.now() - session.startTime) / 1000;
  const questionElapsed = elapsed - session.index * 5;
  if (questionElapsed > 5 || answer === -1) {
    delete activationSessions[name];
    return res.json({ correct: false, timeout: true, message: 'Время вышло!', correctAnswer: QUIZ[session.index].ans });
  }

  const qIdx = session.index;
  const q = QUIZ[qIdx];
  if (!q) {
    delete activationSessions[name];
    return res.status(400).json({ error: 'Сессия повреждена' });
  }

  const correct = answer === q.ans;
  if (!correct) {
    delete activationSessions[name];
    return res.json({ correct: false, timeout: false, message: 'Неправильный ответ!', correctAnswer: q.ans });
  }

  session.index++;
  if (session.index >= QUIZ.length) {
    data.users[name].faourines.unactivated -= 1;
    data.users[name].faourines.activated += 1;
    saveData();
    delete activationSessions[name];
    return res.json({
      correct: true,
      done: true,
      activated: data.users[name].faourines.activated
    });
  }

  const nextQ = QUIZ[session.index];
  res.json({
    correct: true,
    done: false,
    question: nextQ.q,
    options: nextQ.opts,
    index: session.index
  });
});

app.post('/api/sell', (req, res) => {
  const { name } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  if (data.users[name].faourines.activated < 1) {
    return res.status(400).json({ error: 'Нет активированных фауринов' });
  }

  const reward = Math.floor(Math.random() * 301) + 400;
  data.users[name].faourines.activated -= 1;
  data.users[name].aura += reward;
  saveData();
  res.json({ success: true, reward, aura: data.users[name].aura, activated: data.users[name].faourines.activated });
});

app.post('/api/maintenance', (req, res) => {
  const { password, enabled } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  maintenanceMode = enabled;
  res.json({ success: true, maintenance: maintenanceMode });
});

const BG_ANIMATIONS = [
  'lightning','rainbow-sweep','starburst','aurora','glitch',
  'shockwave','neon-pulse','vortex','matrix','prism',
  'hologram','solar-flare','cascade','ripple','cosmic',
  'chroma','spectrum','nebula','pulse-ring','quantum','supernova','plasma'
];

app.post('/api/background/trigger', (req, res) => {
  const { password, animation } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  const name = animation || BG_ANIMATIONS[Math.floor(Math.random() * BG_ANIMATIONS.length)];
  globalAnimation = { name, time: Date.now() };
  setTimeout(() => { if (globalAnimation && globalAnimation.name === name && globalAnimation.time === Date.now()) globalAnimation = null; }, 8000);
  res.json({ success: true, animation: name });
});

app.post('/api/background/clear', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  globalAnimation = null;
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aura Tracker running on http://0.0.0.0:${PORT}`);
});
