const fileViewerImage = document.getElementById('fileViewerImage');
const fileViewerContent = document.getElementById('fileViewerContent');
const fileBackButton = document.getElementById('fileBackButton');
const fileDetails = document.getElementById('fileDetails');

function showViewerError(message) {
  const error = document.createElement('p');
  error.className = 'file-viewer-error';
  error.textContent = message;
  fileViewerContent.replaceChildren(error);
}

function addMetadata(label, value) {
  const entry = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value || '—';
  entry.append(term, description);
  document.getElementById('fileMetadata').append(entry);
}

function addPills(containerId, values = []) {
  const container = document.getElementById(containerId);
  values.forEach((value) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = value;
    container.append(pill);
  });
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

async function loadFile() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');
  if (!itemId) {
    showViewerError('No archive file was selected.');
    return;
  }

  const returnUrl = new URL('lib.html', window.location.href);
  const folder = params.get('folder');
  const query = params.get('q');
  if (folder) {
    returnUrl.searchParams.set('folder', folder);
  }
  if (query) {
    returnUrl.searchParams.set('q', query);
  }
  fileBackButton.href = `${returnUrl.pathname.split('/').pop()}${returnUrl.search}`;

  const response = await fetch('data/archive.json');
  if (!response.ok) {
    throw new Error(`Could not load archive data (${response.status}).`);
  }

  const archive = await response.json();
  const item = archive.items?.find((archiveItem) => archiveItem.id === itemId);
  if (!item || !item.imageAddress) {
    showViewerError('The selected archive file could not be found.');
    return;
  }

  document.title = `${item.title} | Epstain Library`;
  fileViewerImage.alt = item.title;
  fileViewerImage.src = item.imageAddress;
  fileViewerImage.hidden = false;
  document.getElementById('fileCategory').textContent = `ARCHIVE FILE • ${item.category}`;
  document.getElementById('fileTitle').textContent = item.title;
  document.getElementById('fileDescription').textContent = item.description;
  addMetadata('FILE ID', item.id);
  addMetadata('FOLDERS', getItemFolders(item).join(', '));
  addMetadata('CATEGORY', item.category);
  addMetadata('DATE', item.date);
  addMetadata('ARCHIVE NOTES', item.metadata);
  addPills('filePeople', item.people);
  addPills('fileTags', item.tags);
  fileDetails.hidden = false;
  fileViewerImage.addEventListener('error', () => {
    console.error(`Could not load archive image: ${item.imageAddress}`);
    showViewerError('The image for this archive file could not be loaded.');
  }, { once: true });
}

loadFile().catch((error) => {
  console.error(error);
  showViewerError('The archive file could not be loaded. Please try again.');
});
