import React, { useState } from 'react';
import { CASTLE_COST, formatNum } from '../data/rokData';

export default function BuildingCost() {
  const [fromLv, setFromLv] = useState(1);
  const [toLv, setToLv] = useState(25);

  const from = Math.min(Math.max(parseInt(fromLv) || 1, 1), 24);
  const to   = Math.min(Math.max(parseInt(toLv)   || 25, from + 1), 25);

  const totals = { food: 0, wood: 0, stone: 0, gold: 0 };
  for (let lv = from + 1; lv <= to; lv++) {
    const c = CASTLE_COST[lv];
    if (c) {
      totals.food  += c.food;
      totals.wood  += c.wood;
      totals.stone += c.stone;
      totals.gold  += c.gold;
    }
  }

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Calculate the total resources needed to upgrade your Castle from one level to another.
      </p>
      <div className="form-grid" style={{ maxWidth: 360 }}>
        <div className="form-group">
          <label>Current Level</label>
          <input type="number" min="1" max="24" value={fromLv} onChange={e => setFromLv(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Target Level</label>
          <input type="number" min="2" max="25" value={toLv} onChange={e => setToLv(e.target.value)} />
        </div>
      </div>

      <div className="result-box">
        <h4>Castle Lv.{from} → Lv.{to} Cost</h4>
        <div className="result-row"><span>🌾 Food</span><span>{formatNum(totals.food)}</span></div>
        <div className="result-row"><span>🪵 Wood</span><span>{formatNum(totals.wood)}</span></div>
        <div className="result-row"><span>🪨 Stone</span><span>{formatNum(totals.stone)}</span></div>
        {totals.gold > 0 && <div className="result-row"><span>💰 Gold</span><span>{formatNum(totals.gold)}</span></div>}
        <div className="result-row" style={{ borderTop: '1px solid #c9a84c', paddingTop: 8, marginTop: 4 }}>
          <span style={{ fontWeight: 700, color: '#f0e6c8' }}>🏰 Levels Upgraded</span>
          <span>{to - from}</span>
        </div>
      </div>
      <p className="note">* Castle upgrade costs shown. Other buildings (Barracks, Stable, etc.) have different costs. Speedups not included.</p>
    </div>
  );
}
