import React, { useState, useEffect } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: scrolled ? 'rgba(12,10,6,0.97)' : 'transparent',
    borderBottom: scrolled ? '1px solid #3a2e0e' : '1px solid transparent',
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    transition: 'all 0.3s ease',
    padding: '0 40px',
  };

  const inner = {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 64,
  };

  const logo = {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.3rem', fontWeight: 700,
    color: '#c9a84c',
    letterSpacing: '0.05em',
    display: 'flex', alignItems: 'center', gap: 10,
  };

  const links = {
    display: 'flex', gap: 32, listStyle: 'none',
  };

  const link = {
    color: '#a89a6a', fontSize: 14, fontWeight: 500,
    textDecoration: 'none', letterSpacing: '0.03em',
    textTransform: 'uppercase', transition: 'color 0.2s',
  };

  return (
    <nav style={nav}>
      <div style={inner}>
        <div style={logo}>⚔️ Kingdom Bot</div>
        <ul style={links}>
          {[['Home','#hero'],['Features','#features'],['Calculators','#calculators']].map(([label, href]) => (
            <li key={label}>
              <a href={href} style={link}
                onMouseEnter={e => e.target.style.color = '#c9a84c'}
                onMouseLeave={e => e.target.style.color = '#a89a6a'}>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href="https://discord.com" target="_blank" rel="noreferrer"
              style={{ ...link, color: '#c9a84c', border: '1px solid #c9a84c', padding: '6px 18px', borderRadius: 6 }}
              onMouseEnter={e => { e.target.style.background = '#c9a84c'; e.target.style.color = '#0c0a06'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#c9a84c'; }}>
              Invite Bot
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
