import React, { useState } from 'react';
import { TRAINING_COST, formatNum, formatTime } from '../data/rokData';

export default function TroopTraining() {
  const [tier, setTier] = useState('T4');
  const [qty, setQty] = useState(10000);

  const cost = TRAINING_COST[tier];
  const q = Math.max(0, parseInt(qty) || 0);

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Calculate the total resources and time needed to train troops.
      </p>
      <div className="form-grid">
        <div className="form-group">
          <label>Tier</label>
          <select value={tier} onChange={e => setTier(e.target.value)}>
            {['T1','T2','T3','T4','T5'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 10000" />
        </div>
      </div>

      {q > 0 && (
        <div className="result-box">
          <h4>Training Results for {formatNum(q)} × {tier}</h4>
          <div className="result-row"><span>🌾 Food</span><span>{formatNum(cost.food * q)}</span></div>
          <div className="result-row"><span>🪵 Wood</span><span>{formatNum(cost.wood * q)}</span></div>
          <div className="result-row"><span>🪨 Stone</span><span>{formatNum(cost.stone * q)}</span></div>
          {cost.gold > 0 && <div className="result-row"><span>💰 Gold</span><span>{formatNum(cost.gold * q)}</span></div>}
          <div className="result-row"><span>⏱ Training Time</span><span>{formatTime(cost.timeSec * q)}</span></div>
        </div>
      )}
      <p className="note">* Values are approximate. Actual costs vary by civilization and research.</p>
    </div>
  );
}
