document.addEventListener('DOMContentLoaded', function () {
    // Theme Toggle Logic
    const toggleBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    function updateIcon(theme) {
        const isDark = theme === 'dark' || (!theme && systemPrefersDark);
        if (toggleBtn) {
            toggleBtn.textContent = isDark ? "☀️" : "🌙";
        }
    }

    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateIcon(currentTheme);
    } else {
        updateIcon(null);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark' || (!theme && systemPrefersDark)) {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                updateIcon('light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                updateIcon('dark');
            }
        });
    }

    // TOC Logic
    const tocContainer = document.getElementById('toc-sidebar');
    if (tocContainer) {
        // Don't generate TOC on homepage
        if (document.querySelector('.home-layout')) {
            tocContainer.style.display = 'none';
            return;
        }

        const headers = document.querySelectorAll('.post-content h2, .post-content h3');
        if (headers.length < 1) {
            tocContainer.style.display = 'none';
            return;
        }

        // Check for sidenotes
        const hasSidenotes = document.querySelector('.sidenote') !== null;
        const isCollapsed = hasSidenotes; // Default to collapsed if sidenotes exist

        let tocHTML = `
      <div class="toc-header" onclick="toggleToc()">
        <span class="toc-title">On this page</span>
        <button class="toc-toggle-btn">${isCollapsed ? '▼' : '▲'}</button>
      </div>
      <div class="toc-content ${isCollapsed ? 'collapsed' : ''}">
        <ul class="toc-list">
    `;

        headers.forEach((header, index) => {
            if (!header.id) {
                header.id = 'header-' + index;
            }
            const level = header.tagName.toLowerCase() === 'h2' ? 'toc-h2' : 'toc-h3';
            tocHTML += `<li class="${level}"><a href="#${header.id}">${header.textContent}</a></li>`;
        });

        tocHTML += '</ul></div>';
        tocContainer.innerHTML = tocHTML;

        // Scroll Spy for Active Link
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -80% 0px', // Adjusted to trigger earlier
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.toc-list a').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === '#' + id) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        headers.forEach(header => observer.observe(header));

        // Expose toggle function globally
        window.toggleToc = function () {
            const content = document.querySelector('.toc-content');
            const btn = document.querySelector('.toc-toggle-btn');
            content.classList.toggle('collapsed');
            btn.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
        };
    }
});
