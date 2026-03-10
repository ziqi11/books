import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("watercloud.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    announcement TEXT,
    location TEXT,
    time TEXT,
    posters TEXT, -- JSON array of image strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    cover TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER,
    title TEXT,
    content TEXT,
    image TEXT,
    feelings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    entry_id INTEGER,
    type TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(book_id) REFERENCES books(id),
    FOREIGN KEY(entry_id) REFERENCES entries(id)
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    sentence_index INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES community_posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(activity_id) REFERENCES activities(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES community_posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    user_id INTEGER,
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(activity_id) REFERENCES activities(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- Seed initial activity if none exists
  INSERT INTO activities (title, announcement, location, time, posters) 
  SELECT '春日读诗会', '水云文学社诚邀各位书友参加春日读诗活动。在这个万物复苏的季节，让我们一起分享那些触动心灵的诗篇。', '水云阁', '2026-04-12 14:00', '["https://picsum.photos/seed/activity/800/400"]'
  WHERE NOT EXISTS (SELECT 1 FROM activities);
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.post("/api/users", (req, res) => {
    try {
      const { nickname, avatar } = req.body;
      const stmt = db.prepare("INSERT INTO users (nickname, avatar) VALUES (?, ?)");
      const info = stmt.run(nickname, avatar);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", (req, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/books", (req, res) => {
    try {
      const userId = req.query.userId;
      const books = db.prepare("SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      res.json(books);
    } catch (error) {
      console.error('Get books error:', error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  app.post("/api/books", (req, res) => {
    try {
      const { userId, title, cover, description } = req.body;
      console.log(`Attempting to add book for userId: ${userId} (${typeof userId})`);
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Explicit check to debug FOREIGN KEY constraint
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) {
        console.error(`User with id ${userId} not found in database!`);
        return res.status(400).json({ error: `User with id ${userId} not found. Please re-onboard.` });
      }

      const stmt = db.prepare("INSERT INTO books (user_id, title, cover, description) VALUES (?, ?, ?, ?)");
      const info = stmt.run(userId, title, cover, description);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Add book error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/activities", (req, res) => {
    try {
      const { userId, title, announcement, location, time, posters } = req.body;
      console.log(`Attempting to add activity for userId: ${userId} (${typeof userId})`);
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) {
        console.error(`User with id ${userId} not found in database!`);
        return res.status(400).json({ error: `User with id ${userId} not found. Please re-onboard.` });
      }

      const stmt = db.prepare("INSERT INTO activities (user_id, title, announcement, location, time, posters) VALUES (?, ?, ?, ?, ?, ?)");
      const info = stmt.run(userId, title, announcement, location, time, JSON.stringify(posters));
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Add activity error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/books/:id/entries", (req, res) => {
    try {
      const entries = db.prepare("SELECT * FROM entries WHERE book_id = ? ORDER BY created_at DESC").all(req.params.id);
      res.json(entries);
    } catch (error) {
      console.error('Get entries error:', error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/entries", (req, res) => {
    try {
      const { bookId, title, content, image, feelings } = req.body;
      const stmt = db.prepare("INSERT INTO entries (book_id, title, content, image, feelings) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(bookId, title, content, image, feelings);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Add entry error:', error);
      res.status(500).json({ error: "Failed to add entry" });
    }
  });

  app.get("/api/users/:id/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT cp.*, u.nickname, u.avatar, b.title as book_title, b.cover as book_cover, e.content as entry_content, e.title as entry_title
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN books b ON cp.book_id = b.id
      LEFT JOIN entries e ON cp.entry_id = e.id
      WHERE cp.user_id = ?
      ORDER BY cp.created_at DESC
    `).all(req.params.id);
    res.json(posts);
  });

  app.get("/api/community", (req, res) => {
    const posts = db.prepare(`
      SELECT cp.*, u.nickname, u.avatar, b.title as book_title, b.cover as book_cover, e.content as entry_content, e.title as entry_title
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN books b ON cp.book_id = b.id
      LEFT JOIN entries e ON cp.entry_id = e.id
      ORDER BY cp.created_at DESC
    `).all();
    res.json(posts);
  });

  app.get("/api/community/:id/annotations", (req, res) => {
    const annotations = db.prepare(`
      SELECT a.*, u.nickname, u.avatar
      FROM annotations a
      JOIN users u ON a.user_id = u.id
      WHERE a.post_id = ?
      ORDER BY a.created_at ASC
    `).all(req.params.id);
    res.json(annotations);
  });

  app.post("/api/annotations", (req, res) => {
    const { postId, userId, sentenceIndex, content } = req.body;
    const stmt = db.prepare("INSERT INTO annotations (post_id, user_id, sentence_index, content) VALUES (?, ?, ?, ?)");
    const info = stmt.run(postId, userId, sentenceIndex, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/activities/:id/comments", (req, res) => {
    const comments = db.prepare(`
      SELECT ac.*, u.nickname, u.avatar
      FROM activity_comments ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.activity_id = ?
      ORDER BY ac.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post("/api/activity-comments", (req, res) => {
    const { activityId, userId, content } = req.body;
    const stmt = db.prepare("INSERT INTO activity_comments (activity_id, user_id, content) VALUES (?, ?, ?)");
    const info = stmt.run(activityId, userId, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/community", (req, res) => {
    const { userId, bookId, entryId, type, content } = req.body;
    const stmt = db.prepare("INSERT INTO community_posts (user_id, book_id, entry_id, type, content) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(userId, bookId, entryId, type, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/community/:id/like", (req, res) => {
    db.prepare("UPDATE community_posts SET likes = likes + 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/community/:id/comments", (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.nickname, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { postId, userId, content } = req.body;
    const stmt = db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)");
    const info = stmt.run(postId, userId, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/activities", (req, res) => {
    const activities = db.prepare(`
      SELECT a.*, u.nickname as author_nickname, u.avatar as author_avatar
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `).all() as any[];

    const activitiesWithParticipants = activities.map(activity => {
      const participants = db.prepare(`
        SELECT nickname, user_id
        FROM activity_participants
        WHERE activity_id = ?
      `).all(activity.id);
      return { ...activity, participants };
    });

    res.json(activitiesWithParticipants);
  });

  app.post("/api/activities/:id/participate", (req, res) => {
    const { userId, nickname } = req.body;
    const stmt = db.prepare("INSERT INTO activity_participants (activity_id, user_id, nickname) VALUES (?, ?, ?)");
    const info = stmt.run(req.params.id, userId, nickname);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
