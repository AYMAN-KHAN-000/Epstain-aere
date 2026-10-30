let topLevelFolders = [];
let archiveItems = [];

const state = {
  currentFolder: null,
  query: '',
  activeView: 'all'
};

const librarySearch = document.getElementById('librarySearch');
const libraryContent = document.getElementById('libraryContent');
const breadcrumb = document.getElementById('breadcrumb');
const backToLibraryButton = document.getElementById('backToLibraryButton');

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getItemFolders(item) {
  if (Array.isArray(item.folders)) {
    return item.folders;
  }
  if (Array.isArray(item.folder)) {
    return item.folder;
  }
  return item.folder ? [item.folder] : [];
}

function getFolderItemCount(folderName) {
  return archiveItems.filter((item) => getItemFolders(item).includes(folderName)).length;
}

function renderBreadcrumb() {
  backToLibraryButton.hidden = !state.currentFolder && !state.query;
  const crumbs = [{ title: 'LIBRARY', clickable: true }];

  if (state.currentFolder) {
    crumbs.push({ title: state.currentFolder, clickable: false });
  }

  if (state.query) {
    crumbs.push({ title: 'SEARCH', clickable: false });
  }

  breadcrumb.innerHTML = crumbs
    .map((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      const label = isLast ? `<span class="crumb current">${crumb.title}</span>` : `<button class="crumb" type="button" data-crumb="${crumb.title}">${crumb.title}</button>`;
      return `${label}${!isLast ? '<span class="divider">/</span>' : ''}`;
    })
    .join('');

  breadcrumb.querySelectorAll('[data-crumb]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.crumb === 'LIBRARY') {
        returnToLibrary();
      }
    });
  });
}

function returnToLibrary() {
  state.currentFolder = null;
  state.query = '';
  librarySearch.value = '';

  const url = new URL(window.location.href);
  url.searchParams.delete('q');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  renderLibrary();
}

function getVisibleResults(query = state.query, folder = state.currentFolder) {
  const cleaned = normalizeText(query.trim());
  if (!cleaned) {
    if (folder) {
      return archiveItems.filter((item) => getItemFolders(item).includes(folder));
    }
    return archiveItems;
  }

  const terms = cleaned.split(/\s+/).filter(Boolean);

  return archiveItems.filter((item) => {
    const searchable = [
      item.title,
      item.description,
      item.category,
      item.metadata,
      item.people?.join(' ') || '',
      item.tags?.join(' ') || '',
      getItemFolders(item).join(' '),
      item.date
    ].join(' ');

    const base = normalizeText(searchable);
    if (terms.length === 0) {
      return true;
    }

    return terms.every((term) => base.includes(term));
  }).filter((item) => {
    if (folder) {
      return getItemFolders(item).includes(folder);
    }
    return true;
  });
}

function renderFolderCards() {
  const cards = topLevelFolders
    .map((folder) => {
      const count = getFolderItemCount(folder);
      return `
        <button class="folder-card" type="button" data-folder="${folder}">
          <div>
            <img class="folder-icon" src="public/images/folder.png" alt="" />
            <h3 class="folder-name">${folder}</h3>
          </div>
          <div class="folder-meta">${count} FILE${count === 1 ? '' : 'S'}</div>
        </button>
      `;
    })
    .join('');

  return `<div class="folder-grid">${cards}</div>`;
}

