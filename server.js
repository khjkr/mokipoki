import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Check PostgreSQL Database URL (Olim auto-injects DATABASE_URL when PostgreSQL is active)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  console.log('[DB] PostgreSQL DATABASE_URL detected! Ready to bind Prisma/PG connection.');
} else {
  console.log('[DB] Standalone mode (Database URL not configured yet, running in-memory demo mode).');
}

// In-Memory Fallback State
const db = {
  users: {
    user_me: {
      id: 'user_me',
      handle: '@hyunjun',
      name: '현준',
      statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
      jellyBalance: 240,
      rubyBalance: 15
    }
  },
  messages: []
};

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MokiPoki PWA Server',
    database: dbUrl ? 'PostgreSQL' : 'In-Memory Fallback',
    timestamp: new Date().toISOString()
  });
});

// User API
app.get('/api/users/me', (req, res) => {
  res.json(db.users.user_me);
});

// Messages API
app.get('/api/messages', (req, res) => {
  res.json(db.messages);
});

app.post('/api/messages', (req, res) => {
  const { text, type = 'text', receiverId } = req.body;
  const newMsg = {
    id: 'msg_' + Date.now(),
    senderId: 'user_me',
    receiverId,
    text,
    type,
    timestamp: new Date().toISOString()
  };
  db.messages.push(newMsg);
  res.json({ success: true, message: newMsg });
});

// Serve Vite Static Production Build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MokiPoki (모키포키) Server running on http://0.0.0.0:${PORT}`);
});
