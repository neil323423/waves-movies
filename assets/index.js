const API_KEY="0e33c92186263620ce8c7f6b8fb35b00"
const API_URL="https://api.themoviedb.org/3"
const IMAGE_BASE_URL="https://image.tmdb.org/t/p/w500"
const FALLBACK_IMAGE_URL="https://dummyimage.com/200x300/333/fff.png&text=No+Cover"
const searchInput=document.getElementById("search")
const resultsContainer=document.querySelector(".results")
const searchInfo=document.getElementById("search-info")
const loadMoreBtn=document.getElementById("loadMoreBtn")
const endMessage=document.getElementById("endMessage")
const popularContainer=document.querySelector(".popular-movies")
const topRatedContainer=document.querySelector(".top-rated-movies")
const upcomingContainer=document.querySelector(".upcoming-movies")
const favoritesContainer=document.querySelector(".favorites-movies")
const recommendationsContainer=document.querySelector(".recommendations")
const otherSections=document.getElementById("other-sections")
const searchResultsSection=document.getElementById("search-results")
const overlay=document.getElementById("overlay")
const closeBtn=document.getElementById("close-btn")
const loadingScreen=document.getElementById("loading")
const noMoviesMessage=document.getElementById("no-movies")
let searchAbortController=null
let currentSearchQuery=""
let currentPage=1
let totalPages=1
let searchDisplayedCount=0

async function fetchMovies(url,container,showLoading=true,signal,requestedQuery="",append=false,onComplete=null){
  if(showLoading) loadingScreen.style.display="flex"
  try {
    const response = await fetch(url,{signal})
    const data = await response.json()
    if(container===resultsContainer && currentSearchQuery!==requestedQuery) return
    if(requestedQuery){
      totalPages = data.total_pages
      searchDisplayedCount = append ? searchDisplayedCount + data.results.length : data.results.length
      updateSearchInfo(searchDisplayedCount,data.total_results)
      if(currentPage < totalPages){
        loadMoreBtn.style.display="block"
        endMessage.style.display="none"
      } else {
        loadMoreBtn.style.display="none"
        endMessage.style.display="block"
      }
    }
    if(container===resultsContainer){
      noMoviesMessage.style.display = data.results.length===0 && !append ? "block" : "none"
      updateContainerWithAnimation(container,()=>displayMovies(data.results,container,append))
    } else {
      updateContainerWithAnimation(container,()=>displayMovies(data.results,container,append))
    }
    if(typeof onComplete==="function") onComplete(data.results)
  } catch(error) {
    if(error.name!=="AbortError") alert("Failed to fetch movies.")
  } finally {
    loadingScreen.style.display="none"
  }
}

function updateContainerWithAnimation(container,updateCallback){
  container.style.opacity=0
  setTimeout(()=>{
    updateCallback()
    container.style.opacity=1
  },300)
}

function displayMovies(movies,container,append=false){
  if(!append) container.innerHTML=""
  movies.forEach(movie=>{
    const movieDiv=document.createElement("div")
    movieDiv.classList.add("movie")
    const movieImage=document.createElement("img")
    movieImage.src=movie.poster_path?`${IMAGE_BASE_URL}${movie.poster_path}`:FALLBACK_IMAGE_URL
    movieImage.onerror=function(){
      this.onerror=null
      this.src=FALLBACK_IMAGE_URL
    }
    const movieInfo=document.createElement("div")
    movieInfo.classList.add("movie-info")
    const movieTitle=document.createElement("h3")
    movieTitle.textContent=movie.title
    const movieRating=document.createElement("div")
    movieRating.classList.add("rating")
    movieRating.textContent=`⭐ ${movie.vote_average.toFixed(1)}`
    movieInfo.appendChild(movieTitle)
    movieInfo.appendChild(movieRating)
    movieDiv.appendChild(movieImage)
    movieDiv.appendChild(movieInfo)
    const favoriteIcon=document.createElement("i")
    favoriteIcon.classList.add("fas","fa-heart","favorite-icon")
    if(isFavorite(movie.id)) favoriteIcon.classList.add("favorited")
    favoriteIcon.addEventListener("click",e=>{
      e.stopPropagation()
      toggleFavorite(movie,favoriteIcon)
    })
    movieDiv.appendChild(favoriteIcon)
    container.appendChild(movieDiv)
    movieDiv.addEventListener("click",()=>show(movie.title,movie.overview,movie.id))
  })
}

