// API and DOM Variables
const API_KEY = "0e33c92186263620ce8c7f6b8fb35b00";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const FALLBACK_IMAGE_URL = "https://dummyimage.com/200x300/333/fff.png&text=No+Cover";

const searchInput = document.getElementById("search");
const resultsContainer = document.querySelector(".results");
const searchInfo = document.getElementById("search-info");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const endMessage = document.getElementById("endMessage");
const popularContainer = document.querySelector(".popular-movies");
const topRatedContainer = document.querySelector(".top-rated-movies");
const upcomingContainer = document.querySelector(".upcoming-movies");
const favoritesContainer = document.querySelector(".favorites-movies");
const recommendationsContainer = document.querySelector(".recommendations");

const otherSections = document.getElementById("other-sections");
const searchResultsSection = document.getElementById("search-results");
const modalOverlay = document.getElementById("modal-overlay");
const closeBtn = document.getElementById("close-btn");
const loadingScreen = document.getElementById("loading");
const noMoviesMessage = document.getElementById("no-movies");
const fixedSearch = document.querySelector(".fixed-search");

let searchAbortController = null;
let currentSearchQuery = "";
let currentPage = 1;
let totalPages = 1;
let searchDisplayedCount = 0; 

/**
 * Updated fetchMovies accepts an optional callback (onComplete) that receives the fetched results.
 */
async function fetchMovies(url, container, showLoading = true, signal, requestedQuery = "", append = false, onComplete = null) {
  if (showLoading) loadingScreen.style.display = "flex";
  try {
    const response = await fetch(url, { signal });
    const data = await response.json();
    // Only update search results if the query matches.
    if (container === resultsContainer && currentSearchQuery !== requestedQuery) return;
    
    // (For search results only) Update pagination and “no results” messaging.
    if (requestedQuery) {
      totalPages = data.total_pages;
      if (append) {
        searchDisplayedCount += data.results.length;
      } else {
        searchDisplayedCount = data.results.length;
      }
      updateSearchInfo(searchDisplayedCount, data.total_results);
      if (currentPage < totalPages) {
        loadMoreBtn.style.display = "block";
        endMessage.style.display = "none";
      } else {
        loadMoreBtn.style.display = "none";
        endMessage.style.display = data.results.length ? "block" : "none";
      }
    }
    
    // For the search results container, show/hide the "no movies" message.
    if (container === resultsContainer) {
      if (data.results.length === 0 && !append) {
        noMoviesMessage.style.display = "block";
      } else {
        noMoviesMessage.style.display = "none";
        updateContainerWithAnimation(container, () => {
          displayMovies(data.results, container, append);
        });
      }
    } else {
      // For other containers (favorites, recommendations, etc.)
      updateContainerWithAnimation(container, () => {
        displayMovies(data.results, container, append);
      });
    }
    
    // If a callback was provided, pass the results back.
    if (typeof onComplete === "function") {
      onComplete(data.results);
    }
  } catch (error) {
    if (error.name !== "AbortError") alert("Failed to fetch movies.");
  } finally {
    loadingScreen.style.display = "none";
  }
}

function updateContainerWithAnimation(container, updateCallback) {
  container.style.opacity = 0;
  setTimeout(() => {
    updateCallback();
    container.style.opacity = 1;
  }, 300);
}

// Modified displayMovies function that appends a favorite icon to each movie card.
function displayMovies(movies, container, append = false) {
  if (!append) container.innerHTML = "";
  movies.forEach((movie) => {
    const movieDiv = document.createElement("div");
    movieDiv.classList.add("movie");

    const movieImage = document.createElement("img");
    movieImage.src = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : FALLBACK_IMAGE_URL;
    movieImage.onerror = function () {
      this.onerror = null;
      this.src = FALLBACK_IMAGE_URL;
    };

    const movieInfo = document.createElement("div");
    movieInfo.classList.add("movie-info");

    const movieTitle = document.createElement("h3");
    movieTitle.textContent = movie.title;

    const movieRating = document.createElement("div");
    movieRating.classList.add("rating");
    movieRating.textContent = `⭐ ${movie.vote_average.toFixed(1)}`;

    movieInfo.appendChild(movieTitle);
    movieInfo.appendChild(movieRating);

    movieDiv.appendChild(movieImage);
    movieDiv.appendChild(movieInfo);

    // Append favorite icon (heart) with click animation.
    const favoriteIcon = document.createElement("i");
    favoriteIcon.classList.add("fas", "fa-heart", "favorite-icon");
    if (isFavorite(movie.id)) {
      favoriteIcon.classList.add("favorited");
    }
    favoriteIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(movie, favoriteIcon);
    });
    movieDiv.appendChild(favoriteIcon);

    container.appendChild(movieDiv);

    // Clicking on the movie card opens the modal and marks it as watched.
    movieDiv.addEventListener("click", () => {
      showModal(movie.title, movie.overview, movie.id);
    });
  });
}

