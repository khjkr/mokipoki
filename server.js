import webpush from 'web-push';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent Database Storage File Path (safe fallback for read-only containers)
const DB_FILE = path.join(__dirname, 'database.json');

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
      lastActiveTime: Date.now(),
      lastSeenAt: '온라인',
      avatar: {
        base: 'moki',
        face: 'smile',
        top: 'mint_hoodie',
        bottom: 'denim_pants',
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
      lastActiveTime: Date.now() - 600000,
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
    {
      id: 'fr_seed_1',
      fromId: 'user_hyunjun',
      toId: 'user_minji',
      status: 'accepted',
      createdAt: new Date().toISOString()
    }
  ],
  mutedRooms: {},
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

let memoryDB = JSON.parse(JSON.stringify(DEFAULT_DB));

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDB = JSON.parse(data);
    }
  } catch (err) {
    console.warn('[DB] Persistent read skipped (using memory store):', err.message);
  }
  return memoryDB;
}

function saveDB(data) {
  memoryDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Persistent write skipped (running in-memory):', err.message);
  }
}

function enrichUser(user) {
  const isActuallyOnline = user.isOnline && (Date.now() - (user.lastActiveTime || 0) < 20000);
  const diffSec = Math.floor((Date.now() - (user.lastActiveTime || 0)) / 1000);
  let seenText = '방금 전';
  if (isActuallyOnline) {
    seenText = '온라인';
  } else if (diffSec < 60) {
    seenText = '방금 전';
  } else if (diffSec < 3600) {
    seenText = `${Math.floor(diffSec / 60)}분 전`;
  } else {
    seenText = `${Math.floor(diffSec / 3600)}시간 전`;
  }

  return {
    ...user,
    isOnline: isActuallyOnline,
    lastSeenAt: seenText
  };
}

loadDB();

// 1. Check Handle Duplicate
app.post('/api/auth/check-handle', (req, res) => {
  const { handle } = req.body;
  if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
    return res.status(400).json({ available: false, message: '@아이디를 입력해주세요.' });
  }

  const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
  if (cleanHandle.length < 3) {
    return res.status(400).json({ available: false, message: '아이디는 @포함 3글자 이상이어야 합니다.' });
  }

  const db = loadDB();
  const exists = db.users.some(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (exists) {
    return res.json({ available: false, message: '이미 존재하는 @아이디입니다. 다른 아이디를 입력해주세요.' });
  }

  return res.json({ available: true, message: '사용 가능한 @아이디입니다!' });
});

// 2. Register
app.post('/api/auth/register', (req, res) => {
  const { handle, name, password, baseChoice = 'moki' } = req.body;
  if (!handle || !name) {
    return res.status(400).json({ error: '아이디와 이름을 입력해주세요.' });
  }

  const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
  const db = loadDB();

  if (db.users.some(u => u.handle.toLowerCase() === cleanHandle.toLowerCase())) {
    return res.status(400).json({ error: '이미 존재하는 @아이디입니다. 다른 아이디를 입력해주세요.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    handle: cleanHandle,
    name: name.trim(),
    password: password || '1234',
    statusMsg: '모키포키 새로 입주했어요 🍡',
    jelly: 100,
    ruby: 10,
    isOnline: true,
    lastActiveTime: Date.now(),
    lastSeenAt: '온라인',
    avatar: {
      base: baseChoice,
      face: 'smile',
      top: baseChoice === 'moki' ? 'mint_hoodie' : 'striped_tee',
      bottom: 'denim_pants',
      headwear: baseChoice === 'moki' ? 'cherry_beanie' : 'cat_ears',
      handheld: baseChoice === 'moki' ? 'heart_balloon' : 'gameboy',
      bg: 'pastel_circle',
      effect: 'sparkles'
    }
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...safeUser } = enrichUser(newUser);
  console.log(`[Auth] Registered: ${safeUser.name} (${safeUser.handle})`);
  res.json({ success: true, user: safeUser });
});

// 3. Login
app.post('/api/auth/login', (req, res) => {
  const { handle, password } = req.body;
  if (!handle) {
    return res.status(400).json({ error: '@아이디를 입력해주세요.' });
  }

  const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
  const db = loadDB();
  const user = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: '가입되지 않은 @아이디입니다. 먼저 회원가입을 진행해주세요.' });
  }
  if (password && user.password && user.password !== password) {
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

  user.isOnline = true;
  user.lastActiveTime = Date.now();
  saveDB(db);

  const { password: _, ...safeUser } = enrichUser(user);
  res.json({ success: true, user: safeUser });
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isOnline = false;
    user.lastActiveTime = 0;
    user.lastSeenAt = '방금 전';
    saveDB(db);
  }
  res.json({ success: true });
});

// 5. Heartbeat
app.post('/api/users/heartbeat', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isOnline = true;
    user.lastActiveTime = Date.now();
    saveDB(db);
  }
  res.json({ success: true });
});

