const stage = document.getElementById('gameStage');
const runner = document.getElementById('runner');
const villain = document.getElementById('villain');
const entities = document.getElementById('entities');
const choicesContainer = document.getElementById('characterChoices');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverChangeCharacterButton = document.getElementById('gameOverChangeCharacterButton');
const gameDescription = document.getElementById('gameDescription');
const gameControls = document.getElementById('gameControls');
const gameStatus = document.getElementById('gameStatus');
const distanceCount = document.getElementById('distanceCount');
const coinCount = document.getElementById('coinCount');
const coinIcon = document.getElementById('coinIcon');
const assetNotice = document.getElementById('assetNotice');
const gameName = document.getElementById('gameName');
const gameOverSummary = document.getElementById('gameOverSummary');
const gameOverRecords = document.getElementById('gameOverRecords');
const characterScreenTitle = document.getElementById('characterScreenTitle');
const characterScreenCopy = document.getElementById('characterScreenCopy');

const state = {
  phase: 'loading',
  character: null,
  gameData: null,
  lastFrame: 0,
  elapsed: 0,
  distance: 0,
  coins: 0,
  speed: 360,
  jumpHeight: 0,
  jumpVelocity: 0,
  obstacleTimer: 0,
  coinTimer: 0,
  items: [],
  records: { distance: 0, coins: 0 }
};

function loadRecords() {
  try {
    const saved = localStorage.getItem('theGreatChaseRecords');
    if (!saved) {
      return;
    }

    const records = JSON.parse(saved);
    if (
      typeof records !== 'object' ||
      records === null ||
      !Number.isFinite(records.distance) ||
      !Number.isFinite(records.coins)
    ) {
      throw new Error('Saved game records have an invalid format.');
    }
    state.records = {
      distance: Math.max(0, Math.floor(records.distance)),
      coins: Math.max(0, Math.floor(records.coins))
    };
  } catch (error) {
    console.error('Could not load saved game records.', error);
  }
}

function saveRecords() {
  state.records.distance = Math.max(state.records.distance, Math.floor(state.distance));
  state.records.coins = Math.max(state.records.coins, state.coins);
  gameOverRecords.textContent =
    `Best distance: ${state.records.distance} m · Best coins: ${state.records.coins}`;

  try {
    localStorage.setItem('theGreatChaseRecords', JSON.stringify(state.records));
  } catch (error) {
    console.error('Could not save game records.', error);
  }
}

function showAssetError(message) {
  assetNotice.hidden = false;
  assetNotice.textContent = message;
  startButton.disabled = true;
}

function imageIsAvailable(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = path;
  });
}

function makeCharacterChoice(character, index) {
  const button = document.createElement('button');
  button.className = 'character-choice';
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');

  const image = document.createElement('img');
  image.src = character.image;
  image.alt = '';

  const name = document.createElement('strong');
  name.textContent = character.name;

  const description = document.createElement('span');
  description.textContent = character.description;

  button.append(image, name, description);
  button.addEventListener('click', () => selectCharacter(character, button));
  choicesContainer.append(button);

  if (index === 0) {
    selectCharacter(character, button);
  }
}

function selectCharacter(character, selectedButton) {
  state.character = character;
  runner.src = character.image;
  runner.alt = character.name;
  choicesContainer.querySelectorAll('.character-choice').forEach((button) => {
    button.setAttribute('aria-pressed', String(button === selectedButton));
  });
  if (state.phase === 'switching') {
    state.phase = 'running';
    startButton.hidden = false;
    startScreen.hidden = true;
    gameStatus.textContent = `${character.name} is chasing!`;
    state.lastFrame = performance.now();
    requestAnimationFrame(frame);
    return;
  }

  if (state.phase === 'running') {
    startScreen.hidden = true;
    gameStatus.textContent = `${character.name} is chasing!`;
    return;
  }

  if (state.phase === 'changingAfterGameOver') {
    state.phase = 'ready';
    startButton.hidden = false;
    startScreen.hidden = false;
    gameOverScreen.hidden = true;
    characterScreenTitle.textContent = 'Ready, set, chase!';
    characterScreenCopy.textContent = 'Choose a character, then jump over planes and grab the coins.';
  }
  updateStartAvailability();
}

