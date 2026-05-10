const SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('pa:theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  } catch (e) {}
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
