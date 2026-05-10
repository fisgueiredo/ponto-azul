const SCRIPT = `
(function() {
  function apply() {
    try {
      var t = localStorage.getItem('pa:theme');
      var root = document.documentElement;
      if (t === 'dark') {
        if (root.getAttribute('data-theme') !== 'dark') root.setAttribute('data-theme', 'dark');
      } else if (t === 'light') {
        if (root.getAttribute('data-theme') !== 'light') root.setAttribute('data-theme', 'light');
      } else {
        if (root.hasAttribute('data-theme')) root.removeAttribute('data-theme');
      }
    } catch (e) {}
  }
  apply();
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) apply();
  });
  window.addEventListener('pageshow', apply);
  window.addEventListener('focus', apply);
  window.addEventListener('storage', function(e) {
    if (!e || e.key === 'pa:theme' || e.key === null) apply();
  });
  window.__paApplyTheme = apply;
})();
`.trim();

export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
      suppressHydrationWarning
    />
  );
}