// 6. Update Avatar
app.post('/api/users/avatar', (req, res) => {
  const { userId, avatar } = req.body;
  if (!userId || !avatar) return res.status(400).json({ error: 'Missing userId or avatar' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.avatar = { ...user.avatar, ...avatar };
  saveDB(db);

  const { password: _, ...safeUser } = enrichUser(user);
  res.json({ success: true, user: safeUser });
});

// 7. Update Profile
app.post('/api/users/profile', (req, res) => {
  const { userId, name, statusMsg } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (name) user.name = name.trim();
  if (statusMsg !== undefined) user.statusMsg = statusMsg.trim();
  saveDB(db);

  const { password: _, ...safeUser } = enrichUser(user);
  res.json({ success: true, user: safeUser });
});

// 8. Friends List & Requests
app.get('/api/friends', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });

  const db = loadDB();
  db.friendships = db.friendships || [];

  db.friendships = db.friendships.map(f => {
    if (Array.isArray(f)) {
      return { id: 'fr_' + f[0] + '_' + f[1], fromId: f[0], toId: f[1], status: 'accepted', createdAt: new Date().toISOString() };
    }
    return f;
  });

  const acceptedFriendships = db.friendships.filter(f => f.status === 'accepted' && (f.fromId === userId || f.toId === userId));
  const friendIds = acceptedFriendships.map(f => f.fromId === userId ? f.toId : f.fromId);
  const uniqueFriendIds = Array.from(new Set(friendIds));

  const friendsList = uniqueFriendIds.map(fId => {
    const u = db.users.find(user => user.id === fId);
    if (!u) return null;
    const { password: _, ...safe } = enrichUser(u);
    return safe;
  }).filter(Boolean);

  const sentRequests = db.friendships
    .filter(f => f.fromId === userId && f.status === 'pending')
    .map(f => {
      const targetUser = db.users.find(u => u.id === f.toId);
      if (!targetUser) return null;
      const { password: _, ...safe } = enrichUser(targetUser);
      return { id: f.id, targetUser: safe, createdAt: f.createdAt };
    })
    .filter(Boolean);

  const receivedRequests = db.friendships
    .filter(f => f.toId === userId && f.status === 'pending')
    .map(f => {
      const fromUser = db.users.find(u => u.id === f.fromId);
      if (!fromUser) return null;
      const { password: _, ...safe } = enrichUser(fromUser);
      return { id: f.id, fromUser: safe, createdAt: f.createdAt };
    })
    .filter(Boolean);

  res.json({
    friends: friendsList,
    sentRequests,
    receivedRequests
  });
});

// 9. Send Friend Request
app.post('/api/friends/request', (req, res) => {
  const { userId, targetHandle } = req.body;
  if (!userId || !targetHandle) return res.status(400).json({ error: '정보가 누락되었습니다.' });

  const cleanHandle = targetHandle.trim().startsWith('@') ? targetHandle.trim() : `@${targetHandle.trim()}`;
  const db = loadDB();
  db.friendships = db.friendships || [];

  const targetUser = db.users.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

  if (!targetUser) {
    return res.status(404).json({ error: '해당 @아이디를 가진 사용자를 찾을 수 없습니다.' });
  }
  if (targetUser.id === userId) {
    return res.status(400).json({ error: '자기 자신에게는 친구 요청을 보낼 수 없습니다.' });
  }

  const existing = db.friendships.find(f =>
    (f.fromId === userId && f.toId === targetUser.id) ||
    (f.fromId === targetUser.id && f.toId === userId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: '이미 친구로 등록되어 있습니다.' });
    }
    if (existing.status === 'pending') {
      if (existing.fromId === userId) {
        return res.status(400).json({ error: '이미 친구 요청을 보내 수락 대기 중입니다.' });
      } else {
        existing.status = 'accepted';
        saveDB(db);
        const { password: _, ...safe } = enrichUser(targetUser);
        return res.json({ success: true, status: 'accepted', friend: safe, message: '상대방의 요청을 수락하여 친구가 되었습니다!' });
      }
    }
  }

  const newRequest = {
    id: 'fr_' + Date.now(),
    fromId: userId,
    toId: targetUser.id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.friendships.push(newRequest);
  saveDB(db);

  const { password: _, ...safeTarget } = enrichUser(targetUser);
  res.json({ success: true, status: 'pending', targetUser: safeTarget, message: '친구 요청을 보냈습니다. 상대방이 수락하면 친구가 됩니다!' });
});

// 10. Accept Friend Request
app.post('/api/friends/accept', (req, res) => {
  const { requestId, userId } = req.body;
  const db = loadDB();
  db.friendships = db.friendships || [];

  const fr = db.friendships.find(f => f.id === requestId && f.toId === userId);
  if (!fr) return res.status(404).json({ error: '친구 요청을 찾을 수 없습니다.' });

  fr.status = 'accepted';
  saveDB(db);

  const newFriend = db.users.find(u => u.id === fr.fromId);
  const safeFriend = newFriend ? enrichUser(newFriend) : null;

  res.json({ success: true, friend: safeFriend });
});

// 11. Reject Friend Request
app.post('/api/friends/reject', (req, res) => {
  const { requestId, userId } = req.body;
  const db = loadDB();
  db.friendships = db.friendships || [];

  const index = db.friendships.findIndex(f => f.id === requestId && f.toId === userId);
  if (index !== -1) {
    db.friendships.splice(index, 1);
    saveDB(db);
  }

  res.json({ success: true });
});

