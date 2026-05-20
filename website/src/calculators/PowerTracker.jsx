import React, { useState } from 'react';
import { TROOP_POWER, formatNum } from '../data/rokData';

export default function PowerTracker() {
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');
  const [tier, setTier] = useState('T4');

  const cur = parseFloat(current) || 0;
  const tgt = parseFloat(target) || 0;

  const parseM = (v) => {
    if (!v) return 0;
    const s = v.toString().trim().toUpperCase();
    if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
    if (s.endsWith('K')) return parseFloat(s) * 1_000;
    return parseFloat(s) || 0;
  };

  const curPow  = parseM(current);
  const tgtPow  = parseM(target);
  const needed  = Math.max(0, tgtPow - curPow);
  const troopsNeeded = needed > 0 ? Math.ceil(needed / TROOP_POWER[tier]) : 0;

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Find out how many troops you need to train to reach your power goal. Use M for millions, K for thousands (e.g. 50M, 120K).
      </p>

      <div className="form-grid">
        <div className="form-group">
          <label>Current Power</label>
          <input value={current} onChange={e => setCurrent(e.target.value)} placeholder="e.g. 50M or 50000000" />
        </div>
        <div className="form-group">
          <label>Target Power</label>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 80M" />
        </div>
        <div className="form-group">
          <label>Troop Tier to Train</label>
          <select value={tier} onChange={e => setTier(e.target.value)}>
            {['T1','T2','T3','T4','T5'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {curPow > 0 && tgtPow > 0 && (
        <div className="result-box">
          <h4>Power Gap Analysis</h4>
          <div className="result-row"><span>📊 Current Power</span><span>{formatNum(curPow)}</span></div>
          <div className="result-row"><span>🎯 Target Power</span><span>{formatNum(tgtPow)}</span></div>
          <div className="result-row"><span>📈 Power Needed</span><span style={{ color: needed > 0 ? '#e8d07a' : '#2ecc71' }}>{formatNum(needed)}</span></div>

          {needed > 0 ? (
            <>
              <div className="result-row" style={{ borderTop: '1px solid #c9a84c', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: '#f0e6c8' }}>⚔️ {tier} Troops to Train</span>
                <span style={{ fontSize: 18 }}>{formatNum(troopsNeeded)}</span>
              </div>
              <div style={{ marginTop: 12, padding: '10px', background: '#1a1507', borderRadius: 6, fontSize: 13, color: '#a89a6a' }}>
                💡 Training {formatNum(troopsNeeded)} × {tier} troops gives approx. {formatNum(troopsNeeded * TROOP_POWER[tier])} power — enough to reach your goal.
              </div>
            </>
          ) : (
            <div className="result-row" style={{ borderTop: '1px solid #2ecc71', paddingTop: 8, marginTop: 4 }}>
              <span style={{ color: '#2ecc71', fontWeight: 700 }}>✅ Already at target!</span>
            </div>
          )}
        </div>
      )}
      <p className="note">* Only accounts for troop power. Research, buildings, and commander power also contribute significantly.</p>
    </div>
  );
}
