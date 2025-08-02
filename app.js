const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
  hazardSpaces: {
    "3x5": true,
    "3x6": true,
    "3x7": true,
  }
};

const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

const coinTypes = [
  { type: "bronze", value: 1 },
  { type: "silver", value: 3 },
  { type: "gold", value: 5 }
];

const emotes = [
  { key: "1", emoji: "😀", name: "smile" },
  { key: "2", emoji: "😎", name: "cool" },
  { key: "3", emoji: "😡", name: "angry" }
];

function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function isHazard(x,y) {
  return mapData.hazardSpaces[getKeyString(x, y)] || false;
}

function getRandomSafeSpot() {
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}


(function () {

  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};
  let playerLastActivity = {};
  let playerEmotes = {};
  let hazardDamageIntervals = {};
  let leaderboardRef;
  let chatRef;

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.classList.add("leaderboard-container");
  leaderboardContainer.innerHTML = `
    <h3>Top Players</h3>
    <ul class="leaderboard-list"></ul>
  `;
  document.body.appendChild(leaderboardContainer);
  
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");
  chatContainer.innerHTML = `
    <div class="chat-messages"></div>
    <div class="chat-input-container">
      <input type="text" class="chat-input" placeholder="Type a message...">
      <button class="chat-send-button">Send</button>
    </div>
  `;
  document.body.appendChild(chatContainer);
  
  const chatMessages = chatContainer.querySelector(".chat-messages");
  const chatInput = chatContainer.querySelector(".chat-input");
  const chatSendButton = chatContainer.querySelector(".chat-send-button");


  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinType = randomFromArray(coinTypes);
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
      type: coinType.type,
      value: coinType.value
    })

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      const coinValue = coins[key].value || 1;
      
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + coinValue,
      });
      
      playSoundEffect('coin');
    }
  }
  
  function playSoundEffect(type) {
    // TODO: Implement sound effects
    console.log(`Playing sound effect: ${type}`);
  }
  
  function showEmote(playerId, emoteKey) {
    const emote = emotes.find(e => e.key === emoteKey);
    if (!emote || !players[playerId]) return;
    
    if (!playerEmotes[playerId]) {
      const emoteEl = document.createElement("div");
      emoteEl.classList.add("Character_emote");
      playerElements[playerId].appendChild(emoteEl);
      playerEmotes[playerId] = emoteEl;
    }
    
    playerEmotes[playerId].innerText = emote.emoji;
    playerEmotes[playerId].classList.add("active");
    
    playSoundEffect('emote');
    
    setTimeout(() => {
      if (playerEmotes[playerId]) {
        playerEmotes[playerId].classList.remove("active");
      }
    }, 2000);
  }
  
  function updatePlayerActivity(playerId) {
    playerLastActivity[playerId] = Date.now();
    
    if (playerElements[playerId] && playerElements[playerId].classList.contains("idle")) {
      playerElements[playerId].classList.remove("idle");
    }
  }
  
  function checkPlayerIdle() {
    const now = Date.now();
    Object.keys(players).forEach(id => {
      if (playerLastActivity[id] && now - playerLastActivity[id] > 10000) {
        if (playerElements[id] && !playerElements[id].classList.contains("idle")) {
          playerElements[id].classList.add("idle");
        }
      }
    });
  }
  
  function applyHazardDamage(playerId) {
    if (!players[playerId]) return;
    
    const playerRef = firebase.database().ref(`players/${playerId}`);
    const newHealth = Math.max(0, players[playerId].health - 10);
    
    playerRef.update({ health: newHealth });
    
    if (newHealth === 0) {
      handlePlayerDeath(playerId);
    }
  }
  
  function handlePlayerDeath(playerId) {
    playSoundEffect('death');
    
    const { x, y } = getRandomSafeSpot();
    
    firebase.database().ref(`players/${playerId}`).update({
      health: 100,
      coins: 0,
      x,
      y
    });
  }
  
  function checkHazards() {
    if (players[playerId]) {
      const key = getKeyString(players[playerId].x, players[playerId].y);
      
      if (mapData.hazardSpaces[key]) {
        if (!hazardDamageIntervals[playerId]) {
          applyHazardDamage(playerId);
          
          hazardDamageIntervals[playerId] = setInterval(() => {
            applyHazardDamage(playerId);
          }, 1000);
        }
      } else {
        if (hazardDamageIntervals[playerId]) {
          clearInterval(hazardDamageIntervals[playerId]);
          hazardDamageIntervals[playerId] = null;
        }
      }
    }
  }
  
  function updateLeaderboard() {
    const leaderboardList = document.querySelector(".leaderboard-list");
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = "";
    
    const sortedPlayers = Object.values(players)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 5);
    
    sortedPlayers.forEach(player => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span class="leaderboard-name">${player.name}</span>
        <span class="leaderboard-coins">${player.coins}</span>
      `;
      
      if (player.id === playerId) {
        listItem.classList.add("current-player");
      }
      
      leaderboardList.appendChild(listItem);
    });
  }
  
  function sendChatMessage() {
    if (!chatInput.value.trim() || !players[playerId]) return;
    
    const message = chatInput.value.trim();
    chatInput.value = "";
    
    chatRef.push({
      playerId: playerId,
      playerName: players[playerId].name,
      message: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  function displayChatMessage(message) {
    const messageEl = document.createElement("div");
    messageEl.classList.add("chat-message");
    
    if (message.playerId === playerId) {
      messageEl.classList.add("own-message");
    }
    
    messageEl.innerHTML = `
      <span class="chat-player-name">${message.playerName}:</span>
      <span class="chat-message-text">${message.message}</span>
    `;
    
    chatMessages.appendChild(messageEl);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }


  function handleArrowPress(xChange=0, yChange=0) {
    const player = players[playerId];
    if (!player) {
      console.warn("Player data is undefined or not loaded yet");
      return;
    }
    
    const newX = player.x + xChange;
    const newY = player.y + yChange;
    
    if (!isSolid(newX, newY)) {
      player.x = newX;
      player.y = newY;
      if (xChange === 1) player.direction = "right";
      if (xChange === -1) player.direction = "left";

      playerRef.set(player);
      attemptGrabCoin(newX, newY);
      
      updatePlayerActivity(playerId);
      
      checkHazards();
    }
  }


  function renderHazardZones() {
    const existingHazards = document.querySelectorAll('.hazard-zone');
    existingHazards.forEach(hazard => hazard.remove());
    
    Object.keys(mapData.hazardSpaces).forEach(key => {
      const [x, y] = key.split('x').map(Number);
      
      const hazardElement = document.createElement('div');
      hazardElement.classList.add('hazard-zone', 'grid-cell');
      
      const left = 16 * x + 'px';
      const top = 16 * y - 4 + 'px';
      hazardElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      
      gameContainer.appendChild(hazardElement);
    });
  }
  
  function initGame() {
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))
    
    emotes.forEach(emote => {
      new KeyPressListener(emote.key, () => {
        showEmote(playerId, emote.key);
        updatePlayerActivity(playerId);
      });
    })
    
    renderHazardZones();

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);
    leaderboardRef = firebase.database().ref(`players`);
    chatRef = firebase.database().ref(`chat`);

    allPlayersRef.on("value", (snapshot) => {
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        if (!el) return;
        
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        
        const healthBar = el.querySelector(".Character_health-bar-fill");
        if (healthBar && characterState.health !== undefined) {
          healthBar.style.width = `${characterState.health}%`;
          
          if (characterState.health < 30) {
            healthBar.classList.add("low-health");
          } else {
            healthBar.classList.remove("low-health");
          }
        }
        
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      });
      
      updateLeaderboard();
    })
    allPlayersRef.on("child_added", (snapshot) => {
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_health-container">
          <div class="Character_health-bar">
            <div class="Character_health-bar-fill"></div>
          </div>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;

      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      
      const healthBar = characterElement.querySelector(".Character_health-bar-fill");
      if (healthBar) {
        const health = addedPlayer.health !== undefined ? addedPlayer.health : 100;
        healthBar.style.width = `${health}%`;
        
        if (health < 30) {
          healthBar.classList.add("low-health");
        }
      }
      
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
      
      playerLastActivity[addedPlayer.id] = Date.now();
    })


    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    })

    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = coin;

      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      
      if (coin.type) {
        coinElement.classList.add(`Coin--${coin.type}`);
      }
      
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( coinElements[keyToRemove] );
      delete coinElements[keyToRemove];
    })


    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName
      })
    })

    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor
      })
    })

    placeCoin();
    
    chatSendButton.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendChatMessage();
      }
    });
    
    chatRef.on("child_added", (snapshot) => {
      const message = snapshot.val();
      displayChatMessage(message);
    });
    
    setInterval(checkPlayerIdle, 1000);
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user)
    if (user) {
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();

      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
        health: 100,
      })

      playerRef.onDisconnect().remove();

      initGame();
    } else {
      
    }
  })

  firebase.auth().signInAnonymously().catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode, errorMessage);
  });


})();
