import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Database connection check
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  console.log('[DB] PostgreSQL DATABASE_URL detected! Ready to connect Prisma/PG.');
} else {
  console.log('[DB] Running in-memory database mode for development & tests.');
}

// Global In-Memory Database for Users, Friendships, and Messages
const db = {
  users: [
    {
      id: 'user_hyunjun',
      handle: '@hyunjun',
      name: '현준',
      password: 'demo',
      statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
      jellyBalance: 320,
      rubyBalance: 20,
      isOnline: true,
      lastSeenAt: '온라인',
      avatarConfig: {
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
      jellyBalance: 150,
      rubyBalance: 5,
      isOnline: false,
      lastSeenAt: '방금 전',
      avatarConfig: {
        base: 'poki',
        face: 'wink',
        top: 'striped_tee',
        bottom: 'denim_pants',
        headwear: 'cat_ears',
        handheld: 'gameboy',
        bg: 'pastel_circle',
        effect: 'sparkles'
      }
    },
    {
      id: 'user_junho',
      handle: '@junho',
      name: '준호',
      password: 'demo',
      statusMsg: '오목 한판 뜰 사람 구함 🕹️',
      jellyBalance: 80,
      rubyBalance: 0,
      isOnline: false,
      lastSeenAt: '12분 전',
      avatarConfig: {
        base: 'moki',
        face: 'sparkle',
        top: 'yellow_knit',
        headwear: 'round_glasses',
        handheld: 'gameboy',
        bg: 'pastel_circle',
        effect: 'sparkles'
      }
    }
  ],
  friends: [
    { userId: 'user_hyunjun', friendId: 'user_minji' },
    { userId: 'user_minji', friendId: 'user_hyunjun' },
    { userId: 'user_hyunjun', friendId: 'user_junho' },
    { userId: 'user_junho', friendId: 'user_hyunjun' }
  ],
  messages: [
    {
      id: 'm1',
      senderId: 'user_minji',
      receiverId: 'user_hyunjun',
      text: '현준아 모키포키 들어왔어? 대박 귀여워 ㅋㅋㅋ',
      timestamp: '18:40',
      type: 'text'
    },
    {
      id: 'm2',
      senderId: 'user_hyunjun',
      receiverId: 'user_minji',
      text: '응응! 나 방금 찹쌀떡 모키로 캐릭터 만들었음!',
      timestamp: '18:41',
      type: 'text'
    },
    {
      id: 'm3',
      senderId: 'user_minji',
      receiverId: 'user_hyunjun',
      text: '이거 탭하면 터지는 폭탄 메시지다! 💣',
      timestamp: '18:41',
      type: 'bomb',
      isExploded: false
    }
  ],
  pushSubscriptions: {}
};

// ----------------- AUTH APIS -----------------
app.post('/api/auth/register', (req, res) => {
  const { handle, name, password, baseChoice = 'moki' } = req.body;
  if (!handle || !name) {
    return res.status(400).json({ error: '아이디와 이름을 입력해주세요.' });
  }
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const existing = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: '이미 존재하는 @아이디입니다. 다른 아이디를 입력해주세요.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    handle: cleanHandle,
    name,
    password: password || '1234',
    statusMsg: '모키포키 새로 입주했어요 🍡',
    jellyBalance: 100,
    rubyBalance: 10,
    isOnline: true,
    lastSeenAt: '온라인',
    avatarConfig: {
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
  console.log(`[Auth] Registered new user: ${newUser.name} (${newUser.handle})`);
  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { handle, password } = req.body;
  if (!handle) {
    return res.status(400).json({ error: '@아이디를 입력해주세요.' });
  }
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const user = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: '가입되지 않은 @아이디입니다. 회원가입을 먼저 진행해주세요.' });
  }
  if (password && user.password && user.password !== password) {
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

  // Update presence to online
  user.isOnline = true;
  user.lastSeenAt = '온라인';
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isOnline = false;
    user.lastSeenAt = '방금 전';
  }
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  const safeUsers = db.users.map(({ password, ...rest }) => rest);
  res.json({ users: safeUsers });
});

// ----------------- FRIENDS APIS -----------------
app.get('/api/friends', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });
  const friendIds = db.friends.filter(f => f.userId === userId).map(f => f.friendId);
  const friendList = db.users.filter(u => friendIds.includes(u.id)).map(({ password, ...rest }) => rest);
  res.json({ friends: friendList });
});

app.post('/api/friends/add', (req, res) => {
  const { userId, targetHandle } = req.body;
  if (!userId || !targetHandle) return res.status(400).json({ error: '정보가 누락되었습니다.' });

  const cleanHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
  const targetUser = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!targetUser) {
    return res.status(404).json({ error: '해당 @아이디를 가진 사용자를 찾을 수 없습니다.' });
  }
  if (targetUser.id === userId) {
    return res.status(400).json({ error: '자기 자신은 친구로 추가할 수 없습니다.' });
  }

  const already = db.friends.some(f => f.userId === userId && f.friendId === targetUser.id);
  if (already) {
    return res.status(400).json({ error: '이미 친구로 등록되어 있습니다.' });
  }

  // Two-way friendship
  db.friends.push({ userId, friendId: targetUser.id });
  db.friends.push({ userId: targetUser.id, friendId: userId });

  const { password, ...safeFriend } = targetUser;
  res.json({ success: true, friend: safeFriend });
});

// ----------------- MESSAGES APIS -----------------
app.get('/api/messages', (req, res) => {
  const { userId, friendId } = req.query;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

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

  const newMsg = {
    id: 'msg_' + Date.now(),
    senderId,
    receiverId,
    text,
    type,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    isExploded: false
  };
  db.messages.push(newMsg);

  // Check if receiver is online
  const receiver = db.users.find(u => u.id === receiverId);
  const isOffline = !receiver?.isOnline;

  if (isOffline) {
    console.log(`[WebPush] 📲 Receiver ${receiver?.name}(${receiverId}) is OFFLINE! Triggered background Web Push notification.`);
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
  const msg = db.messages.find(m => m.id === msgId);
  if (msg) {
    msg.isExploded = true;
  }
  res.json({ success: true });
});

// Serve Vite Static Production Build
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MokiPoki Server running on http://0.0.0.0:${PORT}`);
});