function updateSearchInfo(displayedCount,totalCount){
  if(currentSearchQuery){
    searchInfo.textContent=`Showing ${displayedCount} of ${totalCount} result${totalCount!==1?"s":""} for "${currentSearchQuery}"`
  } else {
    searchInfo.textContent=""
  }
}

function show(title, overview, movieId) {
  overlay.classList.add("show");
  document.getElementById("movie-title").textContent = title;
  const container = document.createElement("span");
  const truncated = overview.substring(0, 150) + "... ";
  const textWrapper = document.createElement("span");
  const textNode = document.createTextNode(truncated);
  textWrapper.appendChild(textNode);
  textWrapper.style.transition = "opacity 0.3s";
  container.appendChild(textWrapper);

  if (overview.length > 150) {
    const toggle = document.createElement("span");
    toggle.textContent = "Read more";
    toggle.style.color = "#fff";
    toggle.style.cursor = "pointer";
    toggle.style.borderBottom = "1px solid transparent";
    toggle.style.transition = "border-bottom-color 0.2s";

    toggle.addEventListener("mouseover", () => {
      toggle.style.borderBottomColor = "#fff";
    });
    toggle.addEventListener("mouseout", () => {
      toggle.style.borderBottomColor = "transparent";
    });
    toggle.addEventListener("click", () => {
      const isCollapsed = toggle.textContent === "Read more";
      textWrapper.style.opacity = "0";
      setTimeout(() => {
        textNode.nodeValue = isCollapsed ? overview + " " : truncated;
        toggle.textContent = isCollapsed ? "Show less" : "Read more";
        textWrapper.style.opacity = "1";
      }, 300);
    });

    container.appendChild(toggle);
  }

  document.getElementById("player").src = `https://player.vidsrc.co/embed/movie/${movieId}?server=2`;
  updateRecentlyWatched(movieId);
}

overlay.addEventListener("click", e => {
  if (e.target === overlay) {
    overlay.classList.remove("show");
    document.getElementById("player").src = "";
  }
});

closeBtn.addEventListener("click",()=>{
  overlay.classList.remove("show")
  document.getElementById("player").src=""
})

function performSearch(resetPage=true){
  const query=searchInput.value.trim()
  currentSearchQuery=query
  if(resetPage){
    currentPage=1
    searchDisplayedCount=0
  }
  if(searchAbortController) searchAbortController.abort()
  searchAbortController=new AbortController()
  if(query===""){
    searchResultsSection.style.display="none"
    otherSections.style.display="block"
  } else {
    searchResultsSection.style.display="block"
    otherSections.style.display="none"
    if(resetPage){
      resultsContainer.innerHTML=""
      noMoviesMessage.style.display="none"
      updateSearchInfo(0,0)
      endMessage.style.display="none"
    }
    fetchMovies(
      `${API_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`,
      resultsContainer,
      false,
      searchAbortController.signal,
      query,
      !resetPage
    )
  }
}

searchInput.addEventListener("input",()=>performSearch(true))
loadMoreBtn.addEventListener("click",()=>{
  if(currentPage<totalPages){
    currentPage++
    performSearch(false)
  }
})

fetchMovies(`${API_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`,popularContainer)
fetchMovies(`${API_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`,topRatedContainer)
fetchMovies(`${API_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=1`,upcomingContainer)

