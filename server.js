import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent Database Storage File Path
const DB_FILE = path.join(__dirname, 'database.json');

// Initial default seed data if DB file doesn't exist
const DEFAULT_DB = {
  users: [
    {
      id: 'user_hyunjun',
      handle: '@hyunjun',
      name: '현준',
      password: 'demo',
      statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
      jelly: 320,
      ruby: 20,
      isOnline: true,
      lastSeenAt: '온라인',
      avatar: {
        base: 'moki',
        face: 'smile',
        top: 'mint_hoodie',
        headwear: 'cherry_beanie',
        handheld: 'heart_balloon',
        bg: 'pastel_circle',
        effect: 'sparkles'
      }
    },
    {
      id: 'user_minji',
      handle: '@minji',
      name: '민지',
      password: 'demo',
      statusMsg: '체리 비니 새로 샀음 🍒',
      jelly: 150,
      ruby: 5,
      isOnline: false,
      lastSeenAt: '10분 전',
      avatar: {
        base: 'poki',
        face: 'wink',
        top: 'striped_tee',
        bottom: 'denim_pants',
        headwear: 'cat_ears',
        handheld: 'gameboy',
        bg: 'pastel_circle',
        effect: 'sparkles'
      }
    }
  ],
  friendships: [
    ['user_hyunjun', 'user_minji'],
    ['user_minji', 'user_hyunjun']
  ],
  messages: [
    {
      id: 'm1',
      senderId: 'user_minji',
      receiverId: 'user_hyunjun',
      text: '현준아 모키포키 들어왔어? 대박 귀여워 ㅋㅋㅋ',
      timestamp: '18:40',
      type: 'text',
      isExploded: false
    },
    {
      id: 'm2',
      senderId: 'user_hyunjun',
      receiverId: 'user_minji',
      text: '응응! 나 방금 찹쌀떡 모키로 캐릭터 만들었음!',
      timestamp: '18:41',
      type: 'text',
      isExploded: false
    }
  ]
};

// Load or Initialize DB
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[DB] Load error, fallback to default:', err);
  }
  saveDB(DEFAULT_DB);
  return DEFAULT_DB;
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Save error:', err);
  }
}

let db = loadDB();

// ----------------- AUTH APIS -----------------
app.post('/api/auth/register', (req, res) => {
  const { handle, name, password, baseChoice = 'moki' } = req.body;
  if (!handle || !name) {
    return res.status(400).json({ error: '아이디와 이름을 입력해주세요.' });
  }

  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  db = loadDB();

  if (db.users.some(u => u.handle.toLowerCase() === cleanHandle.toLowerCase())) {
    return res.status(400).json({ error: '이미 존재하는 @아이디입니다. 다른 아이디를 입력해주세요.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    handle: cleanHandle,
    name,
    password: password || '1234',
    statusMsg: '모키포키 새로 입주했어요 🍡',
    jelly: 100,
    ruby: 10,
    isOnline: true,
    lastSeenAt: '온라인',
    avatar: {
      base: baseChoice,
      face: 'smile',
      top: baseChoice === 'moki' ? 'mint_hoodie' : 'striped_tee',
      headwear: baseChoice === 'moki' ? 'cherry_beanie' : 'cat_ears',
      handheld: baseChoice === 'moki' ? 'heart_balloon' : 'gameboy',
      bg: 'pastel_circle',
      effect: 'sparkles'
    }
  };

  db.users.push(newUser);
  // Auto-connect with Hyun-jun and Minji for instant chat testing
  db.friendships.push([newUser.id, 'user_hyunjun']);
  db.friendships.push(['user_hyunjun', newUser.id]);
  db.friendships.push([newUser.id, 'user_minji']);
  db.friendships.push(['user_minji', newUser.id]);

  saveDB(db);
  console.log(`[Auth] Registered & persisted user: ${newUser.name} (${newUser.handle})`);
  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { handle, password } = req.body;
  if (!handle) {
    return res.status(400).json({ error: '@아이디를 입력해주세요.' });
  }

  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  db = loadDB();
  const user = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: '가입되지 않은 @아이디입니다. 먼저 회원가입을 진행해주세요.' });
  }
  if (password && user.password && user.password !== password) {
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

  user.isOnline = true;
  user.lastSeenAt = '온라인';
  saveDB(db);

  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body;
  db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isOnline = false;
    user.lastSeenAt = '방금 전';
    saveDB(db);
  }
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  db = loadDB();
  const safeUsers = db.users.map(({ password, ...rest }) => rest);
  res.json({ users: safeUsers });
});

// ----------------- FRIENDS APIS -----------------
app.get('/api/friends', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });

  db = loadDB();
  const friendIds = db.friendships.filter(([u1, u2]) => u1 === userId).map(([u1, u2]) => u2);
  const friendList = db.users.filter(u => friendIds.includes(u.id)).map(({ password, ...rest }) => rest);
  res.json({ friends: friendList });
});

app.post('/api/friends/add', (req, res) => {
  const { userId, targetHandle } = req.body;
  if (!userId || !targetHandle) return res.status(400).json({ error: '정보가 누락되었습니다.' });

  const cleanHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
  db = loadDB();
  const targetUser = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!targetUser) {
    return res.status(404).json({ error: '해당 @아이디를 가진 사용자를 찾을 수 없습니다.' });
  }
  if (targetUser.id === userId) {
    return res.status(400).json({ error: '자기 자신은 친구로 추가할 수 없습니다.' });
  }

  const already = db.friendships.some(([u1, u2]) => u1 === userId && u2 === targetUser.id);
  if (already) {
    return res.status(400).json({ error: '이미 친구로 등록되어 있습니다.' });
  }

  db.friendships.push([userId, targetUser.id]);
  db.friendships.push([targetUser.id, userId]);
  saveDB(db);

  const { password, ...safeFriend } = targetUser;
  res.json({ success: true, friend: safeFriend });
});

// ----------------- MESSAGES APIS -----------------
app.get('/api/messages', (req, res) => {
  const { userId, friendId } = req.query;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

  db = loadDB();
  const conversation = db.messages.filter(m =>
    (m.senderId === userId && m.receiverId === friendId) ||
    (m.senderId === friendId && m.receiverId === userId)
  );
  res.json({ messages: conversation });
});

app.post('/api/messages/send', (req, res) => {
  const { senderId, receiverId, text, type = 'text' } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: '메시지 전송 정보가 누락되었습니다.' });
  }

  db = loadDB();
  const newMsg = {
    id: 'msg_' + Date.now(),
    senderId,
    receiverId,
    text,
    type,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    isExploded: false
  };

  db.messages.push(newMsg);
  saveDB(db);

  const receiver = db.users.find(u => u.id === receiverId);
  const isOffline = !receiver?.isOnline;

  if (isOffline) {
    console.log(`[WebPush] 📲 Receiver ${receiver?.name}(${receiverId}) is OFFLINE! Web Push triggered.`);
  }

  res.json({
    success: true,
    message: newMsg,
    pushTriggered: isOffline,
    receiverName: receiver?.name
  });
});

app.post('/api/messages/explode', (req, res) => {
  const { msgId } = req.body;
  db = loadDB();
  const msg = db.messages.find(m => m.id === msgId);
  if (msg) {
    msg.isExploded = true;
    saveDB(db);
  }
  res.json({ success: true });
});

// Serve Vite Static Production Build
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MokiPoki Persistent Server running on http://0.0.0.0:${PORT}`);
});
