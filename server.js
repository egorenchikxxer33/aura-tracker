const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = '777';
const DATA_FILE = path.join(__dirname, 'data.json');

let maintenanceMode = false;
let globalAnimation = null; // { name, id }
let animIdCounter = 0;
let globalNotification = null; // { message, id }

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

// Carneus sessions: { [name]: { items: [...], expiry: timestamp } }
const carneusSessions = {};

const CARNEUS_ITEMS = [
  { id: 'c1', name: 'AVENTUS духи', rarity: 'common', file: 'items/AVENTUS духи.jpg' },
  { id: 'c2', name: 'Версачи духи синие', rarity: 'common', file: 'items/версачи духи синие.jpg' },
  { id: 'c3', name: 'Джинсы перпл', rarity: 'common', file: 'items/джинсы перпл.jpg' },
  { id: 'c4', name: 'Духи валентино', rarity: 'common', file: 'items/духи валентино.jpg' },
  { id: 'c5', name: 'Репликанты черно белые', rarity: 'common', file: 'items/репликанты черно белые.jpg' },
  { id: 'c6', name: 'Скоты собачки', rarity: 'common', file: 'items/скоты собачки.jpg' },
  { id: 'c7', name: 'Джорики красные 23', rarity: 'uncommon', file: 'items/джорики красные 23.jpg' },
  { id: 'c8', name: 'Джорики синие', rarity: 'uncommon', file: 'items/джорики синие.jpeg' },
  { id: 'c9', name: 'Джорики супер черные', rarity: 'uncommon', file: 'items/джорики супер черные.jpeg' },
  { id: 'c10', name: 'Рафы кулоны темно синие', rarity: 'uncommon', file: 'items/рафы кулоны темно синие.jpg' },
  { id: 'c11', name: 'Футболка стендофф', rarity: 'uncommon', file: 'items/супер крутая футболка стендофф.jpg' },
  { id: 'c12', name: 'Часы серебрянные', rarity: 'uncommon', file: 'items/чсаы серебрянные.png' },
  { id: 'c13', name: 'Джереми скоты usa', rarity: 'rare', file: 'items/джереми скоты usa.jpg' },
  { id: 'c14', name: 'Джорданы 10 белые', rarity: 'rare', file: 'items/джорданы 10 белые.jpg' },
  { id: 'c15', name: 'Джорданы 45', rarity: 'rare', file: 'items/джорданы 45.jpg' },
  { id: 'c16', name: 'Инста пампы черные', rarity: 'rare', file: 'items/инста пампы черные.png' },
  { id: 'c17', name: 'Озвиги фиолетовые', rarity: 'rare', file: 'items/озвиги фиолетовые.jpg' },
  { id: 'c18', name: 'Офф дай белый', rarity: 'rare', file: 'items/офф дай белый.jpg' },
  { id: 'c19', name: 'Офф дай оренж', rarity: 'rare', file: 'items/офф дай оренж.jpg' },
  { id: 'c20', name: 'Оффф дай синий', rarity: 'rare', file: 'items/оффф дай синий.jpg' },
  { id: 'c21', name: 'Рафы кулоны черно-красные', rarity: 'rare', file: 'items/рафы кулоны черно-красные.png' },
  { id: 'c22', name: 'Скоты леопардовые', rarity: 'rare', file: 'items/скоты леопардовые.jpg' },
  { id: 'c23', name: 'Скоты медведи зелени', rarity: 'rare', file: 'items/скоты медведи зелени.jpg' },
  { id: 'c24', name: 'Скоты тотемы', rarity: 'rare', file: 'items/скоты тотемы.jpg' },
  { id: 'c25', name: 'Стонисланд свитшот', rarity: 'rare', file: 'items/стонисланд свитшот.jpg' },
  { id: 'c26', name: 'Сумка гуччи', rarity: 'rare', file: 'items/сумка гуччи.jpg' },
  { id: 'c27', name: 'Мохнатая сумка баленса', rarity: 'epic', file: 'items/мохнатая сумка баленса.jpg' },
  { id: 'c28', name: 'Офигенные инста пампы ветмо', rarity: 'epic', file: 'items/офигенные иснта пампы ветмо.jpg' },
  { id: 'c29', name: 'Скоты с крылашкими черные', rarity: 'epic', file: 'items/скоты с крылашкими черные.jpg' },
  { id: 'c30', name: 'Сумка баленсиага', rarity: 'epic', file: 'items/сумка баленсиага.jpg' },
  { id: 'c31', name: 'Сумка гуччи крутая', rarity: 'epic', file: 'items/сумка гуччи крутая.jpeg' },
  { id: 'c32', name: 'Хеллстар кофта', rarity: 'epic', file: 'items/хеллстар кофта.jpg' },
  { id: 'c33', name: 'Кофта хеллстар рекордс', rarity: 'legendary', file: 'items/кофта хеллстар рекордс.jpg' },
  { id: 'c34', name: 'Хеллстар бошка кофта', rarity: 'legendary', file: 'items/хеллстар бошка кофта.jpg' },
  { id: 'c35', name: 'Часы ролекс алмазные', rarity: 'legendary', file: 'items/часы ролекс алмазные.png' }
];

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
    users[name] = { aura: 100, fines: [], faourines: { unactivated: 0, activated: 0 }, keys: 0, inventory: [], keyQualities: [] };
  });
  return { users };
}

