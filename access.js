const ACCESS_MODE_KEY = 'epstainLibraryAccess';
const PENDING_DESTINATION_KEY = 'epstainLibraryDestination';
const HOME_NAVIGATION_KEY = 'epstainLibraryHomeNavigation';

window.archiveAccess = {
  getMode() {
    return sessionStorage.getItem(ACCESS_MODE_KEY);
  },
  hasChosenMode() {
    return ['full', 'limited'].includes(this.getMode());
  },
  canViewItem(item) {
    return !item.password || this.getMode() === 'full';
  }
};

const accessGate = document.getElementById('accessGate');
if (accessGate) {
  const form = document.getElementById('accessGateForm');
  const passwordInput = document.getElementById('archivePassword');
  const errorMessage = document.getElementById('accessGateError');
  const enterWithoutPassword = document.getElementById('enterWithoutPassword');
  const landingView = document.querySelector('.landing-view');
  const cameFromHomeLink = sessionStorage.getItem(HOME_NAVIGATION_KEY) === 'true';
  sessionStorage.removeItem(HOME_NAVIGATION_KEY);

  if (!cameFromHomeLink) {
    sessionStorage.removeItem(ACCESS_MODE_KEY);
  }

  async function getArchivePasswords() {
    const response = await fetch('data/archive.json');
    if (!response.ok) {
      throw new Error(`Could not load archive data (${response.status}).`);
    }

    const archive = await response.json();
    if (!Array.isArray(archive.password)) {
      throw new Error('Archive data must include a password array.');
    }
    return archive.password;
  }

  function enterLibrary(mode) {
    sessionStorage.setItem(ACCESS_MODE_KEY, mode);
    accessGate.hidden = true;
    document.body.classList.remove('landing-active');

    const destination = sessionStorage.getItem(PENDING_DESTINATION_KEY);
    if (destination) {
      sessionStorage.removeItem(PENDING_DESTINATION_KEY);
      window.location.replace(destination);
    } else {
      landingView.inert = false;
      document.getElementById('homeSearch').focus();
    }
  }

  const alreadyHasAccess = window.archiveAccess.hasChosenMode();
  accessGate.hidden = alreadyHasAccess;
  landingView.inert = !alreadyHasAccess;
  if (alreadyHasAccess) {
    document.body.classList.remove('landing-active');
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    try {
      const passwords = await getArchivePasswords();
      if (!passwords.includes(passwordInput.value.trim())) {
        errorMessage.textContent = 'That password is not recognized. Try again or continue without a password.';
        errorMessage.hidden = false;
        passwordInput.focus();
        return;
      }
      enterLibrary('full');
    } catch (error) {
      console.error(error);
      errorMessage.textContent = 'The archive could not be checked. Please try again later.';
      errorMessage.hidden = false;
    }
  });

  enterWithoutPassword.addEventListener('click', () => enterLibrary('limited'));
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const homeLink = event.target.closest('a[href]');
  if (!homeLink || !window.archiveAccess.hasChosenMode()) {
    return;
  }

  const destination = new URL(homeLink.href, window.location.href);
  if (destination.origin === window.location.origin && destination.pathname.endsWith('/index.html')) {
    sessionStorage.setItem(HOME_NAVIGATION_KEY, 'true');
  }
});
