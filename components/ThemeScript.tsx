const SCRIPT = `
(function() {
  function apply() {
    try {
      var t = localStorage.getItem('pa:theme') || 'system';
      var mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      var dark = t === 'dark' || (t === 'system' && !!(mql && mql.matches));
      var root = document.documentElement;
      if (dark) {
        if (root.getAttribute('data-theme') !== 'dark') root.setAttribute('data-theme', 'dark');
      } else {
        if (root.hasAttribute('data-theme')) root.removeAttribute('data-theme');
      }
    } catch (e) {}
  }
  apply();
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  } catch (e) {}
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
