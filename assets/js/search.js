const searchToggle = document.getElementById('search-toggle');
const searchModal = document.getElementById('search-modal');
const closeSearch = document.getElementById('close-search');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchData = [];

// Open search
if (searchToggle) {
    searchToggle.addEventListener('click', () => {
        searchModal.classList.add('active');
        searchInput.focus();
        if (searchData.length === 0) {
            fetch('/search.json')
                .then(response => response.json())
                .then(data => {
                    searchData = data;
                });
        }
    });
}

// Close search
function closeSearchModal() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
}

if (closeSearch) {
    closeSearch.addEventListener('click', closeSearchModal);
}

if (searchModal) {
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearchModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
        closeSearchModal();
    }
});

const BATCH_SIZE = 10;
let filteredResults = [];
let loadedCount = 0;

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            searchResults.innerHTML = '';
            filteredResults = [];
            return;
        }

        filteredResults = searchData.reduce((acc, item) => {
            const titleMatch = item.title.toLowerCase().includes(query);
            const contentSnippets = getSnippets(item.content, query);

            if (titleMatch || contentSnippets.length > 0) {
                acc.push({
                    ...item,
                    snippets: contentSnippets
                });
            }
            return acc;
        }, []);

        loadedCount = 0;
        searchResults.innerHTML = ''; // Clear previous results

        if (filteredResults.length > 0) {
            renderNextBatch(query);
        } else {
            searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
        }
    });

    // Infinite scroll listener
    searchResults.addEventListener('scroll', () => {
        if (searchResults.scrollTop + searchResults.clientHeight >= searchResults.scrollHeight - 20) {
            if (loadedCount < filteredResults.length) {
                renderNextBatch(searchInput.value.toLowerCase());
            }
        }
    });
}

function renderNextBatch(query) {
    const nextBatch = filteredResults.slice(loadedCount, loadedCount + BATCH_SIZE);

    const html = nextBatch.map(item => {
        const snippetsHTML = item.snippets.map(snippet =>
            `<div class="search-snippet">...${snippet}...</div>`
        ).join('');

        return `
          <a href="${item.url}" class="search-result-item">
            <div class="search-result-title">${highlightText(item.title, query)}</div>
            <div class="search-result-date">${item.date}</div>
            ${snippetsHTML}
          </a>
        `;
    }).join('');

    searchResults.insertAdjacentHTML('beforeend', html);
    loadedCount += nextBatch.length;
}

function getSnippets(content, query) {
    const lowerContent = content.toLowerCase();
    const snippets = [];
    let pos = lowerContent.indexOf(query);

    while (pos !== -1 && snippets.length < 3) {
        const start = Math.max(0, pos - 40);
        const end = Math.min(content.length, pos + query.length + 40);
        let snippet = content.slice(start, end);

        // Highlight the query in the snippet
        snippet = highlightText(snippet, query);

        snippets.push(snippet);
        pos = lowerContent.indexOf(query, pos + 1);
    }

    return snippets;
}

function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}
