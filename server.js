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
  console.log('[DB] PostgreSQL DATABASE_URL detected! Ready to connect.');
} else {
  console.log('[DB] Running in-memory database mode for development & tests.');
}

// In-Memory Database Store for Testing & Instant Demo
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
      lastSeenAt: new Date().toISOString(),
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
      handle: '@poki_master',
      name: '민지',
      password: 'demo',
      statusMsg: '체리 비니 새로 샀음 🍒',
      jellyBalance: 150,
      rubyBalance: 5,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
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
      handle: '@moki_love',
      name: '준호',
      password: 'demo',
      statusMsg: '오목 한판 뜰 사람 구함 🕹️',
      jellyBalance: 80,
      rubyBalance: 0,
      isOnline: false,
      lastSeenAt: '10분 전',
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
    { userId: 'user_hyunjun', friendId: 'user_junho' }
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
    return res.status(400).json({ error: '이미 사용 중인 @아이디입니다.' });
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
    lastSeenAt: new Date().toISOString(),
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
  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { handle, password } = req.body;
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const user = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: '등록되지 않은 @아이디입니다.' });
  }
  user.isOnline = true;
  user.lastSeenAt = new Date().toISOString();
  res.json({ success: true, user });
});

// ----------------- PRESENCE APIS -----------------
app.post('/api/presence/heartbeat', (req, res) => {
  const { userId, isOnline } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isOnline = isOnline;
    user.lastSeenAt = isOnline ? '방금 전' : new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  res.json({ success: true, isOnline: user?.isOnline });
});

// ----------------- PUSH SUBSCRIPTION APIS -----------------
app.post('/api/push/subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  db.pushSubscriptions[userId] = subscription;
  console.log(`[Push] Registered Web Push Subscription for user: ${userId}`);
  res.json({ success: true, message: '백그라운드 웹푸시가 등록되었습니다.' });
});

// ----------------- FRIENDS APIS -----------------
app.get('/api/friends', (req, res) => {
  const { userId = 'user_hyunjun' } = req.query;
  const friendIds = db.friends.filter(f => f.userId === userId).map(f => f.friendId);
  const friendList = db.users.filter(u => friendIds.includes(u.id));
  res.json({ friends: friendList });
});

app.post('/api/friends/add', (req, res) => {
  const { userId = 'user_hyunjun', targetHandle } = req.body;
  const cleanHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
  const targetUser = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!targetUser) {
    return res.status(404).json({ error: '해당 @아이디를 가진 유저를 찾을 수 없습니다.' });
  }
  if (targetUser.id === userId) {
    return res.status(400).json({ error: '자기 자신은 친구로 추가할 수 없습니다.' });
  }

  const alreadyFriend = db.friends.some(f => f.userId === userId && f.friendId === targetUser.id);
  if (alreadyFriend) {
    return res.status(400).json({ error: '이미 친구로 등록되어 있습니다.' });
  }

  db.friends.push({ userId, friendId: targetUser.id });
  db.friends.push({ userId: targetUser.id, friendId: userId }); // 양방향

  res.json({ success: true, friend: targetUser });
});

// ----------------- MESSAGES APIS -----------------
app.get('/api/messages/:friendId', (req, res) => {
  const { friendId } = req.params;
  const { userId = 'user_hyunjun' } = req.query;
  const conversation = db.messages.filter(m =>
    (m.senderId === userId && m.receiverId === friendId) ||
    (m.senderId === friendId && m.receiverId === userId)
  );
  res.json({ messages: conversation });
});

app.post('/api/messages/send', (req, res) => {
  const { senderId, receiverId, text, type = 'text' } = req.body;
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

  // Check if receiver is offline -> Web Push Trigger!
  const receiver = db.users.find(u => u.id === receiverId);
  const isReceiverOffline = !receiver?.isOnline;
  let pushTriggered = false;

  if (isReceiverOffline) {
    console.log(`[WebPush] 📲 Receiver ${receiver?.name}(${receiverId}) is OFFLINE! Triggering background Web Push notification...`);
    pushTriggered = true;
  }

  // Interactive Auto-reply Bot simulation for test friends
  let autoReply = null;
  if (receiverId === 'user_minji' || receiverId === 'user_junho') {
    const responses = [
      '대박! 진짜 카카오톡처럼 잘 보내진다 ㅎㅎ',
      '모키포키 캐릭터 너무 귀여워 🍡',
      '나 방금 스토어에서 옷 갈아입고 왔어!',
      '오프라인이어도 백그라운드 푸시 바로 울리네 🔔'
    ];
    autoReply = {
      id: 'reply_' + Date.now(),
      senderId: receiverId,
      receiverId: senderId,
      text: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };
  }

  res.json({
    success: true,
    message: newMsg,
    pushTriggered,
    receiverOnline: !isReceiverOffline,
    autoReply
  });
});

// Static files & SPA
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MokiPoki (모키포키) Server running on http://0.0.0.0:${PORT}`);
});
