const DEEZER_API = "https://api.allorigins.win/raw?url=";
const DEEZER_BASE = "https://api.deezer.com";
const genreMapping = {
  pop: 132,
  rock: 152,
  hiphop: 116,
  electronic: 106,
  jazz: 129,
  classical: 98,
  country: 144,
  rnb: 165,
};

let currentSongs = [];
let currentIndex = 0;
let selectedGenres = [];
const likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];
let currentAudio = null;
let audioTimeout = null;

// DOM Elements
const genreScreen = document.getElementById("genreScreen");
const mainScreen = document.getElementById("mainScreen");
const likedScreen = document.getElementById("likedScreen");
const genreButtons = document.querySelectorAll(".genre-btn");
const startBtn = document.getElementById("startBtn");
const songCard = document.getElementById("songCard");
const likeBtn = document.getElementById("likeBtn");
const skipBtn = document.getElementById("skipBtn");
const likedBtn = document.getElementById("likedBtn");
const backBtn = document.getElementById("backBtn");
const likedList = document.getElementById("likedList");
const loadingEl = document.getElementById("loading");

// Genre selection
genreButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const genre = btn.dataset.genre;
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter((g) => g !== genre);
      btn.classList.remove("active");
    } else {
      selectedGenres.push(genre);
      btn.classList.add("active");
    }
    startBtn.disabled = selectedGenres.length === 0;
  });
});

// Start button
startBtn.addEventListener("click", async () => {
  if (selectedGenres.length > 0) {
    genreScreen.classList.remove("active");
    mainScreen.classList.add("active");
    await loadSongs();
  }
});

// Load songs from Deezer
async function loadSongs() {
  loadingEl.classList.remove("hidden");
  currentSongs = [];
  try {
    for (const genre of selectedGenres) {
      const genreId = genreMapping[genre];
      const artistsUrl = `${DEEZER_API}${encodeURIComponent(`${DEEZER_BASE}/genre/${genreId}/artists`)}`;
      const artistsRes = await fetch(artistsUrl);
      const artistsData = await artistsRes.json();
      if (!artistsData.data) continue;

      for (const artist of artistsData.data.slice(0, 5)) { // sadece ilk 5 artist
        const topTracksUrl = `${DEEZER_API}${encodeURIComponent(`${DEEZER_BASE}/artist/${artist.id}/top?limit=5`)}`;
        const tracksRes = await fetch(topTracksUrl);
        const tracksData = await tracksRes.json();
        if (!tracksData.data) continue;

        const tracksWithPreview = tracksData.data.filter((track) => track.preview);
        const mappedTracks = tracksWithPreview.map((track) => ({
          id: track.id,
          title: track.title,
          artist: { name: track.artist.name },
          album: {
            title: track.album.title,
            cover_medium: track.album.cover_medium,
            cover_big: track.album.cover_big,
            cover_xl: track.album.cover_xl,
          },
          preview: track.preview,
        }));

        currentSongs.push(...mappedTracks);
      }
    }

    // Shuffle
    currentSongs = currentSongs.sort(() => Math.random() - 0.5);

    if (currentSongs.length > 0) {
      currentIndex = 0;
      displayCurrentSong();
    } else {
      alert("Hiç şarkı bulunamadı. Lütfen başka bir genre seçin.");
    }
  } catch (e) {
    console.error(e);
    alert("Şarkılar yüklenirken hata oluştu.");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

// Display current song
function displayCurrentSong() {
  if (currentIndex >= currentSongs.length) {
    loadSongs();
    return;
  }
  const song = currentSongs[currentIndex];

  songCard.innerHTML = `
    <div class="song-image">
      <img src="${song.album.cover_xl || song.album.cover_big || song.album.cover_medium}" alt="${song.title}">
    </div>
    <div class="song-info">
      <h2 class="song-title">${song.title}</h2>
      <p class="song-artist">${song.artist.name}</p>
      <p class="song-album">${song.album.title}</p>
    </div>
  `;
  playPreview(song.preview);
}

// Play 15s preview
function playPreview(previewUrl) {
  if (currentAudio) currentAudio.pause();
  if (audioTimeout) clearTimeout(audioTimeout);

  currentAudio = new Audio(previewUrl);
  currentAudio.volume = 0.5;
  currentAudio.play();

  audioTimeout = setTimeout(() => {
    if (currentAudio) currentAudio.pause();
  }, 15000);
}

// Like & Skip
likeBtn.addEventListener("click", () => {
  const song = currentSongs[currentIndex];
  if (!likedSongs.find((s) => s.id === song.id)) {
    likedSongs.push({
      id: song.id,
      title: song.title,
      artist: song.artist.name,
      album: song.album.title,
      cover: song.album.cover_medium,
      preview: song.preview,
    });
    localStorage.setItem("likedSongs", JSON.stringify(likedSongs));
  }
  nextSong();
});

skipBtn.addEventListener("click", nextSong);

function nextSong() {
  currentIndex++;
  displayCurrentSong();
}

// Liked Songs screen
likedBtn.addEventListener("click", () => {
  mainScreen.classList.remove("active");
  likedScreen.classList.add("active");
  displayLikedSongs();
});
backBtn.addEventListener("click", () => {
  likedScreen.classList.remove("active");
  mainScreen.classList.add("active");
});

function displayLikedSongs() {
  if (likedSongs.length === 0) {
    likedList.innerHTML = '<p class="empty-message">Du har ikke likt noen sanger ennå</p>';
    return;
  }

  likedList.innerHTML = likedSongs
    .map(
      (song) => `
      <div class="liked-song-item">
        <img src="${song.cover}" alt="${song.title}">
        <div class="liked-song-info">
          <h3>${song.title}</h3>
          <p>${song.artist}</p>
        </div>
        <button class="play-liked-btn" onclick="playPreview('${song.preview}')">▶</button>
      </div>
    `
    )
    .join("");
}

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (!mainScreen.classList.contains("active")) return;
  if (e.key === "ArrowRight") likeBtn.click();
  else if (e.key === "ArrowLeft") skipBtn.click();
});
