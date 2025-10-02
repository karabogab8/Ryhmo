// Spotify API Configuration
const SPOTIFY_CLIENT_ID = "DIN_SPOTIFY_CLIENT_ID" // Buraya kendi Client ID'nizi ekleyin
const SPOTIFY_CLIENT_SECRET = "DIN_SPOTIFY_CLIENT_SECRET" // Buraya kendi Client Secret'ınızı ekleyin

let spotifyAccessToken = null

// Deezer API Configuration
const DEEZER_API = "https://api.allorigins.win/raw?url="
const DEEZER_BASE = "https://api.deezer.com"

const genreMapping = {
  pop: "pop",
  rock: "rock",
  hiphop: "hip-hop",
  electronic: "electronic",
  jazz: "jazz",
  classical: "classical",
  country: "country",
  rnb: "r-n-b",
}

let currentSongs = []
let currentIndex = 0
let selectedGenres = []
const likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || []
let currentAudio = null
let audioTimeout = null

// DOM Elements
const genreScreen = document.getElementById("genreScreen")
const mainScreen = document.getElementById("mainScreen")
const likedScreen = document.getElementById("likedScreen")
const genreButtons = document.querySelectorAll(".genre-btn")
const startBtn = document.getElementById("startBtn")
const songCard = document.getElementById("songCard")
const likeBtn = document.getElementById("likeBtn")
const skipBtn = document.getElementById("skipBtn")
const likedBtn = document.getElementById("likedBtn")
const backBtn = document.getElementById("backBtn")
const likedList = document.getElementById("likedList")
const loadingEl = document.getElementById("loading")

// Genre Selection
genreButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const genre = btn.dataset.genre
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter((g) => g !== genre)
      btn.classList.remove("active")
    } else {
      selectedGenres.push(genre)
      btn.classList.add("active")
    }
    startBtn.disabled = selectedGenres.length === 0
  })
})

// Start Button
startBtn.addEventListener("click", async () => {
  if (selectedGenres.length > 0) {
    genreScreen.classList.remove("active")
    mainScreen.classList.add("active")
    await loadSongs()
  }
})

// Spotify authentication function
async function getSpotifyToken() {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
      },
      body: "grant_type=client_credentials",
    })

    const data = await response.json()
    spotifyAccessToken = data.access_token
    return spotifyAccessToken
  } catch (error) {
    console.error("Spotify authentication error:", error)
    return null
  }
}

// Load Songs using Spotify API
async function loadSongs() {
  loadingEl.classList.remove("hidden")
  currentSongs = []

  try {
    // Get Spotify access token if not available
    if (!spotifyAccessToken) {
      await getSpotifyToken()
    }

    if (!spotifyAccessToken) {
      alert("Spotify API bağlantısı kurulamadı. Lütfen API anahtarlarınızı kontrol edin.")
      return
    }

    for (const genre of selectedGenres) {
      const genreName = genreMapping[genre]

      // Search for tracks by genre
      const searchUrl = `https://api.spotify.com/v1/search?q=genre:${genreName}&type=track&limit=50&market=NO`

      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
        },
      })

      if (response.status === 401) {
        // Token expired, get new one
        await getSpotifyToken()
        continue
      }

      const data = await response.json()

      if (data.tracks && data.tracks.items) {
        // Filter tracks that have preview URLs
        const tracksWithPreview = data.tracks.items.filter((track) => track.preview_url)

        // Map to our format
        const mappedTracks = tracksWithPreview.map((track) => ({
          id: track.id,
          title: track.name,
          artist: {
            name: track.artists[0].name,
          },
          album: {
            title: track.album.name,
            cover_medium: track.album.images[1]?.url || track.album.images[0]?.url,
            cover_big: track.album.images[0]?.url,
            cover_xl: track.album.images[0]?.url,
          },
          preview: track.preview_url,
        }))

        currentSongs.push(...mappedTracks)
      }
    }

    // Shuffle all songs
    currentSongs = currentSongs.sort(() => Math.random() - 0.5)

    if (currentSongs.length > 0) {
      currentIndex = 0
      displayCurrentSong()
    } else {
      alert("Ingen sanger funnet med forhåndsvisning. Prøv andre sjangre.")
    }
  } catch (error) {
    console.error("Error loading songs:", error)
    alert("Kunne ikke laste sanger. Prøv igjen senere.")
  } finally {
    loadingEl.classList.add("hidden")
  }
}

