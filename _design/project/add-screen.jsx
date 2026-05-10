// Add place flow — center pin user can drag, form below.

function AddScreen({ dark, onCancel, onConfirm }) {
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [pos, setPos] = React.useState({ x: 0.5, y: 0.42 });
  const [dragging, setDragging] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const mapRef = React.useRef(null);

  const surface = dark ? '#1B1F26' : '#FBF8EF';
  const cardBg = dark ? '#222730' : '#fff';
  const txt = dark ? '#F2EEE2' : '#1A2230';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6B7785';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,40,0.08)';
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,30,40,0.04)';

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDrag = (e) => {
    if (!dragging || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const x = (t.clientX - rect.left) / rect.width;
    const y = (t.clientY - rect.top) / rect.height;
    setPos({
      x: Math.max(0.05, Math.min(0.95, x)),
      y: Math.max(0.05, Math.min(0.85, y)),
    });
  };
  const endDrag = () => setDragging(false);

  React.useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', endDrag);
    };
  }, [dragging]);

  const valid = title.trim().length > 0;

  const handleConfirm = () => {
    if (!valid) return;
    setConfirmed(true);
    setTimeout(() => onConfirm({ title, desc, x: pos.x, y: pos.y }), 900);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: surface, overflow: 'hidden' }}>
      {/* MAP area — top half */}
      <div ref={mapRef} style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 460,
        overflow: 'hidden', cursor: dragging ? 'grabbing' : 'default',
        touchAction: 'none',
      }}>
        <MapSVG dark={dark} />

        {/* Crosshair guides while dragging */}
        {dragging && (
          <>
            <div style={{ position: 'absolute', left: `${pos.x * 100}%`, top: 0, bottom: 0, width: 0, borderLeft: '1px dashed rgba(39,116,174,0.5)' }} />
            <div style={{ position: 'absolute', top: `${pos.y * 100}%`, left: 0, right: 0, height: 0, borderTop: '1px dashed rgba(39,116,174,0.5)' }} />
          </>
        )}

        {/* Draggable pin */}
        <div
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{
            position: 'absolute',
            left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
            transform: `translate(-50%, -100%) ${dragging ? 'scale(1.18) translateY(-6px)' : 'scale(1)'}`,
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none',
          }}
        >
          <div style={{ position: 'relative', width: 44, height: 56 }}>
            <span style={{
              position: 'absolute', left: 7, top: 7, width: 30, height: 30, borderRadius: '50%',
              background: '#2774AE', opacity: dragging ? 0 : 0.35,
              animation: dragging ? 'none' : 'pingPulse 1.6s ease-out infinite',
            }} />
            <svg width="44" height="56" viewBox="0 0 32 40" style={{ filter: 'drop-shadow(0 8px 14px rgba(39,116,174,0.5))' }}>
              <path d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z"
                fill="#2774AE" stroke="#fff" strokeWidth="2.2" />
              <circle cx="16" cy="11" r="2.4" fill="#fff" />
              <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* Top bar — cancel + title */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', zIndex: 20,
        }}>
          <button onClick={onCancel} aria-label="Cancelar" style={{
            width: 40, height: 40, borderRadius: 20,
            background: dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: `0.5px solid ${border}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(20,30,50,0.10)',
          }}>
            <IClose size={20} color={txt} />
          </button>
          <div style={{
            padding: '8px 14px', borderRadius: 999,
            background: dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: `0.5px solid ${border}`,
            fontSize: 13, color: txt, fontWeight: 600, letterSpacing: -0.1,
            boxShadow: '0 4px 12px rgba(20,30,50,0.08)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Novo lugar
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* Hint pill at top center under header */}
        <div style={{
          position: 'absolute', top: 116, left: '50%', transform: 'translateX(-50%)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)',
          backdropFilter: 'blur(12px)',
          border: `0.5px solid ${border}`,
          fontSize: 12, color: txt, fontWeight: 500, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(20,30,50,0.08)',
          animation: 'fadeUp 0.5s ease-out',
        }}>
          <IMove size={13} color={muted} />
          {dragging ? 'A ajustar localização…' : 'Arraste o pin para ajustar'}
        </div>

        {/* coordinates display (bottom of map) */}
        <div style={{
          position: 'absolute', left: 16, bottom: 12,
          padding: '5px 10px', borderRadius: 8,
          background: dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)',
          fontFamily: 'Geist Mono, monospace', fontSize: 10,
          color: muted, letterSpacing: -0.1,
          border: `0.5px solid ${border}`,
        }}>
          40.6443°N · 8.6455°W
        </div>
      </div>

      {/* FORM sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 440, bottom: 0,
        background: surface,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        boxShadow: dark ? '0 -8px 24px rgba(0,0,0,0.4)' : '0 -8px 24px rgba(20,30,50,0.08)',
        padding: '12px 20px 100px',
        display: 'flex', flexDirection: 'column', gap: 14,
        overflowY: 'auto',
      }} className="no-scrollbar">
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }} />
        </div>

        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: txt, letterSpacing: -0.5 }}>
            Detalhes do lugar
          </div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4, letterSpacing: -0.1 }}>
            Ajude a comunidade com uma descrição clara.
          </div>
        </div>

        {/* title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
              Título <span style={{ color: '#C2393C' }}>·</span>
            </label>
            <span style={{ fontSize: 11, color: muted, fontFamily: 'Geist Mono, monospace' }}>
              {title.length}/50
            </span>
          </div>
          <input
            type="text"
            placeholder="Ex.: Praça do Município, entrada norte"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 50))}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: inputBg, border: `0.5px solid ${border}`,
              fontSize: 15, color: txt, fontFamily: 'inherit', letterSpacing: -0.1,
              outline: 'none',
            }}
          />
        </div>

        {/* description */}
        <div>
          <label style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Descrição <span style={{ textTransform: 'none', letterSpacing: 0, color: muted }}>(opcional)</span>
          </label>
          <textarea
            placeholder="Detalhes úteis: piso, rebaixe de passeio, horário, sinalização…"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: inputBg, border: `0.5px solid ${border}`,
              fontSize: 14, color: txt, fontFamily: 'inherit', letterSpacing: -0.1,
              outline: 'none', resize: 'none', lineHeight: 1.4,
            }}
          />
        </div>

        {/* compact location summary */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: dark ? 'rgba(39,116,174,0.10)' : 'rgba(39,116,174,0.06)',
          border: `0.5px solid ${dark ? 'rgba(39,116,174,0.25)' : 'rgba(39,116,174,0.18)'}`,
        }}>
          <IMapPin size={16} color="#2774AE" />
          <div style={{ flex: 1, fontSize: 12, color: txt, letterSpacing: -0.1 }}>
            <span style={{ fontWeight: 500 }}>Aveiro centro</span>
            <span style={{ color: muted, marginLeft: 6, fontFamily: 'Geist Mono, monospace' }}>
              ({pos.x.toFixed(2)}, {pos.y.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* CONFIRM — green button, fixed bottom */}
      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 30,
      }}>
        <button
          onClick={handleConfirm}
          disabled={!valid || confirmed}
          style={{
            width: '100%', padding: '16px', borderRadius: 18,
            background: confirmed ? '#0E8E45' : (valid ? '#00AF54' : (dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,30,40,0.10)')),
            border: 'none',
            color: valid ? '#fff' : muted, fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
            letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: valid && !confirmed ? 'pointer' : 'not-allowed',
            boxShadow: valid ? '0 10px 24px rgba(0,175,84,0.35)' : 'none',
            transition: 'all 0.25s ease',
          }}
        >
          {confirmed ? (
            <>
              <ICheck size={20} color="#fff" strokeWidth={2.4} />
              Lugar marcado · obrigado!
            </>
          ) : (
            <>
              <ICheck size={20} color={valid ? '#fff' : muted} strokeWidth={2.4} />
              Confirmar marcação
            </>
          )}
        </button>
      </div>
    </div>
  );
}

window.AddScreen = AddScreen;
