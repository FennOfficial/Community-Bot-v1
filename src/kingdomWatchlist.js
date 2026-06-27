const watchlist = new Map();

function addWatch(kdNum, guildId, channelId, roleId) {
  const key = String(kdNum);
  if (!watchlist.has(key)) watchlist.set(key, new Map());
  watchlist.get(key).set(guildId, { channelId, roleId: roleId ?? null });
}

function removeWatch(kdNum, guildId) {
  const key = String(kdNum);
  if (!watchlist.has(key)) return false;
  const removed = watchlist.get(key).delete(guildId);
  if (watchlist.get(key).size === 0) watchlist.delete(key);
  return removed;
}

function removeAllWatches(guildId) {
  let count = 0;
  for (const [key, guilds] of watchlist) {
    if (guilds.has(guildId)) {
      guilds.delete(guildId);
      count++;
      if (guilds.size === 0) watchlist.delete(key);
    }
  }
  return count;
}

function getWatches(kdNum) {
  const map = watchlist.get(String(kdNum));
  if (!map) return [];
  return [...map.entries()].map(([guildId, cfg]) => ({ guildId, ...cfg }));
}

function listWatchesForGuild(guildId) {
  const result = [];
  for (const [kd, guilds] of watchlist) {
    if (guilds.has(guildId)) result.push({ kd, ...guilds.get(guildId) });
  }
  return result;
}

module.exports = { addWatch, removeWatch, getWatches, listWatchesForGuild };
