// Stylized abstract map of Aveiro — canals, salt pans, blocks, lagoon edge.
// Renders at 100% width, height; designed for ~402x780 viewport but scales.
// Two color modes: light + dark (via `dark` prop).

function MapSVG({ dark = false, viewBox = '0 0 800 1100', style }) {
  // Palette
  const water    = dark ? '#173044' : '#CFE3F1';
  const water2   = dark ? '#1B3850' : '#BBDAEC';
  const land     = dark ? '#21262E' : '#F4EFE2';
  const block    = dark ? '#2A3038' : '#ECE6D6';
  const blockHi  = dark ? '#323942' : '#E2DBC8';
  const street   = dark ? '#1B1F26' : '#FBF8EF';
  const park     = dark ? '#1F3A2D' : '#D6E5C9';
  const sand     = dark ? '#2E2A22' : '#EFE3C2';
  const saltLine = dark ? '#3A4250' : '#D9D2BD';
  const txt      = dark ? 'rgba(255,255,255,0.32)' : 'rgba(45,55,72,0.40)';

  return (
    <svg
      width="100%" height="100%" viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', ...style }}
    >
      <defs>
        <pattern id="saltpans" x="0" y="0" width="40" height="26" patternUnits="userSpaceOnUse">
          <rect width="40" height="26" fill={sand} />
          <path d={`M0 0H40M0 13H40M0 26H40M0 0V26M20 0V26M40 0V26`} stroke={saltLine} strokeWidth="1.1" />
        </pattern>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* base land */}
      <rect width="100%" height="100%" fill={land} />

      {/* lagoon / Ria de Aveiro to the west */}
      <path
        d="M-40 -40 L240 -40 Q200 220 260 380 Q310 520 220 700 Q150 880 280 1140 L-40 1140 Z"
        fill={water}
      />
      {/* small inlet */}
      <path
        d="M-40 380 Q120 400 200 470 Q260 520 230 580 Q140 560 -40 540 Z"
        fill={water2} opacity="0.7"
      />

      {/* salt pans patch (north) */}
      <path d="M40 60 L240 60 L230 200 L60 220 Z" fill="url(#saltpans)" opacity="0.85" />

      {/* main central canal — Aveiro's signature curve */}
      <path
        d="M-40 540 Q240 520 360 580 Q480 640 600 600 Q740 560 860 620"
        stroke={water} strokeWidth="42" fill="none" strokeLinecap="round"
      />
      <path
        d="M-40 540 Q240 520 360 580 Q480 640 600 600 Q740 560 860 620"
        stroke={water2} strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.9"
      />

      {/* secondary canal — south branch */}
      <path
        d="M280 580 Q320 700 420 760 Q520 820 640 800"
        stroke={water} strokeWidth="28" fill="none" strokeLinecap="round"
      />
      <path
        d="M280 580 Q320 700 420 760 Q520 820 640 800"
        stroke={water2} strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.9"
      />

      {/* north branch canal */}
      <path
        d="M360 580 Q380 460 460 380 Q540 300 660 280"
        stroke={water} strokeWidth="22" fill="none" strokeLinecap="round"
      />

      {/* park (Parque Infante D. Pedro) */}
      <path
        d="M520 820 Q580 800 640 830 Q700 870 700 940 Q680 1000 600 1010 Q520 1010 500 950 Q490 880 520 820 Z"
        fill={park}
      />

      {/* street grid — soft, hand-drawn feel via slight curves */}
      <g stroke={street} strokeWidth="9" fill="none" strokeLinecap="round">
        {/* horizontals (slightly curved) */}
        <path d="M260 320 Q500 310 780 330" />
        <path d="M280 410 Q520 400 800 420" />
        <path d="M300 480 Q560 480 800 490" />
        <path d="M340 660 Q540 650 800 670" />
        <path d="M360 740 Q580 740 800 750" />
        <path d="M380 880 Q600 880 800 895" />
        <path d="M400 970 Q620 970 800 980" />
        {/* verticals */}
        <path d="M340 250 Q330 500 360 800" />
        <path d="M460 240 Q470 500 480 950" />
        <path d="M580 280 Q570 500 590 1000" />
        <path d="M700 260 Q690 500 720 1000" />
      </g>

      {/* building blocks */}
      <g>
        {[
          // [x, y, w, h]
          [266, 326, 70, 80, 0],
          [346, 326, 110, 80, 0],
          [466, 326, 110, 80, 0],
          [586, 326, 110, 80, 0],
          [706, 326, 80, 80, 0],

          [286, 416, 70, 60, 1],
          [366, 416, 90, 60, 0],
          [486, 416, 90, 60, 1],
          [606, 416, 90, 60, 0],
          [716, 416, 70, 60, 1],

          [310, 490, 50, 60, 0],
          [380, 490, 80, 60, 1],
          [490, 490, 80, 60, 0],
          [600, 490, 90, 60, 1],
          [720, 490, 70, 60, 0],

          [350, 670, 100, 60, 0],
          [490, 670, 80, 60, 1],
          [600, 670, 100, 60, 0],
          [720, 670, 70, 60, 1],

          [380, 750, 90, 120, 0],
          [490, 750, 80, 120, 1],
          [600, 750, 90, 120, 0],

          [410, 890, 60, 70, 1],
          [490, 890, 80, 70, 0],
          [600, 890, 90, 70, 1],
          [710, 890, 80, 70, 0],
        ].map(([x, y, w, h, alt], i) => (
          <rect
            key={i}
            x={x} y={y} width={w} height={h}
            rx={5} ry={5}
            fill={alt ? blockHi : block}
          />
        ))}
      </g>

      {/* a couple of small piers / docks on the canal */}
      <g fill={blockHi}>
        <rect x="270" y="555" width="22" height="6" rx="2" />
        <rect x="430" y="600" width="22" height="6" rx="2" />
        <rect x="610" y="595" width="22" height="6" rx="2" />
      </g>

      {/* labels (very faint) */}
      <g fontFamily="Geist, system-ui, sans-serif" fill={txt} fontWeight="500" letterSpacing="0.5">
        <text x="120" y="320" fontSize="14" transform="rotate(-12 120 320)">RIA</text>
        <text x="100" y="160" fontSize="11">SALINAS</text>
        <text x="500" y="566" fontSize="11">CANAL CENTRAL</text>
        <text x="600" y="950" fontSize="11">PARQUE</text>
      </g>
    </svg>
  );
}

window.MapSVG = MapSVG;
