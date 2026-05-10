// Settings screen — title, description, theme selector (light/dark/system).

function SettingsScreen({ dark, themeChoice, onThemeChange, onBack }) {
  const surface = dark ? '#1B1F26' : '#FBF8EF';
  const cardBg = dark ? '#222730' : '#fff';
  const txt = dark ? '#F2EEE2' : '#1A2230';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6B7785';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,40,0.07)';
  const pillBg = dark ? 'rgba(40,44,52,0.92)' : 'rgba(251,248,239,0.95)';

  const options = [
    { id: 'light',  label: 'Claro',     desc: 'Sempre com tema claro',         icon: ISun },
    { id: 'dark',   label: 'Escuro',    desc: 'Sempre com tema escuro',        icon: IMoon },
    { id: 'system', label: 'Sistema',   desc: 'Acompanha as definições do dispositivo', icon: IMonitor },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: surface, overflow: 'hidden' }}>
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

      {/* content */}
      <div className="no-scrollbar" style={{
        position: 'absolute', inset: 0, paddingTop: 116, paddingLeft: 20, paddingRight: 20, paddingBottom: 60,
        overflowY: 'auto',
        animation: 'fadeUp 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }}>
        {/* header */}
        <h1 style={{
          margin: 0, fontSize: 34, fontWeight: 600, color: txt,
          letterSpacing: -0.8, lineHeight: 1.05,
        }}>Definições</h1>
        <p style={{
          margin: '10px 0 0', fontSize: 15, color: muted,
          letterSpacing: -0.1, lineHeight: 1.5, maxWidth: 320, textWrap: 'pretty',
        }}>
          Personalize a aparência do Ponto Azul. As suas preferências são guardadas neste dispositivo.
        </p>

        {/* section: aparência */}
        <div style={{
          marginTop: 28,
          fontSize: 11, color: muted, textTransform: 'uppercase',
          letterSpacing: 1.2, fontWeight: 600,
          paddingLeft: 4, marginBottom: 10,
        }}>Aparência</div>

        <div style={{
          background: cardBg, borderRadius: 20,
          border: `0.5px solid ${border}`, overflow: 'hidden',
        }}>
          {options.map((opt, i) => {
            const active = themeChoice === opt.id;
            const IconC = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => onThemeChange(opt.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 16px',
                  background: 'transparent', border: 'none',
                  borderBottom: i < options.length - 1 ? `0.5px solid ${border}` : 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: active ? '#2774AE' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(39,116,174,0.08)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}>
                  <IconC size={18} color={active ? '#fff' : (dark ? muted : '#2774AE')} strokeWidth={1.9} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: txt, letterSpacing: -0.2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2, letterSpacing: -0.1 }}>{opt.desc}</div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: active ? 'none' : `1.5px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(20,30,40,0.18)'}`,
                  background: active ? '#2774AE' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {active && <ICheck size={13} color="#fff" strokeWidth={2.6} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* section: about */}
        <div style={{
          marginTop: 28,
          fontSize: 11, color: muted, textTransform: 'uppercase',
          letterSpacing: 1.2, fontWeight: 600,
          paddingLeft: 4, marginBottom: 10,
        }}>Sobre</div>

        <div style={{
          background: cardBg, borderRadius: 20,
          border: `0.5px solid ${border}`,
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: '#2774AE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IMapPin size={18} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: txt, letterSpacing: -0.2 }}>Ponto Azul</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>v1.0.0 · comunidade</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