let data = loadData();

// Migrate old data
Object.values(data.users).forEach(u => {
  if (!u.faourines) u.faourines = { unactivated: 0, activated: 0 };
  if (u.keys === undefined) u.keys = 0;
  if (!u.inventory) u.inventory = [];
  if (!u.keyQualities) u.keyQualities = [];
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
  res.json({ users: sorted, maintenance: maintenanceMode, globalAnimation, globalNotification });
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
    data.users[name] = { aura: 100, fines: [], faourines: { unactivated: 0, activated: 0 }, keys: 0, inventory: [], keyQualities: [] };
  });
  saveData();
  res.json({ success: true });
});

app.post('/api/mine/check', (req, res) => {
  const { name } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });

  const key = generateKey();
  const success = Math.random() < 0.03;

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

app.post('/api/carneus/craft', (req, res) => {
  const { name, activatedCount } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  const u = data.users[name];
  const act = Math.max(0, Math.min(5, parseInt(activatedCount) || 0));
  const unact = 5 - act;

  if (u.faourines.activated < act || u.faourines.unactivated < unact) {
    return res.status(400).json({ error: 'Недостаточно фауринов' });
  }

  u.faourines.activated -= act;
  u.faourines.unactivated -= unact;
  u.keys += 1;
  if (!u.keyQualities) u.keyQualities = [];
  u.keyQualities.push(act);
  saveData();
  res.json({
    success: true, keys: u.keys, activated: u.faourines.activated,
    unactivated: u.faourines.unactivated, quality: act
  });
});

const RARITY_WEIGHTS = {
  0: { common: 50, uncommon: 35, rare: 12, epic: 2.5, legendary: 0.5 },
  1: { common: 40, uncommon: 30, rare: 22, epic: 6, legendary: 2 },
  2: { common: 30, uncommon: 28, rare: 28, epic: 10, legendary: 4 },
  3: { common: 20, uncommon: 25, rare: 30, epic: 17, legendary: 8 },
  4: { common: 12, uncommon: 20, rare: 32, epic: 24, legendary: 12 },
  5: { common: 5, uncommon: 15, rare: 30, epic: 30, legendary: 20 }
};

function pickRarity(quality) {
  const w = RARITY_WEIGHTS[Math.min(5, Math.max(0, quality))];
  const r = Math.random() * 100;
  let cum = 0;
  for (const [rarity, weight] of Object.entries(w)) {
    cum += weight;
    if (r <= cum) return rarity;
  }
  return 'common';
}

