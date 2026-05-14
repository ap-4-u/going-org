const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const db = new Database(path.join(__dirname, 'going.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const ADMIN_PASSWORD = 'snook sniffers';

// Launch date: May 30, 2026 at 7:00 AM ET
const LAUNCH_DATE = new Date('2026-05-30T07:00:00-04:00');

function isLaunched() {
  return Date.now() >= LAUNCH_DATE.getTime();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('male','female')),
    city TEXT NOT NULL,
    badge TEXT NOT NULL,
    profile_pic TEXT NOT NULL,
    photo2 TEXT,
    photo3 TEXT,
    photo4 TEXT,
    photo5 TEXT,
    bio TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    snapchat TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    status TEXT DEFAULT 'going',
    is_admin INTEGER DEFAULT 0,
    is_promoted INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    swiper_id TEXT NOT NULL REFERENCES users(id),
    swiped_id TEXT NOT NULL REFERENCES users(id),
    direction TEXT NOT NULL CHECK(direction IN ('left','right')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(swiper_id, swiped_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES users(id),
    user2_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id TEXT NOT NULL REFERENCES users(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(receiver_id, sender_id)
  );

  CREATE TABLE IF NOT EXISTS profile_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viewed_id TEXT NOT NULL REFERENCES users(id),
    viewer_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Launch status endpoint
app.get('/api/launch-status', (req, res) => {
  const launched = isLaunched();
  res.json({ launched, launchDate: LAUNCH_DATE.toISOString() });
});

// Add columns if they don't exist (for existing DBs)
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN status TEXT DEFAULT \'going\''); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_promoted INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 1'); } catch(e) {}

// Migrate: remove CHECK constraint on badge column (old DBs had it locked to 3 values)
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE name='users'").get();
  if (tableInfo && tableInfo.sql.includes("CHECK(badge IN")) {
    db.exec(`
      CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL CHECK(gender IN ('male','female')),
        city TEXT NOT NULL,
        badge TEXT NOT NULL DEFAULT 'none',
        profile_pic TEXT NOT NULL,
        photo2 TEXT,
        photo3 TEXT,
        photo4 TEXT,
        photo5 TEXT,
        bio TEXT DEFAULT '',
        instagram TEXT DEFAULT '',
        snapchat TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        status TEXT DEFAULT 'going',
        is_admin INTEGER DEFAULT 0,
        is_promoted INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users_new SELECT id, email, password_hash, name, age, gender, city, badge, profile_pic, photo2, photo3, photo4, photo5, bio, instagram, snapchat, phone, status, is_admin, is_promoted, is_approved, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
    console.log('Migrated users table: removed badge CHECK constraint');
  }
} catch(e) { console.error('Badge migration error:', e.message); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Register user
app.post('/api/register', upload.array('photos', 5), (req, res) => {
  try {
    const { email, password, name, age, gender, city, badge, status, bio, instagram, snapchat, phone } = req.body;
    if (!email || !password || !name || !age || !gender || !city || !badge || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const parsedAge = parseInt(age);
    if (parsedAge < 16 || parsedAge > 21) {
      return res.status(400).json({ error: 'Age must be between 16 and 21' });
    }
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const photos = req.files.map(f => f.filename);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, age, gender, city, badge, status, profile_pic, photo2, photo3, photo4, photo5, bio, instagram, snapchat, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, email.toLowerCase().trim(), password_hash, name, parsedAge, gender, city, badge, status || 'going',
      photos[0] || null, photos[1] || null, photos[2] || null, photos[3] || null, photos[4] || null,
      bio || '', instagram || '', snapchat || '', phone || ''
    );

    res.json({ id, name, age: parsedAge, gender, city, badge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'No account found with that email' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    // Don't send password hash to client
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Strip sensitive fields from user objects sent to other users
function publicUser(u) {
  if (!u) return u;
  const { password_hash, is_admin, is_promoted, is_approved, ...safe } = u;
  return safe;
}

// Get user profile
app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Return full data to the user themselves (they need is_admin etc.), strip for others
  const requesterId = req.query.self;
  if (requesterId === req.params.id) {
    const { password_hash, ...safeUser } = user;
    return res.json(safeUser);
  }
  res.json(publicUser(user));
});

// Update user profile
app.put('/api/users/:id', upload.array('photos', 5), (req, res) => {
  try {
    const { name, age, city, badge, status, bio, instagram, snapchat, phone } = req.body;
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    let photoUpdates = {};
    if (req.files && req.files.length > 0) {
      const photos = req.files.map(f => f.filename);
      photoUpdates = {
        profile_pic: photos[0] || existing.profile_pic,
        photo2: photos[1] || existing.photo2,
        photo3: photos[2] || existing.photo3,
        photo4: photos[3] || existing.photo4,
        photo5: photos[4] || existing.photo5,
      };
    }

    db.prepare(`
      UPDATE users SET name=?, age=?, city=?, badge=?, status=?, bio=?, instagram=?, snapchat=?, phone=?,
      profile_pic=?, photo2=?, photo3=?, photo4=?, photo5=?
      WHERE id=?
    `).run(
      name || existing.name,
      age ? parseInt(age) : existing.age,
      city || existing.city,
      badge || existing.badge,
      status || existing.status || 'going',
      bio !== undefined ? bio : existing.bio,
      instagram !== undefined ? instagram : existing.instagram,
      snapchat !== undefined ? snapchat : existing.snapchat,
      phone !== undefined ? phone : existing.phone,
      photoUpdates.profile_pic || existing.profile_pic,
      photoUpdates.photo2 || existing.photo2,
      photoUpdates.photo3 || existing.photo3,
      photoUpdates.photo4 || existing.photo4,
      photoUpdates.photo5 || existing.photo5,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete user profile
app.delete('/api/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM messages WHERE sender_id = ?').run(req.params.id);
    db.prepare('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM inbox WHERE receiver_id = ? OR sender_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM swipes WHERE swiper_id = ? OR swiped_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM profile_views WHERE viewed_id = ? OR viewer_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Track profile view
app.post('/api/profile-view', (req, res) => {
  const { viewedId, viewerId } = req.body;
  if (!viewedId || !viewerId || viewedId === viewerId) return res.json({ ok: true });
  try {
    db.prepare('INSERT INTO profile_views (viewed_id, viewer_id) VALUES (?, ?)').run(viewedId, viewerId);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

// Get profile view count + recent viewers
app.get('/api/profile-views/:userId', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM profile_views WHERE viewed_id = ?').get(req.params.userId);
  const viewers = db.prepare(`
    SELECT DISTINCT users.id, users.name, users.age, users.city, users.profile_pic, users.badge,
      MAX(profile_views.created_at) as viewed_at
    FROM profile_views
    JOIN users ON users.id = profile_views.viewer_id
    WHERE profile_views.viewed_id = ?
    GROUP BY users.id
    ORDER BY viewed_at DESC
    LIMIT 50
  `).all(req.params.userId);
  res.json({ count: count.count, viewers });
});

// Admin login — just verifies password, no DB changes
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Missing password' });

  if (password.toLowerCase().trim() !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ success: true });
});

// Admin auth helper — verify by password in request, not DB flag
function verifyAdmin(adminKey) {
  return adminKey && adminKey.toLowerCase().trim() === ADMIN_PASSWORD;
}

// Admin: search all profiles
app.get('/api/admin/profiles', (req, res) => {
  const { adminKey, city, minAge, maxAge, gender, badge, search } = req.query;

  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (city) { query += ' AND city = ?'; params.push(city); }
  if (minAge) { query += ' AND age >= ?'; params.push(parseInt(minAge)); }
  if (maxAge) { query += ' AND age <= ?'; params.push(parseInt(maxAge)); }
  if (gender) { query += ' AND gender = ?'; params.push(gender); }
  if (badge) { query += ' AND badge = ?'; params.push(badge); }
  if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY created_at DESC LIMIT 200';

  const profiles = db.prepare(query).all(...params);
  res.json(profiles);
});

// Admin: get stats
app.get('/api/admin/stats', (req, res) => {
  const { adminKey } = req.query;
  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalFemale = db.prepare("SELECT COUNT(*) as c FROM users WHERE gender='female'").get().c;
  const totalMale = db.prepare("SELECT COUNT(*) as c FROM users WHERE gender='male'").get().c;
  const totalMatches = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
  const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
  const totalSwipes = db.prepare('SELECT COUNT(*) as c FROM swipes').get().c;

  const cityCounts = db.prepare('SELECT city, COUNT(*) as count FROM users GROUP BY city ORDER BY count DESC').all();
  const badgeCounts = db.prepare('SELECT badge, COUNT(*) as count FROM users GROUP BY badge ORDER BY count DESC').all();

  res.json({ totalUsers, totalFemale, totalMale, totalMatches, totalMessages, totalSwipes, cityCounts, badgeCounts });
});

// Admin: approve/unapprove user
app.post('/api/admin/approve', (req, res) => {
  const { adminKey, targetId, approved } = req.body;
  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  db.prepare('UPDATE users SET is_approved = ? WHERE id = ?').run(approved ? 1 : 0, targetId);
  res.json({ success: true });
});

// Admin: promote/demote (self-promote to appear on everyone's feed)
app.post('/api/admin/promote', (req, res) => {
  const { adminKey, targetId, promoted } = req.body;
  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  db.prepare('UPDATE users SET is_promoted = ? WHERE id = ?').run(promoted ? 1 : 0, targetId);
  res.json({ success: true });
});

// Admin: delete any user
app.post('/api/admin/delete-user', (req, res) => {
  const { adminKey, targetId } = req.body;
  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  db.prepare('DELETE FROM messages WHERE sender_id = ?').run(targetId);
  db.prepare('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?').run(targetId, targetId);
  db.prepare('DELETE FROM inbox WHERE receiver_id = ? OR sender_id = ?').run(targetId, targetId);
  db.prepare('DELETE FROM swipes WHERE swiper_id = ? OR swiped_id = ?').run(targetId, targetId);
  db.prepare('DELETE FROM profile_views WHERE viewed_id = ? OR viewer_id = ?').run(targetId, targetId);
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  res.json({ success: true });
});

// Admin: reset swipes (let admin re-swipe everyone)
app.post('/api/admin/reset-swipes', (req, res) => {
  const { adminKey, userId } = req.body;
  if (!verifyAdmin(adminKey)) return res.status(403).json({ error: 'Not admin' });

  db.prepare('DELETE FROM swipes WHERE swiper_id = ?').run(userId);
  res.json({ success: true });
});

// Get profiles to swipe — promoted users show for everyone regardless of gender
app.get('/api/discover/:userId', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Launch gate: pass adminKey to bypass
  const { minAge, maxAge, city, badge, adminKey } = req.query;
  if (!isLaunched() && !verifyAdmin(adminKey)) {
    return res.json([]);
  }

  const targetGender = user.gender === 'male' ? 'female' : 'male';

  // Normal profiles (opposite gender) + promoted profiles (appear for everyone)
  let query = `
    SELECT * FROM users
    WHERE id != ?
    AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ?)
    AND is_approved = 1
    AND (gender = ? OR is_promoted = 1)
  `;
  const params = [user.id, user.id, targetGender];

  if (minAge) { query += ' AND age >= ?'; params.push(parseInt(minAge)); }
  if (maxAge) { query += ' AND age <= ?'; params.push(parseInt(maxAge)); }
  if (city) { query += ' AND city = ?'; params.push(city); }
  if (badge) { query += ' AND badge = ?'; params.push(badge); }

  // Promoted users appear first, then sort by city match and age similarity
  query += ' ORDER BY is_promoted DESC, (CASE WHEN city = ? THEN 0 ELSE 1 END), ABS(age - ?) ASC LIMIT 50';
  params.push(user.city, user.age);

  const profiles = db.prepare(query).all(...params).map(publicUser);
  res.json(profiles);
});

// Swipe
app.post('/api/swipe', (req, res) => {
  const { swiperId, swipedId, direction } = req.body;
  if (!swiperId || !swipedId || !direction) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Launch gate
  if (!isLaunched() && !verifyAdmin(req.body.adminKey)) {
    return res.status(403).json({ error: 'App not launched yet' });
  }

  try {
    db.prepare('INSERT OR REPLACE INTO swipes (swiper_id, swiped_id, direction) VALUES (?, ?, ?)')
      .run(swiperId, swipedId, direction);

    // Track profile view on swipe
    try {
      db.prepare('INSERT INTO profile_views (viewed_id, viewer_id) VALUES (?, ?)').run(swipedId, swiperId);
    } catch(e) {}

    if (direction === 'right') {
      db.prepare('INSERT OR IGNORE INTO inbox (receiver_id, sender_id) VALUES (?, ?)')
        .run(swipedId, swiperId);

      const mutual = db.prepare(
        'SELECT * FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND direction = ?'
      ).get(swipedId, swiperId, 'right');

      if (mutual) {
        const matchId = uuidv4();
        db.prepare('INSERT OR IGNORE INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)')
          .run(matchId, swiperId, swipedId);

        db.prepare('UPDATE inbox SET status = ? WHERE receiver_id = ? AND sender_id = ?')
          .run('accepted', swipedId, swiperId);
        db.prepare('UPDATE inbox SET status = ? WHERE receiver_id = ? AND sender_id = ?')
          .run('accepted', swiperId, swipedId);

        const otherUser = db.prepare('SELECT * FROM users WHERE id = ?').get(swipedId);
        io.to(swipedId).emit('new_match', { matchId, user: db.prepare('SELECT * FROM users WHERE id = ?').get(swiperId) });
        io.to(swiperId).emit('new_match', { matchId, user: otherUser });

        return res.json({ match: true, matchId, user: otherUser });
      }
    }

    res.json({ match: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Swipe failed' });
  }
});

// Get inbox
app.get('/api/inbox/:userId', (req, res) => {
  const items = db.prepare(`
    SELECT inbox.*, users.name, users.age, users.city, users.badge, users.profile_pic, users.gender
    FROM inbox
    JOIN users ON users.id = inbox.sender_id
    WHERE inbox.receiver_id = ? AND inbox.status = 'pending'
    ORDER BY inbox.created_at DESC
  `).all(req.params.userId);
  res.json(items);
});

// Respond to inbox (accept/reject)
app.post('/api/inbox/respond', (req, res) => {
  const { receiverId, senderId, action } = req.body;

  if (action === 'accept') {
    db.prepare('UPDATE inbox SET status = ? WHERE receiver_id = ? AND sender_id = ?')
      .run('accepted', receiverId, senderId);

    db.prepare('INSERT OR IGNORE INTO swipes (swiper_id, swiped_id, direction) VALUES (?, ?, ?)')
      .run(receiverId, senderId, 'right');

    const matchId = uuidv4();
    const existingMatch = db.prepare(
      'SELECT * FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)'
    ).get(receiverId, senderId, senderId, receiverId);

    if (!existingMatch) {
      db.prepare('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)')
        .run(matchId, senderId, receiverId);
    }

    const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
    const receiver = db.prepare('SELECT * FROM users WHERE id = ?').get(receiverId);

    io.to(senderId).emit('new_match', { matchId: existingMatch?.id || matchId, user: receiver });
    io.to(receiverId).emit('new_match', { matchId: existingMatch?.id || matchId, user: sender });

    res.json({ matched: true, matchId: existingMatch?.id || matchId });
  } else {
    db.prepare('UPDATE inbox SET status = ? WHERE receiver_id = ? AND sender_id = ?')
      .run('rejected', receiverId, senderId);
    db.prepare('INSERT OR IGNORE INTO swipes (swiper_id, swiped_id, direction) VALUES (?, ?, ?)')
      .run(receiverId, senderId, 'left');
    res.json({ matched: false });
  }
});

// Get matches
app.get('/api/matches/:userId', (req, res) => {
  const matches = db.prepare(`
    SELECT matches.id as matchId, matches.created_at as matchedAt,
      CASE WHEN matches.user1_id = ? THEN u2.id ELSE u1.id END as partnerId,
      CASE WHEN matches.user1_id = ? THEN u2.name ELSE u1.name END as partnerName,
      CASE WHEN matches.user1_id = ? THEN u2.age ELSE u1.age END as partnerAge,
      CASE WHEN matches.user1_id = ? THEN u2.city ELSE u1.city END as partnerCity,
      CASE WHEN matches.user1_id = ? THEN u2.badge ELSE u1.badge END as partnerBadge,
      CASE WHEN matches.user1_id = ? THEN u2.profile_pic ELSE u1.profile_pic END as partnerPic,
      CASE WHEN matches.user1_id = ? THEN u2.instagram ELSE u1.instagram END as partnerInstagram,
      CASE WHEN matches.user1_id = ? THEN u2.snapchat ELSE u1.snapchat END as partnerSnapchat,
      CASE WHEN matches.user1_id = ? THEN u2.phone ELSE u1.phone END as partnerPhone,
      (SELECT text FROM messages WHERE match_id = matches.id ORDER BY created_at DESC LIMIT 1) as lastMessage,
      (SELECT created_at FROM messages WHERE match_id = matches.id ORDER BY created_at DESC LIMIT 1) as lastMessageAt
    FROM matches
    JOIN users u1 ON u1.id = matches.user1_id
    JOIN users u2 ON u2.id = matches.user2_id
    WHERE matches.user1_id = ? OR matches.user2_id = ?
    ORDER BY lastMessageAt DESC NULLS LAST, matches.created_at DESC
  `).all(
    req.params.userId, req.params.userId, req.params.userId,
    req.params.userId, req.params.userId, req.params.userId,
    req.params.userId, req.params.userId, req.params.userId,
    req.params.userId, req.params.userId
  );
  res.json(matches);
});

// Get messages for a match
app.get('/api/messages/:matchId', (req, res) => {
  const messages = db.prepare(`
    SELECT messages.*, users.name as senderName, users.profile_pic as senderPic
    FROM messages
    JOIN users ON users.id = messages.sender_id
    WHERE messages.match_id = ?
    ORDER BY messages.created_at ASC
  `).all(req.params.matchId);
  res.json(messages);
});

// Send message
app.post('/api/messages', (req, res) => {
  const { matchId, senderId, text } = req.body;
  if (!matchId || !senderId || !text) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, match_id, sender_id, text) VALUES (?, ?, ?, ?)')
    .run(id, matchId, senderId, text);

  const message = db.prepare(`
    SELECT messages.*, users.name as senderName, users.profile_pic as senderPic
    FROM messages JOIN users ON users.id = messages.sender_id
    WHERE messages.id = ?
  `).get(id);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  const recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id;

  io.to(recipientId).emit('new_message', message);
  io.to(senderId).emit('new_message', message);

  res.json(message);
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    socket.join(userId);
  });
});

// Serve client build in production
if (fs.existsSync(path.join(__dirname, 'client', 'dist'))) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('/{*splat}', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Going.org server running on port ${PORT}`));
