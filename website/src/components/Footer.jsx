import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#080602', borderTop: '1px solid #3a2e0e',
      padding: '40px', textAlign: 'center',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: '1.2rem',
          color: '#c9a84c', marginBottom: 16,
        }}>
          ⚔️ Kingdom Bot
        </div>
        <p style={{ color: '#6b5e3a', fontSize: 13, marginBottom: 20 }}>
          Rise of Kingdoms companion bot — not affiliated with LilithGames
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            ['Discord', 'https://discord.com'],
            ['GitHub', 'https://github.com/FennOfficial/Community-Bot-v1'],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer"
              style={{ color: '#a89a6a', fontSize: 14, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#c9a84c'}
              onMouseLeave={e => e.target.style.color = '#a89a6a'}>
              {label}
            </a>
          ))}
        </div>
        <p style={{ color: '#3a2e0e', fontSize: 12, marginTop: 24 }}>
          © {new Date().getFullYear()} Kingdom Bot. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