function renderItemCards(items) {
  if (!items.length) {
    return `
      <div class="empty-state">
        No records match that query. Try a wider search across titles, descriptions, people, tags, or metadata.
      </div>
    `;
  }

  return `
    <div class="file-grid">
      ${items
        .map((item) => {
          const tags = (item.tags || []).slice(0, 3).map((tag) => `<span class="pill">${tag}</span>`).join('');
          const date = item.date ? `<span class="pill">${item.date}</span>` : '';
          const person = item.people?.[0] ? `<span class="pill">${item.people[0]}</span>` : '';
          return `
            <article class="item-card" data-item-id="${item.id}" tabindex="0" role="button" aria-label="Open ${item.title}">
              <div class="thumb" style="background-image: url('${item.imageAddress}')"></div>
              <div class="item-body">
                <span class="item-type">FILE • ${item.category}</span>
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                  ${date}
                  ${person}
                </div>
                <div class="item-meta">${tags}</div>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderSearchResults(items) {
  if (!items.length) {
    return `
      <div class="empty-state">
        No records match that query. Try a wider search across titles, descriptions, people, tags, or metadata.
      </div>
    `;
  }

  return `
    <div class="result-grid">
      ${items
        .map((item) => {
          const matchTerms = [
            item.title,
            item.description,
            item.category,
            item.people?.join(', ') || '',
            item.tags?.join(', ') || '',
            item.metadata
          ].filter(Boolean).slice(0, 3);
          const folders = getItemFolders(item)
            .map((folder) => `<span class="pill">${folder}</span>`)
            .join('');

          return `
            <article class="result-card" data-item-id="${item.id}" tabindex="0" role="button" aria-label="Open ${item.title}">
              <div class="result-header">
                <div class="result-file-icon">📄</div>
                <span class="result-type">${item.category}</span>
              </div>
              <div>
                <h3 class="result-title">${item.title}</h3>
              </div>
              <p class="result-description">${item.description}</p>
              <div class="result-detail">
                <div class="result-meta">
                  ${folders}
                  <span class="pill">${item.date}</span>
                </div>
                <div class="result-match">
                  <strong>Matched information:</strong><br />
                  ${matchTerms.join(' • ')}
                </div>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderLibrary() {
  renderBreadcrumb();

  if (state.query) {
    const results = getVisibleResults();
    libraryContent.innerHTML = renderSearchResults(results);
    bindArchiveItemCards();
    return;
  }

  if (state.currentFolder) {
    const folderItems = getVisibleResults('', state.currentFolder);
    libraryContent.innerHTML = renderItemCards(folderItems);
    bindArchiveItemCards();
    return;
  }

  libraryContent.innerHTML = renderFolderCards();

  libraryContent.querySelectorAll('[data-folder]').forEach((button) => {
    button.addEventListener('click', () => {
      state.currentFolder = button.dataset.folder;
      renderLibrary();
    });
  });
}

function bindArchiveItemCards() {
  libraryContent.querySelectorAll('[data-item-id]').forEach((card) => {
    card.addEventListener('click', () => openFile(card.dataset.itemId));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFile(card.dataset.itemId);
      }
    });
  });
}

function openFile(itemId) {
  const item = archiveItems.find((archiveItem) => archiveItem.id === itemId);
  if (!item) {
    console.error(`Archive item not found: ${itemId}`);
    return;
  }

  const fileUrl = new URL('file.html', window.location.href);
  fileUrl.searchParams.set('id', item.id);
  if (state.currentFolder) {
    fileUrl.searchParams.set('folder', state.currentFolder);
  }
  if (state.query) {
    fileUrl.searchParams.set('q', state.query);
  }
  window.location.href = fileUrl.href;
}

async function loadArchive() {
  const response = await fetch('data/archive.json');
  if (!response.ok) {
    throw new Error(`Could not load archive data (${response.status}).`);
  }

  const archive = await response.json();
  if (!Array.isArray(archive.folders) || !Array.isArray(archive.items)) {
    throw new Error('Archive data must include folders and items arrays.');
  }

  topLevelFolders = archive.folders;
  archiveItems = archive.items;
  renderLibrary();
}

librarySearch.addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  if (!state.query) {
    state.currentFolder = null;
  }
  renderLibrary();
});

backToLibraryButton.addEventListener('click', returnToLibrary);

const pageParams = new URLSearchParams(window.location.search);
state.currentFolder = pageParams.get('folder') || null;
state.query = pageParams.get('q')?.trim() || '';
librarySearch.value = state.query;
loadArchive().catch((error) => {
  console.error(error);
  libraryContent.innerHTML = `
    <div class="empty-state">
      The archive could not be loaded. Check that data/archive.json is available, then refresh the page.
    </div>
  `;
});
