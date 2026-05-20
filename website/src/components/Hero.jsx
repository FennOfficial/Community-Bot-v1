import React from 'react';

export default function Hero() {
  const section = {
    id: 'hero',
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '120px 40px 80px',
    background: 'radial-gradient(ellipse at 50% 40%, #2a1e08 0%, #0c0a06 70%)',
    position: 'relative', overflow: 'hidden',
  };

  const glow = {
    position: 'absolute', width: 600, height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -60%)',
    pointerEvents: 'none',
  };

  return (
    <section style={section} id="hero">
      <div style={glow} />

      <div style={{ fontSize: 64, marginBottom: 24 }}>⚔️</div>

      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        color: '#c9a84c',
        textShadow: '0 0 60px rgba(201,168,76,0.4)',
        maxWidth: 800, lineHeight: 1.2, marginBottom: 20,
      }}>
        Kingdom Bot
      </h1>

      <p style={{
        fontSize: 'clamp(1rem, 2vw, 1.3rem)',
        color: '#a89a6a', maxWidth: 600,
        lineHeight: 1.7, marginBottom: 16,
      }}>
        Your Rise of Kingdoms companion — auto-announcements, kingdom pings,
        project tracking, and 8 powerful calculators.
      </p>

      <p style={{ color: '#6b5e3a', fontSize: 14, marginBottom: 48 }}>
        Used across 9+ servers and growing
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://discord.com" target="_blank" rel="noreferrer"
          className="btn-gold"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #c9a84c, #8a6a1e)',
            color: '#0c0a06', padding: '14px 36px',
            borderRadius: 8, fontWeight: 700, fontSize: 16,
            letterSpacing: '0.03em', textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(201,168,76,0.35)'; }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}>
          ➕ Add to Discord
        </a>
        <a href="#calculators"
          style={{
            display: 'inline-block',
            border: '1px solid #3a2e0e', color: '#a89a6a',
            padding: '14px 36px', borderRadius: 8,
            fontWeight: 600, fontSize: 16, textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#c9a84c'; e.target.style.color = '#c9a84c'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#3a2e0e'; e.target.style.color = '#a89a6a'; }}>
          🧮 Try Calculators
        </a>
      </div>

      <div style={{
        marginTop: 80, display: 'flex', gap: 48,
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[['9+','Servers'],['8','Calculators'],['5','Bot Commands']].map(([n, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>{n}</div>
            <div style={{ color: '#6b5e3a', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