async function updateStartAvailability() {
  const villainAvailable = await imageIsAvailable(state.gameData.villain.image);
  const runnerAvailable = state.character
    ? await imageIsAvailable(state.character.image)
    : false;

  if (!villainAvailable) {
    showAssetError(`Add ${state.gameData.villain.image} to this folder before starting the chase.`);
    return;
  }

  if (!runnerAvailable) {
    showAssetError(`The selected character image could not be loaded: ${state.character.image}`);
    return;
  }

  assetNotice.hidden = true;
  startButton.disabled = !state.character;
}

function loadGameData() {
  fetch('gamedata.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load gamedata.json (${response.status}).`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.characters) || data.characters.length === 0 || !data.villain?.image) {
        throw new Error('gamedata.json must define at least one character and a villain image.');
      }

      state.gameData = data;
      state.phase = 'ready';
      gameName.textContent = data.game.name;
      gameDescription.textContent = data.game.description;
      gameControls.textContent = `Controls: ${data.game.controls}.`;
      gameStatus.textContent = 'Choose your runner to begin.';
      villain.src = data.villain.image;
      villain.alt = data.villain.name;
      coinIcon.src = data.images.coin.image;
      coinIcon.alt = data.images.coin.description;
      data.characters.forEach(makeCharacterChoice);
      updateStartAvailability();
    })
    .catch((error) => {
      state.phase = 'error';
      gameStatus.textContent = 'The game could not be loaded.';
      assetNotice.hidden = false;
      assetNotice.textContent = error.message;
      startScreen.hidden = false;
    });
}

function jump() {
  if (state.phase !== 'running' || state.jumpHeight > 0) {
    return;
  }

  const gravity = 1900;
  const groundHeight = stage.clientHeight * 0.15;
  const availableHeight = Math.max(
    0,
    stage.clientHeight - runner.clientHeight - groundHeight - 8
  );
  const jumpLimit = Math.min(
    availableHeight,
    stage.clientHeight * (window.matchMedia('(max-width: 680px)').matches ? 0.3 : 0.44)
  );
  state.jumpVelocity = Math.sqrt(2 * gravity * jumpLimit);
}

function createItem(type) {
  const image = document.createElement('img');
  const itemData = type === 'obstacle'
    ? state.gameData.images.obstacle
    : state.gameData.images.coin;

  image.className = type;
  image.src = itemData.image;
  image.alt = itemData.description;
  image.draggable = false;

  const item = {
    type,
    element: image,
    x: stage.clientWidth + Math.random() * 110,
  };

  entities.append(image);
  state.items.push(item);
  positionItem(item);
}

function positionItem(item) {
  item.element.style.left = `${item.x}px`;
}

function overlaps(first, second, padding = 0) {
  const a = first.getBoundingClientRect();
  const b = second.getBoundingClientRect();

  return (
    a.left + padding < b.right - padding &&
    a.right - padding > b.left + padding &&
    a.top + padding < b.bottom - padding &&
    a.bottom - padding > b.top + padding
  );
}

function removeItem(item) {
  item.element.remove();
  state.items = state.items.filter((current) => current !== item);
}

function endGame() {
  state.phase = 'over';
  gameOverSummary.textContent =
    `You ran ${Math.floor(state.distance)} metres and collected ${state.coins} ${state.coins === 1 ? 'coin' : 'coins'}.`;
  saveRecords();
  gameStatus.textContent = 'Run ended. Try again!';
  gameOverScreen.hidden = false;
}

