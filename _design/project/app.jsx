// Main app — screen state machine, transitions, Tweaks integration.

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "system"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [systemDark, setSystemDark] = useState(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  const dark = tweaks.theme === 'dark' || (tweaks.theme === 'system' && systemDark);

  // Screens: 'map' | 'list' | 'detail' | 'add' | 'settings'
  const [screen, setScreen] = useState('map');
  const [place, setPlace] = useState(null);
  const [places, setPlaces] = useState(PLACES);
  const [transition, setTransition] = useState(null); // null | 'forward' | 'back'
  const [prevScreen, setPrevScreen] = useState(null);

  const go = (next, p = null, dir = 'forward') => {
    setPrevScreen(screen);
    setTransition(dir);
    if (p) setPlace(p);
    setScreen(next);
    setTimeout(() => setTransition(null), 380);
  };

  // Sync stage background
  useEffect(() => {
    document.body.style.background = dark ? '#1B1F26' : '#E8E4DA';
  }, [dark]);

  const handlePin = (p) => go('detail', p, 'forward');
  const handleSheetTap = () => go('list', null, 'forward');
  const handleAdd = () => go('add', null, 'forward');
  const handleSettings = () => go('settings', null, 'forward');
  const handleBackToMap = () => go('map', null, 'back');

  const handleConfirmAdd = ({ title, desc, x, y }) => {
    const newPlace = {
      id: 'new-' + Date.now(),
      name: title, address: 'Aveiro centro', desc: desc || 'Adicionado pela comunidade.',
      distance: '50 m', rating: 5.0, reviews: 1,
      addedBy: 'Você', addedAgo: 'agora mesmo',
      x, y, available: true,
    };
    setPlaces([newPlace, ...places]);
    go('map', null, 'back');
  };

  // Render the appropriate screen
  const renderScreen = (which) => {
    switch (which) {
      case 'map':
        return (
          <MapScreen
            dark={dark} places={places}
            onPin={handlePin} onAdd={handleAdd}
            onSearch={handleSheetTap} onSheetTap={handleSheetTap}
            onSettings={handleSettings}
          />
        );
      case 'list':
        return (
          <ListScreen
            dark={dark} places={places}
            onClose={handleBackToMap}
            onPlace={(p) => go('detail', p, 'forward')}
          />
        );
      case 'detail':
        return (
          <DetailScreen
            dark={dark} place={place}
            onBack={() => go(prevScreen === 'list' ? 'list' : 'map', null, 'back')}
          />
        );
      case 'add':
        return (
          <AddScreen
            dark={dark}
            onCancel={handleBackToMap}
            onConfirm={handleConfirmAdd}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            dark={dark}
            themeChoice={tweaks.theme}
            onThemeChange={(v) => setTweak('theme', v)}
            onBack={handleBackToMap}
          />
        );
      default:
        return null;
    }
  };

  // Phone screen viewport (inside the device chrome)
  const phoneScreenStyle = {
    position: 'absolute', inset: 0, overflow: 'hidden',
    background: dark ? '#1B1F26' : '#FBF8EF',
    borderRadius: 48,
  };

  // Animated transition: incoming screen slides/fades in
  const incomingStyle = transition
    ? {
        animation: transition === 'forward'
          ? 'slideInRight 0.4s cubic-bezier(0.32, 0.72, 0, 1) both'
          : 'slideInLeft 0.4s cubic-bezier(0.32, 0.72, 0, 1) both',
      }
    : {};

  return (
    <div data-screen-label={`App / ${screen}`} style={{ position: 'relative' }}>
      {/* keyframes for transitions */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <IOSDevice dark={dark} width={402} height={874}>
        <div style={phoneScreenStyle}>
          {/* status bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
            <IOSStatusBar dark={dark} />
          </div>

          {/* current screen with transition */}
          <div key={screen} style={{ position: 'absolute', inset: 0, ...incomingStyle }}>
            {renderScreen(screen)}
          </div>

          {/* home indicator */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200,
            height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            paddingBottom: 8, pointerEvents: 'none',
          }}>
            <div style={{
              width: 139, height: 5, borderRadius: 100,
              background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.28)',
              mixBlendMode: 'difference',
            }} />
          </div>
        </div>
      </IOSDevice>

      {/* Floating screen tabs — invisible labels for navigation hint */}
      <ScreenNav screen={screen} go={go} dark={dark} />

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Aparência">
          <TweakRadio
            label="Tema"
            value={tweaks.theme}
            options={[
              { value: 'light',  label: 'Claro' },
              { value: 'dark',   label: 'Escuro' },
              { value: 'system', label: 'Sistema' },
            ]}
            onChange={v => setTweak('theme', v)}
          />
        </TweakSection>
        <TweakSection title="Navegar">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['map',      'Mapa'],
              ['list',     'Lista'],
              ['detail',   'Detalhe'],
              ['add',      'Adicionar'],
              ['settings', 'Definições'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id, id === 'detail' ? PLACES[0] : null, 'forward')}
                style={{
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: screen === id ? '#2774AE' : 'rgba(255,255,255,0.04)',
                  color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'center', letterSpacing: -0.1,
                }}
              >{label}</button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Visible screen indicator (small floating breadcrumb beneath the phone)
function ScreenNav({ screen, dark }) {
  const labels = {
    map:      '01  Mapa',
    list:     '02  Bottom sheet expandido',
    detail:   '03  Detalhe do lugar',
    add:      '04  Adicionar lugar',
    settings: '05  Definições',
  };
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: -44,
      transform: 'translateX(-50%)',
      fontFamily: 'Geist Mono, monospace',
      fontSize: 11, letterSpacing: 0.4, color: 'rgba(40,50,65,0.55)',
      padding: '6px 14px', borderRadius: 999,
      background: 'rgba(255,255,255,0.5)',
      border: '0.5px solid rgba(40,50,65,0.10)',
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap',
    }}>{labels[screen]}</div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
