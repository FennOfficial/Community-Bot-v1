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

module.exports = { addProject, getProject, updateProject, deleteProject, getProjects, countProjects };
