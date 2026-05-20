const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    kingdom TEXT NOT NULL,
    date TEXT NOT NULL,
    link TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    owner_tag TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS kvk_season (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'KvK Season 1'
  );

  INSERT OR IGNORE INTO kvk_season (id, name) VALUES (1, 'KvK Season 1');

  CREATE TABLE IF NOT EXISTS kvk_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    governor TEXT UNIQUE NOT NULL,
    alliance TEXT NOT NULL,
    kingdom INTEGER NOT NULL,
    kill_points INTEGER NOT NULL DEFAULT 0,
    t4_kills INTEGER NOT NULL DEFAULT 0,
    t5_kills INTEGER NOT NULL DEFAULT 0,
    deaths INTEGER NOT NULL DEFAULT 0,
    registered_by TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

function addProject({ name, kingdom, date, link, owner_id, owner_tag }) {
  const stmt = db.prepare(
    `INSERT INTO projects (name, kingdom, date, link, owner_id, owner_tag)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  return stmt.run(name, kingdom, date, link, owner_id, owner_tag);
}

function getProject(name) {
  return db.prepare(`SELECT * FROM projects WHERE name = ? COLLATE NOCASE`).get(name);
}

function updateProject(name, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  values.push(name);
  db.prepare(`UPDATE projects SET ${setClause} WHERE name = ? COLLATE NOCASE`).run(...values);
}

function deleteProject(name) {
  return db.prepare(`DELETE FROM projects WHERE name = ? COLLATE NOCASE`).run(name);
}

function getProjects(offset = 0, limit = 5) {
  return db.prepare(`SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
}

function countProjects() {
  return db.prepare(`SELECT COUNT(*) as count FROM projects`).get().count;
}

function searchProjects(query) {
  const like = `%${query}%`;
  return db.prepare(
    `SELECT * FROM projects
     WHERE name LIKE ? OR kingdom LIKE ?
     ORDER BY created_at DESC
     LIMIT 25`
  ).all(like, like);
}

function addKvkPlayer({ governor, alliance, kingdom, registered_by }) {
  return db.prepare(
    `INSERT INTO kvk_players (governor, alliance, kingdom, registered_by) VALUES (?, ?, ?, ?)`
  ).run(governor, alliance, kingdom, registered_by);
}

function getKvkPlayer(governor) {
  return db.prepare(`SELECT * FROM kvk_players WHERE governor = ? COLLATE NOCASE`).get(governor);
}

function updateKvkScore(governor, { kill_points, t4_kills, t5_kills, deaths }) {
  db.prepare(
    `UPDATE kvk_players SET kill_points = ?, t4_kills = ?, t5_kills = ?, deaths = ?, updated_at = unixepoch()
     WHERE governor = ? COLLATE NOCASE`
  ).run(kill_points, t4_kills, t5_kills, deaths, governor);
}

function getKvkLeaderboard() {
  return db.prepare(
    `SELECT * FROM kvk_players ORDER BY kill_points DESC LIMIT 10`
  ).all();
}

function getCurrentKvkSeason() {
  return db.prepare(`SELECT name FROM kvk_season WHERE id = 1`).get()?.name ?? 'KvK Season 1';
}

function resetKvkSeason(seasonName) {
  db.prepare(`UPDATE kvk_season SET name = ? WHERE id = 1`).run(seasonName);
  db.prepare(`DELETE FROM kvk_players`).run();
}

module.exports = {
  addProject, getProject, updateProject, deleteProject, getProjects, countProjects, searchProjects,
  addKvkPlayer, getKvkPlayer, updateKvkScore, getKvkLeaderboard, getCurrentKvkSeason, resetKvkSeason,
};
