import React, { useState } from 'react';
import { TROOP_POWER, formatNum } from '../data/rokData';

const TIERS = ['T1','T2','T3','T4','T5'];
const TYPES = ['Infantry','Cavalry','Archers','Siege'];

export default function BattlePower() {
  const [troops, setTroops] = useState({});

  const setVal = (type, tier, val) => {
    setTroops(prev => ({ ...prev, [`${type}-${tier}`]: val }));
  };

  const getVal = (type, tier) => troops[`${type}-${tier}`] || '';

  const totalPower = Object.entries(troops).reduce((sum, [key, val]) => {
    const tier = key.split('-')[1];
    return sum + (parseInt(val) || 0) * TROOP_POWER[tier];
  }, 0);

  const perType = TYPES.map(type => ({
    type,
    power: TIERS.reduce((sum, tier) => sum + (parseInt(troops[`${type}-${tier}`]) || 0) * TROOP_POWER[tier], 0),
  }));

  return (
    <div>
      <p style={{ color: '#a89a6a', fontSize: 14, marginBottom: 20 }}>
        Enter your troop counts per type and tier to estimate total battle power.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={thStyle}>Type \ Tier</th>
              {TIERS.map(t => <th key={t} style={{ ...thStyle, color: '#c9a84c' }}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {TYPES.map(type => (
              <tr key={type}>
                <td style={{ ...tdStyle, color: '#a89a6a', fontWeight: 600 }}>{type}</td>
                {TIERS.map(tier => (
                  <td key={tier} style={tdStyle}>
                    <input
                      type="number" min="0"
                      value={getVal(type, tier)}
                      onChange={e => setVal(type, tier, e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', padding: '6px 8px', fontSize: 13 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="result-box">
        <h4>Battle Power Breakdown</h4>
        {perType.map(({ type, power }) => power > 0 && (
          <div className="result-row" key={type}>
            <span>{type}</span><span>{formatNum(power)}</span>
          </div>
        ))}
        <div className="result-row" style={{ borderTop: '1px solid #c9a84c', paddingTop: 8, marginTop: 8 }}>
          <span style={{ fontWeight: 700, color: '#f0e6c8' }}>⚔️ Total Power (Troops)</span>
          <span style={{ fontSize: 18 }}>{formatNum(totalPower)}</span>
        </div>
      </div>
      <p className="note">* Power per unit: T1=80, T2=210, T3=540, T4=1,420, T5=3,680. Does not include equipment, commander, research, or building power.</p>
    </div>
  );
}

const thStyle = { padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #3a2e0e', color: '#6b5e3a', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 };
const tdStyle = { padding: '6px 4px', borderBottom: '1px solid #1e1a0e' };
