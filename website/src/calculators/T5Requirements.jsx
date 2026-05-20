import React, { useState } from 'react';
import { T5_REQUIREMENTS } from '../data/rokData';

export default function T5Requirements() {
  const [type, setType] = useState('Infantry');
  const req = T5_REQUIREMENTS[type];

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        View the full requirements to unlock T5 troops for each unit type.
      </p>
      <div className="form-grid" style={{ maxWidth: 320 }}>
        <div className="form-group">
          <label>Troop Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {Object.keys(T5_REQUIREMENTS).map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="result-box">
        <h4>T5 {type} Requirements</h4>
        <div className="result-row">
          <span>🏰 Buildings</span>
          <span style={{ textAlign: 'right', maxWidth: '60%', fontSize: 13 }}>{req.buildings}</span>
        </div>
        <div className="result-row">
          <span>🔬 Research</span>
          <span style={{ textAlign: 'right', maxWidth: '60%', fontSize: 13 }}>{req.research}</span>
        </div>
        <div className="result-row">
          <span>👑 Commander</span>
          <span style={{ textAlign: 'right', maxWidth: '60%', fontSize: 13 }}>{req.commander}</span>
        </div>
        <div className="result-row">
          <span>💎 VIP</span>
          <span>{req.vip}</span>
        </div>
      </div>

      <div style={{ background: '#1a1507', border: '1px solid #8a6a1e', borderRadius: 8, padding: '14px 18px', marginTop: 16 }}>
        <p style={{ color: '#c9a84c', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>⚠️ General Requirements for All T5</p>
        <ul style={{ color: '#a89a6a', fontSize: 13, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Power: typically 40M+ recommended</li>
          <li>Academy Lv.25 required to unlock T5 research</li>
          <li>Must have completed all prerequisite research branches</li>
          <li>Alliance with strong tech bonuses helps significantly</li>
        </ul>
      </div>
      <p className="note">* Requirements may vary across civilizations and game patches.</p>
    </div>
  );
}
