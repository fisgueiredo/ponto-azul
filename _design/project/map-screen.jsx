// Map screen — full bleed map, search bar, FABs, collapsed bottom sheet, pulsing pins.

function Pin({ x, y, active, available, onClick, dark }) {
  const main = available ? '#2774AE' : '#6B7785';
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${x * 100}%`, top: `${y * 100}%`,
        transform: 'translate(-50%, -100%)',
        background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer', zIndex: active ? 6 : 5,
      }}
    >
      <div style={{ position: 'relative', width: 32, height: 40, animation: active ? 'float 2s ease-in-out infinite' : 'none' }}>
        {/* pulse ring */}
        {available && (
          <span style={{
            position: 'absolute', left: 4, top: 4, width: 24, height: 24, borderRadius: '50%',
            background: main, opacity: 0.35,
            animation: 'pingPulse 1.8s ease-out infinite',
          }} />
        )}
        {/* drop shadow */}
        <div style={{
          position: 'absolute', left: '50%', bottom: -1, width: 14, height: 4, transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.18)', borderRadius: '50%', filter: 'blur(2px)',
        }} />
        {/* pin shape */}
        <svg width="32" height="40" viewBox="0 0 32 40" style={{ position: 'absolute', inset: 0, filter: active ? 'drop-shadow(0 4px 8px rgba(39,116,174,0.4))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))' }}>
          <path
            d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z"
            fill={main}
            stroke={dark ? '#0F1218' : '#fff'} strokeWidth="2"
          />
          {/* accessibility glyph (simplified person) */}
          <circle cx="16" cy="11" r="2.2" fill="#fff" />
          <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff" />
        </svg>
      </div>
    </button>
  );
}

function MapScreen({ dark, onPin, onAdd, onSearch, onSheetTap, onSettings, places, sheetVisible = true }) {
  const surface = dark ? '#1B1F26' : '#FBF8EF';
  const txt = dark ? '#F2EEE2' : '#1A2230';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6B7785';
  const cardBg = dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.92)';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ position: 'absolute', inset: 0, background: surface, overflow: 'hidden' }}>
      {/* The map itself, slightly larger than viewport, panned a bit */}
      <div style={{ position: 'absolute', inset: 0, transform: 'translateY(-60px)' }}>
        <MapSVG dark={dark} />
      </div>

      {/* Pins overlay (positioned within the map's translated frame) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, transform: 'translateY(-60px)', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
            {places.map(p => (
              <Pin key={p.id} x={p.x} y={p.y} available={p.available}
                   active={false} dark={dark}
                   onClick={() => onPin(p)} />
            ))}
          </div>
        </div>
      </div>

      {/* TOP: status bar safe area */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54,
        background: dark
          ? 'linear-gradient(to bottom, rgba(27,31,38,0.85), rgba(27,31,38,0))'
          : 'linear-gradient(to bottom, rgba(251,248,239,0.7), rgba(251,248,239,0))',
        zIndex: 10, pointerEvents: 'none',
      }} />

      {/* Search bar */}
      <div style={{
        position: 'absolute', top: 64, left: 16, right: 16, zIndex: 12,
        animation: 'fadeUp 0.5s ease-out',
      }}>
        <button
          onClick={onSearch}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 18px', borderRadius: 18,
            background: cardBg,
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            border: `0.5px solid ${border}`,
            boxShadow: dark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(20,30,50,0.08)',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <ISearch size={20} color={muted} />
          <span style={{ flex: 1, color: muted, fontSize: 16, letterSpacing: -0.1 }}>
            Pesquisar lugar marcado…
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); onSettings && onSettings(); }}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#2774AE', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ISettings size={16} color="#fff" strokeWidth={2} />
          </span>
        </button>

        {/* Stat chip below search */}
        <div style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 8px', borderRadius: 999,
          background: cardBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `0.5px solid ${border}`,
          fontSize: 12, color: txt, fontWeight: 500,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: '#2774AE',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IMapPin size={11} color="#fff" strokeWidth="2.2" />
          </span>
          <span>{places.length} lugares em Aveiro</span>
        </div>
      </div>

      {/* RIGHT: Floating buttons */}
      <div style={{
        position: 'absolute', right: 16, bottom: 260, zIndex: 12,
        display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
      }}>
        {/* Locate me */}
        <button
          aria-label="Localização"
          style={{
            width: 48, height: 48, borderRadius: 16,
            background: cardBg,
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            border: `0.5px solid ${border}`,
            boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(20,30,50,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ILocate size={22} color={txt} />
        </button>

        {/* Add place — primary FAB */}
        <button
          onClick={onAdd}
          aria-label="Adicionar lugar"
          style={{
            width: 60, height: 60, borderRadius: 20,
            background: '#2774AE', border: 'none',
            boxShadow: '0 10px 24px rgba(39,116,174,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IPlus size={28} color="#fff" strokeWidth="2.2" />
        </button>
      </div>

      {/* BOTTOM SHEET (collapsed) */}
      {sheetVisible && (
      <div
        onClick={onSheetTap}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '10px 16px 30px',
          background: cardBg,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: `0.5px solid ${border}`,
          boxShadow: dark ? '0 -8px 28px rgba(0,0,0,0.4)' : '0 -8px 28px rgba(20,30,50,0.08)',
          zIndex: 14, cursor: 'pointer',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 12px' }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: txt, letterSpacing: -0.3 }}>Lugares perto</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 2, fontFamily: 'Geist Mono, monospace', letterSpacing: -0.1 }}>
            {places.length} lugares · ordenado por distância
          </div>
        </div>

        {/* peek list — first 2 places */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {places.slice(0, 2).map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 4px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: p.available ? 'rgba(39,116,174,0.12)' : 'rgba(107,119,133,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IMapPin size={18} color={p.available ? '#2774AE' : muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: txt, letterSpacing: -0.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: muted, fontFamily: 'Geist Mono, monospace', marginTop: 2 }}>
                  {p.distance} · {p.address}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

window.MapScreen = MapScreen;
window.Pin = Pin;
