document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('journal-container');
    const sentinel = document.getElementById('scroll-sentinel');
    const loadingIndicator = document.getElementById('loading-indicator');
    const toggleBtn = document.getElementById('toggle-all-btn');
    const tagsContainer = document.getElementById('journal-tags');

    let allNotes = [];
    let filteredNotes = [];
    let groupedNotes = {};
    let monthKeys = [];
    let currentMonthIndex = 0;
    let isExpanded = true;
    let activeTag = null;
    const BATCH_SIZE = 3;

    // TOC Scroll Observer
    const tocObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                updateActiveTocLink(id);
            }
        });
    }, { rootMargin: '0px 0px -80% 0px' });

    // Fetch data
    fetch('/prose.json')
        .then(response => response.json())
        .then(data => {
            allNotes = data;
            filteredNotes = allNotes; // Start with all
            renderTags();
            groupNotesByMonth();
            initProseTOC();
            renderNextBatch();
            setupIntersectionObserver();
        })
        .catch(error => {
            console.error('Error loading prose:', error);
            loadingIndicator.textContent = 'Error loading content.';
        });

    function renderTags() {
        const tags = new Set();
        allNotes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(cat => tags.add(cat));
            }
        });

        const sortedTags = Array.from(tags).sort();

        tagsContainer.innerHTML = '';
        sortedTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'journal-tag-btn';
            btn.textContent = tag;
            btn.onclick = () => filterByTag(tag);
            tagsContainer.appendChild(btn);
        });
    }

    function filterByTag(tag) {
        if (activeTag === tag) {
            activeTag = null; // Toggle off
        } else {
            activeTag = tag;
        }

        // Update buttons
        document.querySelectorAll('.journal-tag-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === activeTag);
        });

        // Filter notes
        if (activeTag) {
            filteredNotes = allNotes.filter(note => note.categories && note.categories.includes(activeTag));
        } else {
            filteredNotes = allNotes;
        }

        // Reset View
        container.innerHTML = '';
        currentMonthIndex = 0;
        groupedNotes = {};
        monthKeys = [];
        sentinel.style.display = 'block';
        loadingIndicator.style.display = 'block';

        groupNotesByMonth();
        initProseTOC();
        renderNextBatch();
    }

    function groupNotesByMonth() {
        groupedNotes = {};
        monthKeys = [];

        filteredNotes.forEach(note => {
            const date = new Date(note.date);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!groupedNotes[monthYear]) {
                groupedNotes[monthYear] = [];
                monthKeys.push(monthYear);
            }
            groupedNotes[monthYear].push(note);
        });
    }

    function initProseTOC() {
        const tocContainer = document.getElementById('toc-sidebar');
        if (!tocContainer) return;

        const isMobile = window.innerWidth <= 1000;
        const buttonText = isMobile ? '▲' : '▼'; // If collapsed (mobile), button should show expand arrow (▲)? No, wait. 
        // Logic check: 
        // Expanded: ▼ (shows content)
        // Collapsed: ▲ (shows header only, click to expand)

        // Let's verify standard behavior:
        // Originally: <button>▼</button> and not collapsed. 

        // If we want collapsed by default on mobile:
        const initialClass = isMobile ? ' toc-content collapsed' : ' toc-content';
        const initialButton = isMobile ? '▲' : '▼';

        let tocHTML = `
      <div class="toc-header">
        <span class="toc-title">On this page</span>
        <button class="toc-toggle-btn">${initialButton}</button>
      </div>
      <div class="${initialClass}">
        <ul class="toc-list">
    `;

        filteredNotes.forEach(note => {
            const id = 'prose-' + note.slug;
            tocHTML += `<li class="toc-h2"><a href="#${id}" class="prose-toc-link" data-slug="${note.slug}">${note.title}</a></li>`;
        });

        tocHTML += '</ul></div>';
        tocContainer.innerHTML = tocHTML;
        tocContainer.style.display = 'block';

        document.querySelectorAll('.prose-toc-link').forEach(link => {
            link.addEventListener('click', handleTocClick);
        });

        const header = tocContainer.querySelector('.toc-header');
        // Remove old listener to avoid duplicates if re-init
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);

        newHeader.addEventListener('click', () => {
            const content = tocContainer.querySelector('.toc-content');
            const btn = tocContainer.querySelector('.toc-toggle-btn');
            content.classList.toggle('collapsed');
            btn.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
        });
    }

    function handleTocClick(e) {
        e.preventDefault();
        const slug = e.target.getAttribute('data-slug');
        const targetId = 'prose-' + slug;
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            updateActiveTocLink(targetId);
        } else {
            loadUntilFound(slug);
        }
    }

    function loadUntilFound(slug) {
        let targetMonthIndex = -1;

        for (let i = 0; i < monthKeys.length; i++) {
            const month = monthKeys[i];
            const notes = groupedNotes[month];
            if (notes.find(n => n.slug === slug)) {
                targetMonthIndex = i;
                break;
            }
        }

        if (targetMonthIndex === -1) return;

        const loadLoop = setInterval(() => {
            if (currentMonthIndex > targetMonthIndex) {
                clearInterval(loadLoop);
                setTimeout(() => {
                    const targetElement = document.getElementById('prose-' + slug);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                        updateActiveTocLink('prose-' + slug);
                    }
                }, 100);
            } else {
                renderNextBatch();
            }
        }, 50);
    }

    function updateActiveTocLink(id) {
        document.querySelectorAll('.toc-list a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
            }
        });
    }

    function renderNextBatch() {
        const endIndex = Math.min(currentMonthIndex + BATCH_SIZE, monthKeys.length);
        const batchKeys = monthKeys.slice(currentMonthIndex, endIndex);

        if (batchKeys.length === 0) {
            loadingIndicator.style.display = 'none';
            return;
        }

        batchKeys.forEach(month => {
            const notes = groupedNotes[month];
            const details = document.createElement('details');
            details.className = 'journal-month';
            if (isExpanded) details.setAttribute('open', '');

            const summary = document.createElement('summary');
            summary.className = 'journal-month-title';
            summary.textContent = month;
            details.appendChild(summary);

            const entriesDiv = document.createElement('div');
            entriesDiv.className = 'journal-entries';

            notes.forEach((note, index) => {
                const article = document.createElement('article');
                article.className = 'journal-entry';
                article.id = 'prose-' + note.slug;

                const dateStr = new Date(note.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

                let metaHtml = `<span class="journal-entry-date">${dateStr}</span>`;
                if (note.subtitle) {
                    metaHtml += `<span class="journal-entry-subtitle"> • ${note.subtitle}</span>`;
                }

                article.innerHTML = `
          <header class="journal-entry-header">
            <h2 class="journal-entry-title">
              <a href="${note.url}">${note.title}</a>
            </h2>
            <div class="journal-entry-meta">${metaHtml}</div>
          </header>
          <div class="journal-entry-body">${note.content}</div>
        `;

                entriesDiv.appendChild(article);

                tocObserver.observe(article);

                if (index < notes.length - 1) {
                    const hr = document.createElement('hr');
                    hr.className = 'journal-separator';
                    entriesDiv.appendChild(hr);
                }
            });

            details.appendChild(entriesDiv);
            container.appendChild(details);
        });

        currentMonthIndex = endIndex;

        if (currentMonthIndex >= monthKeys.length) {
            loadingIndicator.style.display = 'none';
            sentinel.style.display = 'none';
        }
    }

    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                renderNextBatch();
            }
        }, { rootMargin: '200px' });

        observer.observe(sentinel);
    }

    toggleBtn.addEventListener('click', function () {
        isExpanded = !isExpanded;
        const details = document.querySelectorAll('.journal-month');
        details.forEach(detail => {
            if (isExpanded) {
                detail.setAttribute('open', '');
            } else {
                detail.removeAttribute('open');
            }
        });
        toggleBtn.textContent = isExpanded ? 'Collapse' : 'Expand';
    });
});
