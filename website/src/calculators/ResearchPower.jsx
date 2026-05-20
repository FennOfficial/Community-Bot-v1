import React, { useState } from 'react';
import { formatNum } from '../data/rokData';

const RESEARCH_TREES = {
  Military: [
    { name: 'Infantry Attack I–V',    power: [3000, 8000, 20000, 50000, 120000] },
    { name: 'Cavalry Attack I–V',     power: [3000, 8000, 20000, 50000, 120000] },
    { name: 'Archer Attack I–V',      power: [3000, 8000, 20000, 50000, 120000] },
    { name: 'T4 Troop Training',      power: [0, 0, 0, 80000, 0] },
    { name: 'T5 Troop Training',      power: [0, 0, 0, 0, 200000] },
    { name: 'Siege Weapon I–III',     power: [5000, 15000, 40000, 0, 0] },
  ],
  Economic: [
    { name: 'Food Production I–V',    power: [2000, 5000, 12000, 28000, 60000] },
    { name: 'Wood Production I–V',    power: [2000, 5000, 12000, 28000, 60000] },
    { name: 'Stone Production I–V',   power: [2000, 5000, 12000, 28000, 60000] },
    { name: 'Trade I–III',            power: [3000, 8000, 18000, 0, 0] },
  ],
  Defense: [
    { name: 'City Defense I–V',       power: [2500, 6000, 15000, 35000, 80000] },
    { name: 'Watchtower I–III',       power: [4000, 10000, 25000, 0, 0] },
    { name: 'Wall Durability I–III',  power: [3000, 8000, 18000, 0, 0] },
  ],
};

export default function ResearchPower() {
  const [tree, setTree] = useState('Military');
  const [levels, setLevels] = useState({});

  const setLevel = (name, val) => setLevels(prev => ({ ...prev, [name]: val }));

  const items = RESEARCH_TREES[tree];

  const totalPower = items.reduce((sum, item) => {
    const lv = parseInt(levels[item.name]) || 0;
    return sum + item.power.slice(0, lv).reduce((a, b) => a + b, 0);
  }, 0);

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Select your researched levels per item to estimate power gained.
      </p>
      <div className="form-grid" style={{ maxWidth: 280, marginBottom: 24 }}>
        <div className="form-group">
          <label>Research Tree</label>
          <select value={tree} onChange={e => { setTree(e.target.value); setLevels({}); }}>
            {Object.keys(RESEARCH_TREES).map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => {
          const maxLv = item.power.filter(p => p > 0).length;
          const lv = parseInt(levels[item.name]) || 0;
          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, color: '#a89a6a', fontSize: 14 }}>{item.name}</div>
              <div style={{ width: 120 }}>
                <input
                  type="range" min="0" max={maxLv}
                  value={lv}
                  onChange={e => setLevel(item.name, e.target.value)}
                  style={{ width: '100%', accentColor: '#c9a84c' }}
                />
              </div>
              <div style={{ width: 60, textAlign: 'right', fontSize: 13, color: '#c9a84c' }}>
                Lv.{lv}/{maxLv}
              </div>
              <div style={{ width: 90, textAlign: 'right', fontSize: 13, color: '#e8d07a' }}>
                {formatNum(item.power.slice(0, lv).reduce((a,b)=>a+b,0))} ⚡
              </div>
            </div>
          );
        })}
      </div>

      <div className="result-box" style={{ marginTop: 24 }}>
        <h4>Estimated Research Power — {tree} Tree</h4>
        <div className="result-row">
          <span style={{ fontWeight: 700, color: '#f0e6c8' }}>🔬 Total Power Gain</span>
          <span style={{ fontSize: 18 }}>{formatNum(totalPower)}</span>
        </div>
      </div>
      <p className="note">* Approximate values. Actual power depends on your civilization and current game version.</p>
    </div>
  );
}