function update(delta) {
  state.elapsed += delta;
  state.distance += delta * state.speed / 10;
  state.speed = Math.min(650, 360 + state.elapsed * 9);
  state.obstacleTimer -= delta;
  state.coinTimer -= delta;

  if (state.obstacleTimer <= 0) {
    createItem('obstacle');
    state.obstacleTimer = 2.4 + Math.random() * 1.6;
  }

  if (state.coinTimer <= 0) {
    createItem('collectible');
    state.coinTimer = 1.8 + Math.random() * 1.8;
  }

  if (state.jumpHeight > 0 || state.jumpVelocity > 0) {
    state.jumpHeight += state.jumpVelocity * delta;
    state.jumpVelocity -= 1900 * delta;
    const groundHeight = stage.clientHeight * 0.15;
    const availableHeight = Math.max(
      0,
      stage.clientHeight - runner.clientHeight - groundHeight - 8
    );
    const jumpLimit = Math.min(
      availableHeight,
      stage.clientHeight * (window.matchMedia('(max-width: 680px)').matches ? 0.3 : 0.44)
    );
    if (state.jumpHeight > jumpLimit) {
      state.jumpHeight = jumpLimit;
      state.jumpVelocity = Math.min(0, state.jumpVelocity);
    }
    if (state.jumpHeight <= 0) {
      state.jumpHeight = 0;
      state.jumpVelocity = 0;
    }
    runner.style.bottom = `calc(15% + ${Math.max(0, state.jumpHeight)}px)`;
  }

  distanceCount.textContent = String(Math.floor(state.distance));

  for (const item of [...state.items]) {
    item.x -= state.speed * delta;
    positionItem(item);

    if (item.type === 'obstacle' && overlaps(runner, item.element, 14)) {
      endGame();
      return;
    }

    if (item.type === 'collectible' && state.jumpHeight === 0 && overlaps(runner, item.element, 8)) {
      state.coins += 1;
      coinCount.textContent = String(state.coins);
      removeItem(item);
      continue;
    }

    if (item.x < -120) {
      removeItem(item);
    }
  }
}

function frame(timestamp) {
  if (state.phase !== 'running') {
    return;
  }

  const delta = Math.min((timestamp - state.lastFrame) / 1000, 0.04);
  state.lastFrame = timestamp;
  update(delta);

  if (state.phase === 'running') {
    requestAnimationFrame(frame);
  }
}

function startGame() {
  if (!state.character || startButton.disabled) {
    return;
  }

  state.phase = 'running';
  state.lastFrame = performance.now();
  state.elapsed = 0;
  state.distance = 0;
  state.coins = 0;
  state.speed = 360;
  state.jumpHeight = 0;
  state.jumpVelocity = 0;
  state.obstacleTimer = 1.8 + Math.random() * 1.6;
  state.coinTimer = 1.6 + Math.random() * 1.8;
  state.items.forEach((item) => item.element.remove());
  state.items = [];
  runner.style.bottom = '15%';
  distanceCount.textContent = '0';
  coinCount.textContent = '0';
  gameStatus.textContent = 'Jump over the planes and collect the coins!';
  startButton.hidden = false;
  startScreen.hidden = true;
  gameOverScreen.hidden = true;
  requestAnimationFrame(frame);
}

function restartGame() {
  gameOverScreen.hidden = true;
  gameStatus.textContent = 'Ready for another chase?';
  startGame();
}

function openCharacterSelectorAfterGameOver() {
  if (state.phase !== 'over') {
    return;
  }

  state.phase = 'changingAfterGameOver';
  characterScreenTitle.textContent = 'Choose your runner';
  characterScreenCopy.textContent = 'Pick a character, then start a new chase.';
  startButton.hidden = true;
  startScreen.hidden = false;
  gameOverScreen.hidden = true;
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
gameOverChangeCharacterButton.addEventListener('click', openCharacterSelectorAfterGameOver);
stage.addEventListener('click', (event) => {
  if (event.target.closest('button, a, .screen-overlay')) {
    return;
  }

  jump();
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    jump();
  }
});

loadRecords();
loadGameData();
