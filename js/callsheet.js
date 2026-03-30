// TOC rail: smooth scroll, visibility toggle, active state tracking
(function () {
    // Smooth scroll for TOC links
    document.querySelectorAll('.toc-item').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Show TOC after scrolling past project header
    var tocRail = document.getElementById('tocRail');
    var projectHeader = document.querySelector('.project-header');

    if (tocRail && projectHeader) {
        var headerObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    tocRail.classList.remove('visible');
                } else {
                    tocRail.classList.add('visible');
                }
            });
        }, { threshold: 0 });

        headerObserver.observe(projectHeader);
    }

    // Track active section
    var tocItems = document.querySelectorAll('.toc-item');
    var sections = document.querySelectorAll('.content-section[id]');

    if (tocItems.length && sections.length) {
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var id = entry.target.id;
                    tocItems.forEach(function (item) {
                        item.classList.toggle('active', item.dataset.section === id);
                    });
                }
            });
        }, {
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0
        });

        sections.forEach(function (section) { sectionObserver.observe(section); });
    }
})();