// Display Current Song
function displayCurrentSong() {
  if (currentIndex >= currentSongs.length) {
    loadSongs()
    return
  }

  const song = currentSongs[currentIndex]

  songCard.innerHTML = `
        <div class="song-image">
            <img src="${song.album.cover_xl || song.album.cover_big}" alt="${song.title}">
        </div>
        <div class="song-info">
            <h2 class="song-title">${song.title}</h2>
            <p class="song-artist">${song.artist.name}</p>
            <p class="song-album">${song.album.title}</p>
        </div>
    `

  playPreview(song.preview)
}

// Play 15-second Preview
function playPreview(previewUrl) {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  if (audioTimeout) {
    clearTimeout(audioTimeout)
  }

  const songImage = document.querySelector(".song-image")
  if (songImage) {
    songImage.classList.remove("paused")
  }

  currentAudio = new Audio(previewUrl)
  currentAudio.volume = 0.5
  currentAudio.play()

  // Stop after 15 seconds
  audioTimeout = setTimeout(() => {
    if (currentAudio) {
      currentAudio.pause()
      if (songImage) {
        songImage.classList.add("paused")
      }
    }
  }, 15000)

  // Pause animation when audio naturally ends
  currentAudio.addEventListener("ended", () => {
    if (songImage) {
      songImage.classList.add("paused")
    }
  })
}

// Like Button
likeBtn.addEventListener("click", () => {
  const song = currentSongs[currentIndex]

  if (!likedSongs.find((s) => s.id === song.id)) {
    likedSongs.push({
      id: song.id,
      title: song.title,
      artist: song.artist.name,
      album: song.album.title,
      cover: song.album.cover_medium,
      preview: song.preview,
    })
    localStorage.setItem("likedSongs", JSON.stringify(likedSongs))
  }

  animateCard("like")
  nextSong()
})

// Skip Button
skipBtn.addEventListener("click", () => {
  animateCard("skip")
  nextSong()
})

// Next Song
function nextSong() {
  currentIndex++
  setTimeout(() => {
    displayCurrentSong()
  }, 300)
}

// Animate Card
function animateCard(action) {
  const card = songCard
  if (action === "like") {
    card.style.transform = "translateX(150%) rotate(20deg)"
  } else {
    card.style.transform = "translateX(-150%) rotate(-20deg)"
  }

  setTimeout(() => {
    card.style.transform = "translateX(0) rotate(0)"
  }, 300)
}

// Liked Songs Screen
likedBtn.addEventListener("click", () => {
  mainScreen.classList.remove("active")
  likedScreen.classList.add("active")
  displayLikedSongs()
})

backBtn.addEventListener("click", () => {
  likedScreen.classList.remove("active")
  mainScreen.classList.add("active")
})

// Display Liked Songs
function displayLikedSongs() {
  if (likedSongs.length === 0) {
    likedList.innerHTML = '<p class="empty-message">Du har ikke likt noen sanger ennå</p>'
    return
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
            <button class="play-liked-btn" onclick="playLikedSong('${song.preview}')">
                ▶
            </button>
        </div>
    `,
    )
    .join("")
}

// Play Liked Song
function playLikedSong(previewUrl) {
  playPreview(previewUrl)
}

// Keyboard Controls
document.addEventListener("keydown", (e) => {
  if (!mainScreen.classList.contains("active")) return

  if (e.key === "ArrowRight") {
    likeBtn.click()
  } else if (e.key === "ArrowLeft") {
    skipBtn.click()
  }
})
