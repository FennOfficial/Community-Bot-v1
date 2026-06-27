const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'community.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kd TEXT NOT NULL,
    date TEXT NOT NULL,
    link TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS kingdom_alert_config (
    guild_id TEXT PRIMARY KEY,
    announce_channel_id TEXT NOT NULL,
    role_id TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS kingdom_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kd_number TEXT NOT NULL,
    opened_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

function registerProject(guildId, userId, name, kd, date, link) {
  db.prepare(`
    INSERT INTO projects (guild_id, user_id, name, kd, date, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, name, kd, date, link);
}

function getUserProject(guildId, userId) {
  return db.prepare(`SELECT * FROM projects WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1`).get(guildId, userId);
}

function updateProject(id, fields) {
  const keys = Object.keys(fields);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE projects SET ${setClauses} WHERE id = ?`).run(...keys.map(k => fields[k]), id);
}

function getProjects(guildId, offset, limit) {
  return db.prepare(`SELECT * FROM projects WHERE guild_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`).all(guildId, limit, offset);
}

function countProjects(guildId) {
  return db.prepare(`SELECT COUNT(*) as count FROM projects WHERE guild_id = ?`).get(guildId).count;
}

function getLastKingdom() {
  return db.prepare(`SELECT * FROM kingdom_history ORDER BY opened_at DESC LIMIT 1`).get();
}

function recordKingdom(kdNumber) {
  db.prepare(`INSERT INTO kingdom_history (kd_number) VALUES (?)`).run(String(kdNumber));
}

function getKingdomAlertConfig(guildId) {
  return db.prepare(`SELECT * FROM kingdom_alert_config WHERE guild_id = ?`).get(guildId);
}

function setKingdomAlertConfig(guildId, channelId, roleId) {
  db.prepare(`
    INSERT INTO kingdom_alert_config (guild_id, announce_channel_id, role_id, enabled)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(guild_id) DO UPDATE SET
      announce_channel_id = excluded.announce_channel_id,
      role_id = excluded.role_id,
      enabled = 1
  `).run(guildId, channelId, roleId ?? null);
}

function getAllAlertConfigs() {
  return db.prepare(`SELECT * FROM kingdom_alert_config WHERE enabled = 1`).all();
}

module.exports = {
  registerProject, getUserProject, updateProject, getProjects, countProjects,
  getLastKingdom, recordKingdom,
  getKingdomAlertConfig, setKingdomAlertConfig, getAllAlertConfigs,
};
