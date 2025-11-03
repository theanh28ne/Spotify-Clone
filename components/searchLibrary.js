import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";

// Library search helper — toggles a search input in the sidebar and filters .library-item in real time.

let isSearching = false;
let searchDebounce = null;
let cacheItems = null;
let currentQuery = "";

/**
 * Khởi tạo chức năng search library
 */
export function initSearchLibrary() {
  // delegated click so button works even if rendered later
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".search-library-btn");
    if (!btn) return;
    // toggle
    if (!isSearching) {
      const container = document.querySelector(".search-library");
      if (!container) return;
      const inputEl = createSearchInput();
      container.insertBefore(inputEl, container.querySelector(".sort-btn"));
      // focus field
      setTimeout(() => inputEl.querySelector(".library-search-field")?.focus(), 50);
      btn.classList.add("active");
      isSearching = true;
      ensureCache();
    } else {
      exitSearchMode();
    }
  });

  // Hide / reset when clicking other nav tabs
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".nav-tab");
    if (!tab) return;
    resetSearchOnTabChange();
  });

  // If library updates externally, refresh cache and refilter
  document.addEventListener("library:updated", () => {
    clearSearchCache();
    if (isSearching && currentQuery) {
      ensureCache();
      performSearch(currentQuery);
    }
  });

  // keyboard ESC global to close if open
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isSearching) exitSearchMode();
  });

  console.log("✅ Search library đã được khởi tạo (delegated)");
}

// make toggleSearchMode robust (query header lazily)
function toggleSearchMode() {
  const searchBtn = document.querySelector(".search-library-btn");
  const libraryHeader = document.querySelector(".library-header");
  if (!searchBtn || !libraryHeader) return;

  if (!isSearching) {
    isSearching = true;
    searchBtn.classList.add("active");
    const searchInput = createSearchInput();
    libraryHeader.appendChild(searchInput);
    setTimeout(() => searchInput.querySelector(".library-search-field")?.focus(), 100);
  } else {
    exitSearchMode();
  }
}

/**
 * Tạo search input element
 */
function createSearchInput() {
  const wrapper = document.createElement("div");
  wrapper.className = "library-search-wrapper";
  Object.assign(wrapper.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px",
  });

  const input = document.createElement("input");
  input.type = "search";
  input.className = "library-search-field";
  input.placeholder = "Search your library...";
  Object.assign(input.style, {
    flex: "1",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "inherit"
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "library-search-clear-btn";
  clearBtn.innerHTML = "&times;";
  Object.assign(clearBtn.style, {
    background: "transparent",
    border: "none",
    color: "inherit",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px"
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    input.focus();
    performSearch("");
  });

  input.addEventListener("input", (e) => {
    const q = (e.target.value || "").trim();
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => performSearch(q), 180);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") exitSearchMode();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  return wrapper;
}

function ensureCache() {
  const container = document.querySelector(".library-content");
  if (!container) return [];
  // cache actual DOM nodes for quick access
  cacheItems = Array.from(container.querySelectorAll(".library-item"));
  return cacheItems;
}

/**
 * Clear cache khi library thay đổi (được gọi từ bên ngoài)
 */
export function clearSearchCache() {
  cacheItems = null;
  console.log("🗑️ Search cache cleared");
}

/**
 * Reset search state khi chuyển tab
 */
export function resetSearchOnTabChange() {
  // when switching tabs, remove search input and restore full list
  if (!isSearching) return;
  exitSearchMode();
}

function exitSearchMode() {
  const wrapper = document.querySelector(".library-search-wrapper");
  if (wrapper) wrapper.remove();
  const btn = document.querySelector(".search-library-btn");
  if (btn) btn.classList.remove("active");
  isSearching = false;
  currentQuery = "";
  clearSearchCache();
  // show all items
  const items = Array.from(document.querySelectorAll(".library-content .library-item"));
  items.forEach(i => i.style.display = "");
}

function performSearch(q) {
  currentQuery = (q || "").toLowerCase();
  const items = cacheItems || ensureCache();
  if (!items) return;
  if (!currentQuery) {
    items.forEach(i => i.style.display = "");
    return;
  }
  items.forEach(i => {
    const titleEl = i.querySelector(".item-title, .track-name, .artist-card-name, .hit-card-title");
    const text = (titleEl?.textContent || "").toLowerCase();
    if (text.includes(currentQuery)) i.style.display = "";
    else i.style.display = "none";
  });
}

// Expose utility to programmatically search (if needed)
export function searchLibrary(query) {
  if (!isSearching) {
    // open search UI first
    const btn = document.querySelector(".search-library-btn");
    btn?.click();
  }
  const input = document.querySelector(".library-search-field");
  if (input) {
    input.value = query || "";
    performSearch(input.value.trim());
  }
}

// CSS cần thêm vào stylesheet
const styles = `
.library-search-container {
  width: 100%;
  margin-top: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.library-search-input {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  transition: background 0.2s;
}

.library-search-input:focus-within {
  background: rgba(255, 255, 255, 0.15);
}

.library-search-input i.fa-search {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.library-search-field {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: white;
  font-size: 14px;
  font-family: inherit;
}

.library-search-field::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.library-search-clear {
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.library-search-clear:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.search-library-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #1db954;
}

.search-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.search-no-results i {
  font-size: 48px;
  opacity: 0.3;
}

.search-no-results p {
  font-size: 16px;
  margin: 0;
}

.search-info {
  padding: 8px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
}
`;

// Export styles để có thể inject vào document
export const searchLibraryStyles = styles;