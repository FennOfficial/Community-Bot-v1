import React from 'react';

const FEATURES = [
  { icon: '🚨', title: 'Auto Kingdom Announce', desc: 'Monitors hs bot announcements and instantly re-announces every Kingdom opening in your configured channel. Zero manual effort.' },
  { icon: '🔔', title: 'Kingdom Ping', desc: 'Admins set a custom message tied to a Kingdom number. The bot fires it the moment that exact Kingdom is announced — works across all servers.' },
  { icon: '📋', title: 'Project Registry', desc: 'Register, list, search, and manage alliance projects. Full ownership system — only owners can edit, admins can delete.' },
  { icon: '🧮', title: 'ROK Calculators', desc: '8 built-in calculators for troop training, migration, kill points, research power, T5 requirements, battle power, building costs, and power tracking.' },
  { icon: '🔍', title: 'Project Search', desc: 'Search projects by name or kingdom number. Paginated results with Prev/Next navigation.' },
  { icon: '🌐', title: 'Multi-Server', desc: 'Kingdom Ping and search commands work in any server. Project commands are locked to the main server for security.' },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '100px 40px', background: '#0f0c07' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 className="section-title">Features</h2>
        <p className="section-sub">Everything your Rise of Kingdoms alliance needs</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: '#1c1710',
              border: '1px solid #3a2e0e',
              borderRadius: 12, padding: '28px 24px',
              transition: 'all 0.25s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#c9a84c';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#3a2e0e';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color: '#c9a84c', marginBottom: 10 }}>{title}</h3>
              <p style={{ color: '#a89a6a', fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