function updateSearchInfo(displayedCount, totalCount) {
  if (currentSearchQuery) {
    searchInfo.textContent = `Showing ${displayedCount} of ${totalCount} result${totalCount !== 1 ? "s" : ""} for "${currentSearchQuery}"`;
  } else {
    searchInfo.textContent = "";
  }
}

// Modal display function – now also updates recently watched movies.
function showModal(title, overview, movieId) {
  const MAX_OVERVIEW_LENGTH = 150;
  modalOverlay.classList.add("show");
  document.getElementById("movie-title").textContent = title;
  const detailsElem = document.getElementById("movie-details");
  detailsElem.innerHTML = "";
  const textContainer = document.createElement("span");
  if (overview.length > MAX_OVERVIEW_LENGTH) {
    const truncatedText = overview.substring(0, MAX_OVERVIEW_LENGTH);
    textContainer.textContent = truncatedText + "... ";
    const readMoreLink = document.createElement("span");
    readMoreLink.textContent = "Read more";
    readMoreLink.style.color = "#fff";
    readMoreLink.style.cursor = "pointer";
    readMoreLink.style.textDecoration = "underline";
    readMoreLink.addEventListener("click", () => {
      if (readMoreLink.textContent === "Read more") {
        textContainer.textContent = overview + " ";
        readMoreLink.textContent = "Show less";
        textContainer.appendChild(readMoreLink);
      } else {
        textContainer.textContent = truncatedText + "... ";
        readMoreLink.textContent = "Read more";
        textContainer.appendChild(readMoreLink);
      }
    });
    textContainer.appendChild(readMoreLink);
  } else {
    textContainer.textContent = overview;
  }
  detailsElem.appendChild(textContainer);
  const iframe = document.getElementById("player");
  iframe.src = `https://www.vidlink.pro/movie/${movieId}?autoplay=true`;

  // Update the list of recently watched movies and refresh recommendations.
  updateRecentlyWatched(movieId);
}

closeBtn.addEventListener("click", () => {
  modalOverlay.classList.remove("show");
  document.getElementById("player").src = "";
});

// Search function
function performSearch(resetPage = true) {
  const query = searchInput.value.trim();
  currentSearchQuery = query;
  if (resetPage) {
    currentPage = 1;
    searchDisplayedCount = 0;
  }
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();
  if (query === "") {
    searchResultsSection.style.display = "none";
    otherSections.style.display = "block";
  } else {
    searchResultsSection.style.display = "block";
    otherSections.style.display = "none";
    if (resetPage) {
      resultsContainer.innerHTML = "";
      noMoviesMessage.style.display = "none";
      updateSearchInfo(0, 0);
      endMessage.style.display = "none";
    }
    fetchMovies(
      `${API_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`,
      resultsContainer,
      false,
      searchAbortController.signal,
      query,
      !resetPage
    );
  }
}

searchInput.addEventListener("input", () => {
  performSearch(true);
});

loadMoreBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    performSearch(false);
  }
});

// Fetch default categories
fetchMovies(`${API_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`, popularContainer);
fetchMovies(`${API_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`, topRatedContainer);
fetchMovies(`${API_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=1`, upcomingContainer);

