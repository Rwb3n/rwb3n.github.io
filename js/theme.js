// Theme toggle + localStorage persistence
(function () {
    const toggle = document.getElementById('themeToggle');
    const root = document.documentElement;

    if (!toggle) return;

    toggle.addEventListener('click', function () {
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('rwb3n-theme', next);
    });
})();