// 12. Delete Friend
app.post('/api/friends/delete', (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

  const db = loadDB();
  db.friendships = db.friendships || [];

  db.friendships = db.friendships.filter(f =>
    !((f.fromId === userId && f.toId === friendId) || (f.fromId === friendId && f.toId === userId))
  );

  saveDB(db);
  res.json({ success: true, message: '친구 관계가 삭제되었습니다.' });
});

// 13. Messages
app.get('/api/messages', (req, res) => {
  const { userId, friendId } = req.query;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

  const db = loadDB();
  const conversation = (db.messages || []).filter(m =>
    (m.senderId === userId && m.receiverId === friendId) ||
    (m.senderId === friendId && m.receiverId === userId)
  );

  const muteKey = `${userId}_${friendId}`;
  const isMuted = !!(db.mutedRooms && db.mutedRooms[muteKey]);

  res.json({ messages: conversation, isMuted });
});

// 14. Send Message
app.post('/api/messages/send', (req, res) => {
  const { senderId, receiverId, text, type = 'text' } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: '메시지 전송 정보가 누락되었습니다.' });
  }

  const db = loadDB();
  db.messages = db.messages || [];

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
  saveDB(db);

  const receiver = db.users.find(u => u.id === receiverId);
  const isReceiverOnline = receiver && receiver.isOnline && (Date.now() - (receiver.lastActiveTime || 0) < 20000);

  const receiverMuteKey = `${receiverId}_${senderId}`;
  const isReceiverMuted = !!(db.mutedRooms && db.mutedRooms[receiverMuteKey]);

  const pushTriggered = !isReceiverOnline && !isReceiverMuted;

  if (pushTriggered && db.pushSubscriptions && db.pushSubscriptions[receiverId]) {
    const sender = db.users.find(u => u.id === senderId);
    const senderName = sender ? sender.name : '친구';
    const payload = JSON.stringify({
      title: `🍡 모키포키 - ${senderName}`,
      body: type === 'bomb' ? '💣 폭탄 메시지가 도착했습니다!' : type === 'jelly_gift' ? '🍇 젤리 선물이 도착했습니다!' : text,
      url: '/'
    });
    
    db.pushSubscriptions[receiverId].forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => {
        console.warn('Push delivery error:', err.statusCode);
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.pushSubscriptions[receiverId] = db.pushSubscriptions[receiverId].filter(s => s.endpoint !== sub.endpoint);
          saveDB(db);
        }
      });
    });
  }

  res.json({
    success: true,
    message: newMsg,
    pushTriggered,
    receiverName: receiver?.name
  });
});

// 15. Explode Bomb
app.post('/api/messages/explode', (req, res) => {
  const { msgId } = req.body;
  const db = loadDB();
  const msg = (db.messages || []).find(m => m.id === msgId);
  if (msg) {
    msg.isExploded = true;
    saveDB(db);
  }
  res.json({ success: true });
});

// 16. Leave Chat Room
app.post('/api/chat/leave', (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

  const db = loadDB();
  db.messages = (db.messages || []).filter(m =>
    !((m.senderId === userId && m.receiverId === friendId) || (m.senderId === friendId && m.receiverId === userId))
  );

  saveDB(db);
  res.json({ success: true, message: '대화방에서 나갔습니다.' });
});

// 17. Toggle Mute
app.post('/api/chat/mute', (req, res) => {
  const { userId, friendId, isMuted } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: 'userId와 friendId가 필요합니다.' });

  const db = loadDB();
  db.mutedRooms = db.mutedRooms || {};
  const muteKey = `${userId}_${friendId}`;

  if (isMuted) {
    db.mutedRooms[muteKey] = true;
  } else {
    delete db.mutedRooms[muteKey];
  }

  saveDB(db);
  res.json({ success: true, isMuted: !!isMuted });
});


// --- WEB PUSH NOTIFICATION SETUP & ENDPOINTS ---
const initVapid = () => {
  const db = loadDB();
  if (!db.vapidKeys) {
    db.vapidKeys = webpush.generateVAPIDKeys();
    saveDB(db);
  }
  webpush.setVapidDetails(
    'mailto:khjkr@example.com',
    db.vapidKeys.publicKey,
    db.vapidKeys.privateKey
  );
};
initVapid();

app.get('/api/push/vapid-public-key', (req, res) => {
  const db = loadDB();
  res.json({ publicKey: db.vapidKeys ? db.vapidKeys.publicKey : null });
});

app.post('/api/push/subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: '구독 정보가 올바르지 않습니다.' });
  }

  const db = loadDB();
  db.pushSubscriptions = db.pushSubscriptions || {};
  db.pushSubscriptions[userId] = db.pushSubscriptions[userId] || [];

  if (!db.pushSubscriptions[userId].some(s => s.endpoint === subscription.endpoint)) {
    db.pushSubscriptions[userId].push(subscription);
  }

  saveDB(db);
  res.json({ success: true });
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use(express.static(__dirname));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MokiPoki server running on http://0.0.0.0:${PORT}`);
});