app.post('/api/carneus/open', (req, res) => {
  const { name } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  const u = data.users[name];
  if (u.keys < 1) return res.status(400).json({ error: 'Нет ключей' });

  // Get key quality
  if (!u.keyQualities) u.keyQualities = [];
  const quality = u.keyQualities.length > 0 ? u.keyQualities.shift() : 0;
  u.keys -= 1;

  // Pick 3 items by weighted rarity
  const picked = [];
  const available = [...CARNEUS_ITEMS];
  for (let i = 0; i < 3; i++) {
    if (available.length === 0) break;
    const rarity = pickRarity(quality);
    const candidates = available.filter(it => it.rarity === rarity);
    let item;
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      item = candidates[idx];
    } else {
      const idx = Math.floor(Math.random() * available.length);
      item = available[idx];
    }
    picked.push(item);
    available.splice(available.indexOf(item), 1);
  }

  saveData();

  const sessionId = crypto.randomBytes(8).toString('hex');
  carneusSessions[name] = { items: picked, expiry: Date.now() + 60000 };
  res.json({ success: true, sessionId, items: picked, keys: u.keys, quality });
});

app.post('/api/carneus/claim', (req, res) => {
  const { name, sessionId, choice } = req.body;
  if (!data.users[name]) return res.status(404).json({ error: 'Не найден' });
  const session = carneusSessions[name];
  if (!session || session.expiry < Date.now()) {
    delete carneusSessions[name];
    return res.status(400).json({ error: 'Сессия истекла' });
  }
  const idx = parseInt(choice);
  if (isNaN(idx) || idx < 0 || idx > 2) {
    return res.status(400).json({ error: 'Неверный выбор' });
  }
  const item = session.items[idx];
  data.users[name].inventory.push({ id: item.id, acquired: new Date().toISOString() });
  saveData();
  delete carneusSessions[name];
  res.json({ success: true, item, inventory: data.users[name].inventory });
});

app.post('/api/carneus/inventory', (req, res) => {
  const { password, target, action, itemId } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  if (!data.users[target]) return res.status(404).json({ error: 'Не найден' });

  if (action === 'get') {
    return res.json({
      inventory: data.users[target].inventory,
      keys: data.users[target].keys,
      items: CARNEUS_ITEMS
    });
  }
  if (action === 'addItem') {
    if (!itemId || !CARNEUS_ITEMS.find(i => i.id === itemId)) {
      return res.status(400).json({ error: 'Неверный ID предмета' });
    }
    data.users[target].inventory.push({ id: itemId, acquired: new Date().toISOString() });
    saveData();
    return res.json({ success: true, inventory: data.users[target].inventory });
  }
  if (action === 'removeItem') {
    const idx = data.users[target].inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return res.status(400).json({ error: 'Предмет не найден' });
    data.users[target].inventory.splice(idx, 1);
    saveData();
    return res.json({ success: true, inventory: data.users[target].inventory });
  }
  if (action === 'addKeys') {
    const count = parseInt(req.body.count) || 1;
    data.users[target].keys += count;
    saveData();
    return res.json({ success: true, keys: data.users[target].keys });
  }
  if (action === 'removeKeys') {
    const count = parseInt(req.body.count) || 1;
    data.users[target].keys = Math.max(0, data.users[target].keys - count);
    saveData();
    return res.json({ success: true, keys: data.users[target].keys });
  }
  res.status(400).json({ error: 'Неверное действие' });
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
  const id = ++animIdCounter;
  globalAnimation = { name, id };
  setTimeout(() => { if (globalAnimation && globalAnimation.id === id) globalAnimation = null; }, 8000);
  res.json({ success: true, animation: name });
});

app.post('/api/background/clear', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  globalAnimation = null;
  res.json({ success: true });
});

app.post('/api/notification/send', (req, res) => {
  const { password, message } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Только оператор' });
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Введите сообщение' });
  }
  const id = ++animIdCounter;
  globalNotification = { message: message.trim(), id };
  setTimeout(() => { if (globalNotification && globalNotification.id === id) globalNotification = null; }, 30000);
  res.json({ success: true, message: globalNotification.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aura Tracker running on http://0.0.0.0:${PORT}`);
});
