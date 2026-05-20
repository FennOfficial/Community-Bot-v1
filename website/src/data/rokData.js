export const KILL_POINTS = {
  T1: 2,
  T2: 10,
  T3: 42,
  T4: 168,
  T5: 680,
};

export const TROOP_POWER = {
  T1: 80,
  T2: 210,
  T3: 540,
  T4: 1420,
  T5: 3680,
};

export const TRAINING_COST = {
  T1: { food: 10,    wood: 5,    stone: 0,    gold: 0,   timeSec: 6 },
  T2: { food: 40,    wood: 20,   stone: 5,    gold: 0,   timeSec: 72 },
  T3: { food: 120,   wood: 60,   stone: 15,   gold: 5,   timeSec: 660 },
  T4: { food: 500,   wood: 250,  stone: 60,   gold: 20,  timeSec: 7200 },
  T5: { food: 2000,  wood: 1000, stone: 250,  gold: 100, timeSec: 43200 },
};

export const RESEARCH_POWER = {
  'Military - T1 Troop Attack':    { power: 5000,   level: 1 },
  'Military - T2 Troop Attack':    { power: 15000,  level: 2 },
  'Military - T3 Troop Attack':    { power: 40000,  level: 3 },
  'Military - T4 Troop Attack':    { power: 100000, level: 4 },
  'Military - T5 Troop Attack':    { power: 250000, level: 5 },
  'Military - T4 Troop Training':  { power: 80000,  level: 4 },
  'Military - T5 Troop Training':  { power: 200000, level: 5 },
  'Economic - Food Production I':  { power: 3000,   level: 1 },
  'Economic - Food Production II': { power: 8000,   level: 2 },
  'Defense - City Defense I':      { power: 4000,   level: 1 },
  'Defense - Watchtower':          { power: 12000,  level: 2 },
};

export const CASTLE_COST = {
  1:  { food: 0,       wood: 0,       stone: 0,      gold: 0      },
  2:  { food: 1000,    wood: 500,     stone: 0,      gold: 0      },
  3:  { food: 5000,    wood: 2000,    stone: 500,    gold: 0      },
  4:  { food: 15000,   wood: 8000,    stone: 2000,   gold: 0      },
  5:  { food: 40000,   wood: 20000,   stone: 5000,   gold: 0      },
  6:  { food: 90000,   wood: 45000,   stone: 12000,  gold: 0      },
  7:  { food: 200000,  wood: 100000,  stone: 25000,  gold: 0      },
  8:  { food: 400000,  wood: 200000,  stone: 50000,  gold: 0      },
  9:  { food: 750000,  wood: 380000,  stone: 95000,  gold: 0      },
  10: { food: 1400000, wood: 700000,  stone: 175000, gold: 50000  },
  11: { food: 2500000, wood: 1250000, stone: 310000, gold: 100000 },
  12: { food: 4200000, wood: 2100000, stone: 520000, gold: 160000 },
  13: { food: 6800000, wood: 3400000, stone: 850000, gold: 250000 },
  14: { food: 10000000,wood: 5000000, stone: 1250000,gold: 380000 },
  15: { food: 15000000,wood: 7500000, stone: 1875000,gold: 550000 },
  16: { food: 22000000,wood: 11000000,stone: 2750000,gold: 800000 },
  17: { food: 30000000,wood: 15000000,stone: 3750000,gold: 1100000},
  18: { food: 42000000,wood: 21000000,stone: 5250000,gold: 1500000},
  19: { food: 58000000,wood: 29000000,stone: 7250000,gold: 2100000},
  20: { food: 80000000,wood: 40000000,stone: 10000000,gold:2900000},
  21: { food: 110000000,wood:55000000,stone: 13750000,gold:4000000},
  22: { food: 150000000,wood:75000000,stone: 18750000,gold:5500000},
  23: { food: 200000000,wood:100000000,stone:25000000,gold:7500000},
  24: { food: 270000000,wood:135000000,stone:33750000,gold:10000000},
  25: { food: 360000000,wood:180000000,stone:45000000,gold:14000000},
};

export const T5_REQUIREMENTS = {
  Infantry: {
    buildings: 'Castle Lv.25, Barracks Lv.25, Academy Lv.25',
    research: 'Specialized Warfare → Infantry Lv.5, Military Science T5',
    commander: 'Infantry Commander at Expertise (e.g. Richard I, Alexander)',
    vip: 'VIP 10+',
  },
  Cavalry: {
    buildings: 'Castle Lv.25, Stable Lv.25, Academy Lv.25',
    research: 'Specialized Warfare → Cavalry Lv.5, Military Science T5',
    commander: 'Cavalry Commander at Expertise (e.g. Saladin, Genghis Khan)',
    vip: 'VIP 10+',
  },
  Archers: {
    buildings: 'Castle Lv.25, Archery Range Lv.25, Academy Lv.25',
    research: 'Specialized Warfare → Archer Lv.5, Military Science T5',
    commander: 'Archer Commander at Expertise (e.g. Yi Seong-Gye, Tomyris)',
    vip: 'VIP 10+',
  },
  Siege: {
    buildings: 'Castle Lv.25, Siege Workshop Lv.25, Academy Lv.25',
    research: 'Siege Weapons research in Military tree (Machinery Lv.5)',
    commander: 'Siege Commander at Expertise (e.g. Mehmed II, Charles Martel)',
    vip: 'VIP 10+',
  },
};

export function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function formatTime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}
