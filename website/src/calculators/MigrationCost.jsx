import React, { useState } from 'react';

export default function MigrationCost() {
  const [kdAge, setKdAge] = useState('');
  const [migType, setMigType] = useState('random');

  const days = parseInt(kdAge) || 0;

  let cost = null;
  if (days > 0) {
    if (migType === 'alliance') {
      cost = { gems: 0, items: 'None', note: 'Alliance migration is free if within the same alliance territory.' };
    } else if (days < 120) {
      cost = { gems: 0, items: 'None', note: 'Destination kingdom is young — migration is free!' };
    } else if (days < 365) {
      cost = { gems: 10000, items: 'KD Transfer Item × 1', note: 'Kingdom is between 120–365 days old.' };
    } else {
      cost = { gems: 10000, items: 'KD Transfer Item × 1 + Meeting Hall requirements', note: 'Kingdom is over 1 year old. Meet all power and kill requirements.' };
    }
  }

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Calculate the cost to migrate to a target kingdom based on its age.
      </p>
      <div className="form-grid">
        <div className="form-group">
          <label>Destination KD Age (days)</label>
          <input type="number" min="0" value={kdAge} onChange={e => setKdAge(e.target.value)} placeholder="e.g. 200" />
        </div>
        <div className="form-group">
          <label>Migration Type</label>
          <select value={migType} onChange={e => setMigType(e.target.value)}>
            <option value="random">Random (Passport)</option>
            <option value="alliance">Alliance Migration</option>
          </select>
        </div>
      </div>

      {cost && (
        <div className="result-box">
          <h4>Migration Cost to KD ({days} days old)</h4>
          <div className="result-row"><span>💎 Gems Required</span><span>{cost.gems.toLocaleString()}</span></div>
          <div className="result-row"><span>🎟 Items Required</span><span>{cost.items}</span></div>
          <div style={{ marginTop: 12, padding: '10px 0', color: '#a89a6a', fontSize: 13, borderTop: '1px solid #3a2e0e' }}>
            ℹ️ {cost.note}
          </div>
        </div>
      )}
      <p className="note">* Requirements subject to change with game updates. Check in-game Meeting Hall for exact requirements.</p>
    </div>
  );
}