function getFavorites(){
  return JSON.parse(localStorage.getItem("favoriteMovies"))||{}
}

function saveFavorites(favorites){
  localStorage.setItem("favoriteMovies",JSON.stringify(favorites))
}

function isFavorite(movieId){
  const favorites=getFavorites()
  return favorites.hasOwnProperty(movieId)
}

function toggleFavorite(movie,iconElement){
  const favorites=getFavorites()
  const isInFavoritesSection=iconElement.closest('#favorites')!==null
  if(isFavorite(movie.id)){
    delete favorites[movie.id]
    iconElement.classList.replace("favorited","fa-heart-broken")
    iconElement.style.animation="heartFallApart 0.6s ease"
    iconElement.addEventListener("animationend",()=>{
      iconElement.classList.replace("fa-heart-broken","fa-heart")
      iconElement.style.animation=""
      if(isInFavoritesSection) loadFavorites()
    },{once:true})
  } else {
    favorites[movie.id]=movie
    iconElement.classList.add("favorited")
    iconElement.style.animation="pop 0.4s ease"
    iconElement.addEventListener("animationend",()=>iconElement.style.animation="",{once:true})
  }
  saveFavorites(favorites)
  if(!isInFavoritesSection) loadFavorites()
}

function loadFavorites(){
  const favorites=getFavorites()
  const movies=Object.values(favorites)
  const favoritesSection=document.getElementById("favorites")
  favoritesSection.style.display=movies.length>0?"block":"none"
  updateContainerWithAnimation(favoritesContainer,()=>displayMovies(movies,favoritesContainer,false))
}

function updateRecentlyWatched(movieId){
  let watched=JSON.parse(localStorage.getItem("recentlyWatched"))||[]
  watched=watched.filter(id=>id!==movieId)
  watched.push(movieId)
  if(watched.length>5) watched.shift()
  localStorage.setItem("recentlyWatched",JSON.stringify(watched))
  updateRecommendations()
}

function updateRecommendations(){
  let watched=JSON.parse(localStorage.getItem("recentlyWatched"))||[]
  const recommendationsSection=document.getElementById("recommendations")
  if(watched.length>0){
    const lastWatchedId=watched[watched.length-1]
    fetchMovies(
      `${API_URL}/movie/${lastWatchedId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`,
      recommendationsContainer,
      false,
      null,
      "",
      false,
      results=>{
        recommendationsSection.style.display=results.length>0?"block":"none"
      }
    )
  } else {
    recommendationsSection.style.display="none"
    recommendationsContainer.innerHTML=""
  }
}

loadFavorites()
updateRecommendations()

const initSliders=()=>{
  document.querySelectorAll('.slider-container').forEach(container=>{
    const track=container.querySelector('.slider-track')
    const prev=container.querySelector('.slider-btn.prev')
    const next=container.querySelector('.slider-btn.next')
    let index=0, direction=1, slideWidth=0
    const update=()=>{
      const items=track.children
      const visible=Math.floor(container.offsetWidth/slideWidth)
      const maxIndex=items.length-visible
      index=Math.max(0,Math.min(index,maxIndex))
      track.style.transform=`translateX(${-index*slideWidth}px)`
    }
    const setup=()=>{
      const items=track.children
      if(!items.length) return
      slideWidth=items[0].getBoundingClientRect().width+parseInt(getComputedStyle(track).gap)
      prev.onclick=()=>{ index--; update() }
      next.onclick=()=>{ index++; update() }
      update()
      setInterval(()=>{
        const visible=Math.floor(container.offsetWidth/slideWidth)
        const maxIndex=track.children.length-visible
        if(index>=maxIndex) direction=-1
        if(index<=0) direction=1
        index+=direction
        update()
      },3000)
      observer.disconnect()
    }
    const observer=new MutationObserver(setup)
    observer.observe(track,{childList:true})
    setup()
  })
}

initSliders()