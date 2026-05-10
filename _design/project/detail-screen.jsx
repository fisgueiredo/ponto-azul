// Place detail — full screen with mini map, info, actions.

function DetailScreen({ dark, place, onBack, onAdd }) {
  if (!place) return null;
  const surface = dark ? '#1B1F26' : '#FBF8EF';
  const cardBg = dark ? '#222730' : '#fff';
  const txt = dark ? '#F2EEE2' : '#1A2230';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6B7785';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,40,0.07)';
  const pillBg = dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)';

  return (
    <div style={{ position: 'absolute', inset: 0, background: surface, overflow: 'hidden' }}>
      {/* mini-map hero */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, overflow: 'hidden' }}>
        <div style={{ transform: `translate(${-place.x * 800 + 200}px, ${-place.y * 1100 + 130}px) scale(1.2)`, transformOrigin: '0 0' }}>
          <div style={{ width: 800, height: 1100 }}>
            <MapSVG dark={dark} />
          </div>
        </div>
        {/* centered pin */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -100%)',
        }}>
          <div style={{ position: 'relative', width: 40, height: 50 }}>
            <span style={{
              position: 'absolute', left: 5, top: 5, width: 30, height: 30, borderRadius: '50%',
              background: '#2774AE', opacity: 0.3,
              animation: 'pingPulse 1.8s ease-out infinite',
            }} />
            <svg width="40" height="50" viewBox="0 0 32 40" style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 6px 12px rgba(39,116,174,0.5))' }}>
              <path d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z"
                fill="#2774AE" stroke="#fff" strokeWidth="2.2" />
              <circle cx="16" cy="11" r="2.4" fill="#fff" />
              <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff" />
            </svg>
          </div>
        </div>
        {/* fade to surface */}
        <div style={{ position: 'absolute', inset: 0,
          background: dark
            ? 'linear-gradient(to bottom, rgba(27,31,38,0.0) 50%, rgba(27,31,38,1) 100%)'
            : 'linear-gradient(to bottom, rgba(251,248,239,0.0) 50%, rgba(251,248,239,1) 100%)',
        }}/>
      </div>

      {/* back button */}
      <button onClick={onBack} aria-label="Voltar" style={{
        position: 'absolute', top: 64, left: 16, zIndex: 20,
        width: 40, height: 40, borderRadius: 20,
        background: pillBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: `0.5px solid ${border}`,
        boxShadow: '0 4px 12px rgba(20,30,50,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <IChevLeft size={22} color={txt} />
      </button>

      {/* share button (top right) */}
      <button aria-label="Partilhar" style={{
        position: 'absolute', top: 64, right: 16, zIndex: 20,
        width: 40, height: 40, borderRadius: 20,
        background: pillBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: `0.5px solid ${border}`,
        boxShadow: '0 4px 12px rgba(20,30,50,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <IShare size={18} color={txt} />
      </button>

      {/* content card */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 240, bottom: 0,
        background: surface,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '20px 20px 100px',
        overflowY: 'auto',
        animation: 'fadeUp 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }} className="no-scrollbar">
        {/* distance pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999,
            background: dark ? 'rgba(39,116,174,0.18)' : 'rgba(39,116,174,0.10)',
            color: '#2774AE',
            fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
            <IMapPin size={12} color="#2774AE" strokeWidth={2.2} />
            {place.distance} de si
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted, fontWeight: 500 }}>
            <IAccessible size={14} color={muted} />
            Acesso verificado
          </span>
        </div>

        {/* title */}
        <h1 style={{
          margin: 0, fontSize: 30, fontWeight: 600, color: txt,
          letterSpacing: -0.7, lineHeight: 1.1,
        }}>{place.name}</h1>
        <div style={{ fontSize: 15, color: muted, marginTop: 6, letterSpacing: -0.1 }}>
          {place.address}
        </div>

        {/* description */}
        <p style={{
          margin: '20px 0 0', fontSize: 15, lineHeight: 1.55, color: txt,
          letterSpacing: -0.1, textWrap: 'pretty',
        }}>{place.desc}</p>

      </div>

      {/* primary actions — directions in Maps + Waze, fixed bottom */}
      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 22,
        display: 'flex', gap: 10,
      }}>
        <button style={{
          flex: 1, padding: '16px 12px', borderRadius: 18,
          background: '#2774AE', border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
        }}>
          <INavigate size={18} color="#fff" strokeWidth={2} />
          Maps
        </button>
        <button style={{
          flex: 1, padding: '16px 12px', borderRadius: 18,
          background: '#33CCFF', border: 'none',
          color: '#0B2940', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
        }}>
          <INavigate size={18} color="#0B2940" strokeWidth={2} />
          Waze
        </button>
      </div>
    </div>
  );
}

window.DetailScreen = DetailScreen;
