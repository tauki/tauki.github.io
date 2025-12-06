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
    let tocObserver = null;

    function initTOC() {
        const tocContainer = document.getElementById('toc-sidebar');
        if (!tocContainer) return;

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

        // Check for sidenotes or marginnotes
        const hasSidenotes = document.querySelector('.sidenote') !== null || document.querySelector('.marginnote') !== null;

        // Check if previously collapsed or default to hasSidenotes
        const existingContent = document.querySelector('.toc-content');
        let isCollapsed = hasSidenotes;
        if (existingContent) {
            isCollapsed = existingContent.classList.contains('collapsed');
        }

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
        tocContainer.style.display = 'block';

        // Scroll Spy for Active Link
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -80% 0px', // Adjusted to trigger earlier
            threshold: 0
        };

        if (tocObserver) {
            tocObserver.disconnect();
        }

        tocObserver = new IntersectionObserver((entries) => {
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

        headers.forEach(header => tocObserver.observe(header));

        // Expose toggle function globally
        window.toggleToc = function () {
            const content = document.querySelector('.toc-content');
            const btn = document.querySelector('.toc-toggle-btn');
            if (content && btn) {
                content.classList.toggle('collapsed');
                btn.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
                // Re-align sidenotes after transition
                setTimeout(() => {
                    if (window.alignSidenotes) window.alignSidenotes();
                }, 300); // 300ms matches standard transition time, adjust if needed
            }
        };
    }

    // Run on load
    initTOC();

    // Expose initTOC globally
    window.initTOC = initTOC;

    // Sidenote Alignment Logic
    function alignSidenotes() {
        if (window.innerWidth <= 1000) return; // Only run on desktop

        const notes = document.querySelectorAll('.sidenote, .marginnote');
        if (notes.length === 0) return;

        const toc = document.getElementById('toc-sidebar');
        let lastBottom = 0;

        // Initialize lastBottom to TOC bottom if it exists and is visible
        if (toc && toc.offsetParent !== null) {
            const tocRect = toc.getBoundingClientRect();
            // We use the visual bottom of the TOC as the starting point + a buffer
            lastBottom = tocRect.bottom;
        }

        notes.forEach(note => {
            // Find the closest block-level parent (paragraph, blockquote, list item)
            const parent = note.closest('p, blockquote, li') || note.parentElement;
            if (!parent) return;

            // Reset margin to calculate natural position
            note.style.marginTop = '0';

            const parentRect = parent.getBoundingClientRect();
            const noteRect = note.getBoundingClientRect();

            let idealTop = parentRect.top;
            const currentTop = noteRect.top;

            // Check for collision with TOC area
            // If the note's ideal position is above the TOC bottom (plus buffer), it conflicts
            if (idealTop < lastBottom) {
                // Conflict! Push it into the article
                note.classList.add('sidenote-pushed-in');
                note.style.marginTop = '0';
                // When pushed in, it doesn't take up sidebar vertical space, so we don't update lastBottom
                // based on this note's height (it effectively disappears from the sidebar flow).
                // However, we should keep lastBottom as is (TOC bottom) for subsequent notes.
            } else {
                // No conflict with TOC, align normally in sidebar
                note.classList.remove('sidenote-pushed-in');

                // Now check for collision with previous sidebar note (if any)
                // We need to track the actual bottom of the *sidebar content*
                // Since this note is in the sidebar, we calculate its position

                // Wait, lastBottom currently tracks the TOC bottom only? 
                // We need `lastSidebarBottom` variable to track note stacking.
                // But simplified: lastBottom is the "safe zone" start.

                // If we are here, idealTop >= lastBottom (TOC bottom).
                // So we are below TOC. We just need to make sure we don't overlap previous notes.
                // But wait, if we skipped previous notes (pushed them in), they don't affect sidebar height.
                // So lastBottom should track the bottom of the last *sidebar* item.

                // Let's refine the logic:
                // lastBottom starts at TOC bottom.
                // If a note is placed in sidebar, lastBottom advances to that note's bottom.

                if (idealTop < lastBottom) {
                    // This case handles collision with *previous note* (since we already established it's below TOC from the first check? 
                    // No, lastBottom grows. So this check is valid.)

                    const targetTop = lastBottom + 10;
                    const offset = currentTop - targetTop;
                    // margin-top: -(currentTop - targetTop) = targetTop - currentTop
                    // This pushes it DOWN.
                    note.style.marginTop = `-${currentTop - targetTop}px`;
                    lastBottom = targetTop + noteRect.height;
                } else {
                    lastBottom = idealTop + noteRect.height;
                    note.style.marginTop = `-${currentTop - idealTop}px`;
                }
            }
        });
    }

    // Expose for TOC toggle
    window.alignSidenotes = alignSidenotes;

    // Run on load and resize
    window.addEventListener('load', alignSidenotes);
    window.addEventListener('resize', alignSidenotes);
    // Also run immediately in case load already happened
    alignSidenotes();
});
