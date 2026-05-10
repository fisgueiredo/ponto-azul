// Bottom sheet expanded — list of places with filters and sort.

function ListScreen({ dark, places, onClose, onPlace }) {
  const [sort, setSort] = React.useState('distance');
  const [sortOpen, setSortOpen] = React.useState(false);

  const surface = dark ? '#1B1F26' : '#FBF8EF';
  const sheetBg = dark ? '#222730' : '#FBF8EF';
  const txt = dark ? '#F2EEE2' : '#1A2230';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6B7785';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,40,0.08)';

  // Apply sort
  let list = [...places];
  if (sort === 'name') list = list.slice().sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div style={{
      position: 'absolute', inset: 0, background: surface, overflow: 'hidden',
    }}>
      {/* Faded map peek at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 130, overflow: 'hidden',
      }}>
        <div style={{ transform: 'translateY(-40px) scale(1.1)', opacity: dark ? 0.4 : 0.55 }}>
          <MapSVG dark={dark} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: dark
            ? 'linear-gradient(to bottom, rgba(27,31,38,0) 0%, rgba(27,31,38,1) 100%)'
            : 'linear-gradient(to bottom, rgba(251,248,239,0) 0%, rgba(251,248,239,1) 100%)',
        }} />
      </div>

      {/* Sheet body */}
      <div style={{
        position: 'absolute', top: 100, left: 0, right: 0, bottom: 0,
        background: sheetBg,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        boxShadow: dark ? '0 -8px 24px rgba(0,0,0,0.4)' : '0 -8px 24px rgba(20,30,50,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* handle */}
        <button
          onClick={onClose}
          aria-label="Recolher"
          style={{
            display: 'flex', justifyContent: 'center', padding: '8px 0 4px',
            background: 'transparent', border: 'none', width: '100%', cursor: 'pointer',
          }}
        >
          <div style={{ width: 40, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }} />
        </button>

        {/* header */}
        <div style={{ padding: '12px 20px 4px' }}>
          <div style={{
            fontSize: 28, fontWeight: 600, color: txt,
            letterSpacing: -0.6, lineHeight: 1.1,
          }}>Lugares marcados</div>
          <div style={{
            fontSize: 13, color: muted, marginTop: 4,
            fontFamily: 'Geist Mono, monospace', letterSpacing: -0.1,
          }}>
            {list.length} resultados · Aveiro centro
          </div>
        </div>

        {/* sort row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 20px 8px',
          borderBottom: `0.5px solid ${border}`,
        }}>
          <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>
            Resultados
          </div>
          <button
            onClick={() => setSortOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: txt, fontFamily: 'inherit', fontWeight: 500,
              padding: 4,
            }}
          >
            <ISort size={14} color={txt} />
            <span>{sort === 'distance' ? 'Distância' : 'Nome'}</span>
            <IChevDown size={14} color={muted} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* sort dropdown */}
        {sortOpen && (
          <div style={{
            position: 'absolute', top: 240, right: 18, zIndex: 30,
            background: dark ? '#2A3038' : '#fff', borderRadius: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            border: `0.5px solid ${border}`, overflow: 'hidden', minWidth: 180,
          }}>
            {[
              { id: 'distance', label: 'Distância' },
              { id: 'name', label: 'Nome (A-Z)' },
            ].map((s, i, arr) => (
              <button
                key={s.id}
                onClick={() => { setSort(s.id); setSortOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '12px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: i < arr.length - 1 ? `0.5px solid ${border}` : 'none',
                  fontFamily: 'inherit', fontSize: 14, color: txt, textAlign: 'left',
                }}
              >
                <span>{s.label}</span>
                {sort === s.id && <ICheck size={16} color="#2774AE" />}
              </button>
            ))}
          </div>
        )}

        {/* list */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 40px' }}>
          {list.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onPlace(p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 12px', background: 'transparent', border: 'none',
                borderBottom: i < list.length - 1 ? `0.5px solid ${border}` : 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: p.available ? '#2774AE' : (dark ? 'rgba(107,119,133,0.18)' : '#E2DBC8'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <IMapPin size={22} color={p.available ? '#fff' : muted} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: txt, letterSpacing: -0.2 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 12, color: muted, fontFamily: 'Geist Mono, monospace' }}>{p.distance}</span>
                  <span style={{ fontSize: 11, color: muted }}>·</span>
                  <span style={{ fontSize: 12, color: muted, letterSpacing: -0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.address}
                  </span>
                </div>
              </div>
              <IChevRight size={18} color={muted} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.ListScreen = ListScreen;