// Scroll and sticky search
const scrollTopBtn = document.getElementById("scrollTopBtn");
const scrollTopThreshold = 300;
const stickyThreshold = 140;
window.addEventListener("scroll", () => {
  if (window.pageYOffset > scrollTopThreshold) {
    scrollTopBtn.style.display = "block";
  } else {
    scrollTopBtn.style.display = "none";
  }
  if (window.pageYOffset > stickyThreshold) {
    fixedSearch.classList.add("sticky");
  } else {
    fixedSearch.classList.remove("sticky");
  }
});
scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

/* -------------------------------
   FAVORITES & RECOMMENDATIONS
----------------------------------*/

// Favorites: Helpers for localStorage
function getFavorites() {
  return JSON.parse(localStorage.getItem("favoriteMovies")) || {};
}

function saveFavorites(favorites) {
  localStorage.setItem("favoriteMovies", JSON.stringify(favorites));
}

function isFavorite(movieId) {
  const favorites = getFavorites();
  return favorites.hasOwnProperty(movieId);
}

function toggleFavorite(movie, iconElement) {
  const favorites = getFavorites();
  const isInFavoritesSection = iconElement.closest('#favorites') !== null;

  if (isFavorite(movie.id)) {
    // Unfavorite: remove the movie from favorites.
    delete favorites[movie.id];
    
    // Change the heart icon to the broken heart and play the animation.
    iconElement.classList.remove("favorited");
    iconElement.classList.remove("fa-heart");
    iconElement.classList.add("fa-heart-broken");
    iconElement.style.animation = "heartFallApart 0.6s ease";

    // After animation finishes, reset the heart icon.
    iconElement.addEventListener("animationend", () => {
      iconElement.classList.remove("fa-heart-broken");
      iconElement.classList.add("fa-heart");
      iconElement.style.animation = "";

      // If the unfavorite was in the Favorites section, reload the list
      if (isInFavoritesSection) {
        loadFavorites(); // Re-render favorites
      }
    }, { once: true });

  } else {
    // Favorite: add the movie to favorites.
    favorites[movie.id] = movie;
    iconElement.classList.add("favorited");
    
    // Play the pop animation.
    iconElement.style.animation = "pop 0.4s ease";
    iconElement.addEventListener("animationend", () => {
      iconElement.style.animation = "";
    }, { once: true });
  }

  // Save the updated favorites to localStorage
  saveFavorites(favorites);

  // If the action was in the normal section, update the favorites container
  if (!isInFavoritesSection) {
    loadFavorites();  // Re-render the Favorites container
  }
}

function loadFavorites() {
  const favorites = getFavorites();
  const movies = Object.values(favorites);
  const favoritesSection = document.getElementById("favorites");
  // Only show the Favorites section if there are movies.
  if (movies.length > 0) {
    favoritesSection.style.display = "block";
  } else {
    favoritesSection.style.display = "none";
  }
  updateContainerWithAnimation(favoritesContainer, () => {
    displayMovies(movies, favoritesContainer, false);
  });
}

// Recommendations: Update recently watched movies list
function updateRecentlyWatched(movieId) {
  let watched = JSON.parse(localStorage.getItem("recentlyWatched")) || [];
  // Remove the movie if it already exists so it can be re-added at the end.
  watched = watched.filter(id => id !== movieId);
  watched.push(movieId);
  if (watched.length > 5) {
    watched.shift(); // Limit to the 5 most recent movies
  }
  localStorage.setItem("recentlyWatched", JSON.stringify(watched));
  updateRecommendations();
}

// Fetch recommendations based on the most recently watched movie.
function updateRecommendations() {
  let watched = JSON.parse(localStorage.getItem("recentlyWatched")) || [];
  const recommendationsSection = document.getElementById("recommendations");
  if (watched.length > 0) {
    const lastWatchedId = watched[watched.length - 1];
    fetchMovies(
      `${API_URL}/movie/${lastWatchedId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`,
      recommendationsContainer,
      false,
      null,
      "", // requestedQuery is not used here.
      false,
      (results) => {
        // Only show the Recommendations section if there are results.
        if (results && results.length > 0) {
          recommendationsSection.style.display = "block";
        } else {
          recommendationsSection.style.display = "none";
        }
      }
    );
  } else {
    recommendationsSection.style.display = "none";
    recommendationsContainer.innerHTML = "";
  }
}

// Initialize favorites and recommendations on page load.
loadFavorites();
updateRecommendations();
