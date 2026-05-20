import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';
import TroopTraining from './calculators/TroopTraining';
import MigrationCost from './calculators/MigrationCost';
import KillPoints from './calculators/KillPoints';
import ResearchPower from './calculators/ResearchPower';
import T5Requirements from './calculators/T5Requirements';
import BattlePower from './calculators/BattlePower';
import BuildingCost from './calculators/BuildingCost';
import PowerTracker from './calculators/PowerTracker';

const CALCULATORS = [
  { id: 'troop',    icon: '⚔️', label: 'Troop Training',    component: TroopTraining },
  { id: 'migration',icon: '✈️', label: 'Migration Cost',    component: MigrationCost },
  { id: 'kill',     icon: '💀', label: 'Kill Points',       component: KillPoints },
  { id: 'research', icon: '🔬', label: 'Research Power',    component: ResearchPower },
  { id: 't5',       icon: '🏹', label: 'T5 Requirements',   component: T5Requirements },
  { id: 'battle',   icon: '⚡', label: 'Battle Power',      component: BattlePower },
  { id: 'building', icon: '🏰', label: 'Building Cost',     component: BuildingCost },
  { id: 'power',    icon: '📊', label: 'Power Tracker',     component: PowerTracker },
];

export default function App() {
  const [activeCalc, setActiveCalc] = useState('troop');
  const ActiveComponent = CALCULATORS.find(c => c.id === activeCalc)?.component;

  return (
    <>
      <Navbar />
      <Hero />
      <Features />

      {/* CALCULATORS SECTION */}
      <section id="calculators" style={{ padding: '100px 40px', background: '#0c0a06' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 className="section-title">⚔️ ROK Calculators</h2>
          <p className="section-sub">8 tools to help you plan, optimize, and dominate</p>

          {/* Tab bar */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            marginBottom: 32, justifyContent: 'center',
          }}>
            {CALCULATORS.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveCalc(id)}
                style={{
                  background: activeCalc === id
                    ? 'linear-gradient(135deg, #c9a84c, #8a6a1e)'
                    : '#1c1710',
                  color: activeCalc === id ? '#0c0a06' : '#a89a6a',
                  border: `1px solid ${activeCalc === id ? '#c9a84c' : '#3a2e0e'}`,
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => {
                  if (activeCalc !== id) {
                    e.currentTarget.style.borderColor = '#c9a84c';
                    e.currentTarget.style.color = '#c9a84c';
                  }
                }}
                onMouseLeave={e => {
                  if (activeCalc !== id) {
                    e.currentTarget.style.borderColor = '#3a2e0e';
                    e.currentTarget.style.color = '#a89a6a';
                  }
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Active calculator panel */}
          <div style={{
            background: '#1c1710',
            border: '1px solid #3a2e0e',
            borderRadius: 16,
            padding: '36px 40px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Panel header */}
            {(() => {
              const calc = CALCULATORS.find(c => c.id === activeCalc);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  marginBottom: 28, paddingBottom: 20,
                  borderBottom: '1px solid #3a2e0e',
                }}>
                  <span style={{ fontSize: 32 }}>{calc.icon}</span>
                  <h3 style={{
                    fontFamily: "'Cinzel', serif",
                    color: '#c9a84c', fontSize: '1.3rem',
                  }}>
                    {calc.label}
                  </h3>
                </div>
              );
            })()}

            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </section>

      {/* COMMANDS SECTION */}
      <section style={{ padding: '80px 40px', background: '#0f0c07' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 className="section-title">Bot Commands</h2>
          <p className="section-sub">All available slash commands</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['/kingdom-ping',        'Admin only — set a custom message to fire when a specific Kingdom opens',         'Any server'],
              ['/project-registration','Register a new project (you become the owner automatically)',                     'Main server'],
              ['/project-list',        'Browse all registered projects, 5 per page',                                      'Main server'],
              ['/project-edit',        'Edit your own project (ownership enforced)',                                       'Main server'],
              ['/project-search',      'Search projects by name or kingdom number',                                        'Main server'],
              ['/delete-project',      'Admin only — permanently delete any project',                                      'Main server'],
            ].map(([cmd, desc, scope]) => (
              <div key={cmd} style={{
                display: 'flex', alignItems: 'center', gap: 20,
                background: '#1c1710', border: '1px solid #3a2e0e',
                borderRadius: 10, padding: '16px 24px',
                flexWrap: 'wrap',
              }}>
                <code style={{
                  fontFamily: 'monospace', background: '#111009',
                  color: '#c9a84c', padding: '4px 10px', borderRadius: 6,
                  fontSize: 14, whiteSpace: 'nowrap', minWidth: 220,
                }}>
                  {cmd}
                </code>
                <span style={{ flex: 1, color: '#a89a6a', fontSize: 14 }}>{desc}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99,
                  background: scope === 'Any server' ? '#0d2e1a' : '#1a1507',
                  color: scope === 'Any server' ? '#2ecc71' : '#c9a84c',
                  border: `1px solid ${scope === 'Any server' ? '#1a7a3c' : '#8a6a1e'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {scope}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
