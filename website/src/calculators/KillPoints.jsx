import React, { useState } from 'react';
import { KILL_POINTS, formatNum } from '../data/rokData';

const TIERS = ['T1','T2','T3','T4','T5'];

export default function KillPoints() {
  const [kills, setKills] = useState({ T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 });

  const total = TIERS.reduce((sum, t) => sum + (parseInt(kills[t]) || 0) * KILL_POINTS[t], 0);

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Enter the number of enemy troops killed per tier to calculate total kill points.
      </p>
      <div className="form-grid">
        {TIERS.map(t => (
          <div className="form-group" key={t}>
            <label>{t} Kills ({KILL_POINTS[t]} KP each)</label>
            <input
              type="number" min="0"
              value={kills[t] || ''}
              onChange={e => setKills(prev => ({ ...prev, [t]: e.target.value }))}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="result-box">
        <h4>Kill Points Breakdown</h4>
        {TIERS.map(t => {
          const n = parseInt(kills[t]) || 0;
          return n > 0 ? (
            <div className="result-row" key={t}>
              <span>{t} × {formatNum(n)}</span>
              <span>{formatNum(n * KILL_POINTS[t])} KP</span>
            </div>
          ) : null;
        })}
        <div className="result-row" style={{ marginTop: 8, borderTop: '1px solid #c9a84c', paddingTop: 8 }}>
          <span style={{ fontWeight: 700, color: '#f0e6c8' }}>💀 Total Kill Points</span>
          <span style={{ fontSize: 18 }}>{formatNum(total)}</span>
        </div>
      </div>
      <p className="note">* KP values: T1=2, T2=10, T3=42, T4=168, T5=680. Values may vary slightly by commander skills.</p>
    </div>
  );
}
