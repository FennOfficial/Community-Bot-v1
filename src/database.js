const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS verification_config (
    guild_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'button',
    verified_role_id TEXT,
    verify_channel_id TEXT,
    admin_channel_id TEXT,
    button_message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS ticket_config (
    guild_id TEXT PRIMARY KEY,
    category_id TEXT,
    support_role_id TEXT,
    log_channel_id TEXT,
    panel_channel_id TEXT,
    panel_message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS welcome_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    message TEXT DEFAULT 'Welcome to the server, {user}!',
    dm INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS autorole_config (
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    end_time INTEGER NOT NULL,
    winner_count INTEGER NOT NULL DEFAULT 1,
    ended INTEGER NOT NULL DEFAULT 0,
    host_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS points (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS store_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL,
    role_id TEXT
  );
`);

function getVerificationConfig(guildId) {
  return db.prepare(`SELECT * FROM verification_config WHERE guild_id = ?`).get(guildId);
}
function setVerificationConfig(guildId, fields) {
  const keys = Object.keys(fields);
  const placeholders = keys.map(() => '?').join(', ');
  const setClauses = keys.map(k => `${k} = excluded.${k}`).join(', ');
  db.prepare(
    `INSERT INTO verification_config (guild_id, ${keys.join(', ')}) VALUES (?, ${placeholders})
     ON CONFLICT(guild_id) DO UPDATE SET ${setClauses}`
  ).run(guildId, ...keys.map(k => fields[k]));
}
function updateVerificationConfig(guildId, fields) {
  const keys = Object.keys(fields);
  const set = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE verification_config SET ${set} WHERE guild_id = ?`).run(...keys.map(k => fields[k]), guildId);
}

function getTicketConfig(guildId) {
  return db.prepare(`SELECT * FROM ticket_config WHERE guild_id = ?`).get(guildId);
}
function setTicketConfig(guildId, fields) {
  const keys = Object.keys(fields);
  const placeholders = keys.map(() => '?').join(', ');
  const setClauses = keys.map(k => `${k} = excluded.${k}`).join(', ');
  db.prepare(
    `INSERT INTO ticket_config (guild_id, ${keys.join(', ')}) VALUES (?, ${placeholders})
     ON CONFLICT(guild_id) DO UPDATE SET ${setClauses}`
  ).run(guildId, ...keys.map(k => fields[k]));
}
function openTicket(guildId, userId, channelId) {
  return db.prepare(`INSERT INTO tickets (guild_id, user_id, channel_id) VALUES (?, ?, ?)`).run(guildId, userId, channelId);
}
function closeTicket(channelId) {
  db.prepare(`UPDATE tickets SET status = 'closed' WHERE channel_id = ?`).run(channelId);
}
function getTicketByChannel(channelId) {
  return db.prepare(`SELECT * FROM tickets WHERE channel_id = ?`).get(channelId);
}

function getWelcomeConfig(guildId) {
  return db.prepare(`SELECT * FROM welcome_config WHERE guild_id = ?`).get(guildId);
}
function setWelcomeConfig(guildId, fields) {
  const keys = Object.keys(fields);
  const placeholders = keys.map(() => '?').join(', ');
  const setClauses = keys.map(k => `${k} = excluded.${k}`).join(', ');
  db.prepare(
    `INSERT INTO welcome_config (guild_id, ${keys.join(', ')}) VALUES (?, ${placeholders})
     ON CONFLICT(guild_id) DO UPDATE SET ${setClauses}`
  ).run(guildId, ...keys.map(k => fields[k]));
}

function getAutoroles(guildId) {
  return db.prepare(`SELECT role_id FROM autorole_config WHERE guild_id = ?`).all(guildId).map(r => r.role_id);
}
function addAutorole(guildId, roleId) {
  db.prepare(`INSERT OR IGNORE INTO autorole_config (guild_id, role_id) VALUES (?, ?)`).run(guildId, roleId);
}
function removeAutorole(guildId, roleId) {
  db.prepare(`DELETE FROM autorole_config WHERE guild_id = ? AND role_id = ?`).run(guildId, roleId);
}

function createGiveaway({ guildId, channelId, prize, endTime, winnerCount, hostId }) {
  return db.prepare(
    `INSERT INTO giveaways (guild_id, channel_id, prize, end_time, winner_count, host_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(guildId, channelId, prize, endTime, winnerCount, hostId);
}
function setGiveawayMessageId(id, messageId) {
  db.prepare(`UPDATE giveaways SET message_id = ? WHERE id = ?`).run(messageId, id);
}
function getActiveGiveaways() {
  return db.prepare(`SELECT * FROM giveaways WHERE ended = 0 AND end_time <= ?`).all(Math.floor(Date.now() / 1000));
}
function getGiveawayByMessage(messageId) {
  return db.prepare(`SELECT * FROM giveaways WHERE message_id = ?`).get(messageId);
}
function endGiveaway(id) {
  db.prepare(`UPDATE giveaways SET ended = 1 WHERE id = ?`).run(id);
}
function getLatestGiveaway(guildId) {
  return db.prepare(`SELECT * FROM giveaways WHERE guild_id = ? ORDER BY id DESC LIMIT 1`).get(guildId);
}

function getPoints(userId, guildId) {
  return db.prepare(`SELECT balance FROM points WHERE user_id = ? AND guild_id = ?`).get(userId, guildId)?.balance ?? 0;
}
function addPoints(userId, guildId, amount) {
  db.prepare(
    `INSERT INTO points (user_id, guild_id, balance) VALUES (?, ?, ?)
     ON CONFLICT(user_id, guild_id) DO UPDATE SET balance = balance + ?`
  ).run(userId, guildId, amount, amount);
}
function deductPoints(userId, guildId, amount) {
  db.prepare(
    `UPDATE points SET balance = balance - ? WHERE user_id = ? AND guild_id = ?`
  ).run(amount, userId, guildId);
}

function getStoreItems(guildId) {
  return db.prepare(`SELECT * FROM store_items WHERE guild_id = ? ORDER BY cost ASC`).all(guildId);
}
function getStoreItem(guildId, name) {
  return db.prepare(`SELECT * FROM store_items WHERE guild_id = ? AND LOWER(name) = LOWER(?)`).get(guildId, name);
}
function addStoreItem({ guildId, name, description, cost, roleId }) {
  db.prepare(`INSERT INTO store_items (guild_id, name, description, cost, role_id) VALUES (?, ?, ?, ?, ?)`).run(guildId, name, description, cost, roleId ?? null);
}
function removeStoreItem(guildId, name) {
  db.prepare(`DELETE FROM store_items WHERE guild_id = ? AND LOWER(name) = LOWER(?)`).run(guildId, name);
}

module.exports = {
  getVerificationConfig, setVerificationConfig, updateVerificationConfig,
  getTicketConfig, setTicketConfig, openTicket, closeTicket, getTicketByChannel,
  getWelcomeConfig, setWelcomeConfig,
  getAutoroles, addAutorole, removeAutorole,
  createGiveaway, setGiveawayMessageId, getActiveGiveaways, getGiveawayByMessage, endGiveaway, getLatestGiveaway,
  getPoints, addPoints, deductPoints,
  getStoreItems, getStoreItem, addStoreItem, removeStoreItem,
};
