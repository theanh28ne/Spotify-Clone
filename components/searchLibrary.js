import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";

// Lưu trạng thái search
let isSearching = false;
let searchQuery = "";
let allLibraryItems = []; // Cache tất cả items

/**
 * Khởi tạo chức năng search library
 */
export function initSearchLibrary() {
  const searchBtn = document.querySelector(".search-library-btn");
  const libraryHeader = document.querySelector(".library-header");
  
  if (!searchBtn || !libraryHeader) return;

  // Click vào search button
  searchBtn.addEventListener("click", () => {
    toggleSearchMode();
  });

  console.log("✅ Search library đã được khởi tạo");
}

/**
 * Bật/tắt chế độ search
 */
function toggleSearchMode() {
  const searchBtn = document.querySelector(".search-library-btn");
  const libraryHeader = document.querySelector(".library-header");
  
  if (!isSearching) {
    // Bật search mode
    isSearching = true;
    searchBtn.classList.add("active");
    
    // Tạo search input
    const searchInput = createSearchInput();
    libraryHeader.appendChild(searchInput);
    
    // Focus vào input
    setTimeout(() => searchInput.focus(), 100);
    
  } else {
    // Tắt search mode
    exitSearchMode();
  }
}

/**
 * Tạo search input element
 */
function createSearchInput() {
  const searchContainer = document.createElement("div");
  searchContainer.className = "library-search-container";
  searchContainer.innerHTML = `
    <div class="library-search-input">
      <i class="fas fa-search"></i>
      <input 
        type="text" 
        placeholder="Search in your library..." 
        class="library-search-field"
        autocomplete="off"
      />
      <button class="library-search-clear" style="display: none;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  const input = searchContainer.querySelector(".library-search-field");
  const clearBtn = searchContainer.querySelector(".library-search-clear");

  // Xử lý input
  input.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    searchQuery = query;
    
    // Show/hide clear button
    clearBtn.style.display = query ? "flex" : "none";
    
    // Thực hiện search
    performSearch(query);
  });

  // Xử lý clear button
  clearBtn.addEventListener("click", () => {
    input.value = "";
    searchQuery = "";
    clearBtn.style.display = "none";
    performSearch("");
    input.focus();
  });

  // Xử lý ESC key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      exitSearchMode();
    }
  });

  return searchContainer;
}

/**
 * Thoát search mode
 */
function exitSearchMode() {
  isSearching = false;
  searchQuery = "";
  
  const searchBtn = document.querySelector(".search-library-btn");
  const searchContainer = document.querySelector(".library-search-container");
  
  if (searchBtn) searchBtn.classList.remove("active");
  if (searchContainer) searchContainer.remove();
  
  // Clear search results và hiển thị lại tất cả items
  const container = document.querySelector(".library-content");
  if (container) {
    restoreAllItems(container);
  }
}

/**
 * Thực hiện search
 */
async function performSearch(query) {
  const container = document.querySelector(".library-content");
  if (!container) return;

  // Nếu query rỗng, hiển thị lại tất cả
  if (!query) {
    restoreAllItems(container);
    return;
  }

  // Lấy tất cả items hiện tại nếu chưa có
  if (allLibraryItems.length === 0) {
    allLibraryItems = Array.from(container.querySelectorAll(".library-item"));
  }

  // Filter items theo query
  const lowerQuery = query.toLowerCase();
  const matchedItems = [];
  const unmatchedItems = [];

  allLibraryItems.forEach(item => {
    const title = item.querySelector(".item-title")?.textContent?.toLowerCase() || "";
    const subtitle = item.querySelector(".item-subtitle")?.textContent?.toLowerCase() || "";
    
    if (title.includes(lowerQuery) || subtitle.includes(lowerQuery)) {
      matchedItems.push(item);
    } else {
      unmatchedItems.push(item);
    }
  });

  // Hiển thị kết quả
  container.innerHTML = "";
  
  if (matchedItems.length === 0) {
    container.innerHTML = `
      <div class="search-no-results">
        <i class="fas fa-search"></i>
        <p>No results found for "${query}"</p>
      </div>
    `;
  } else {
    matchedItems.forEach(item => {
      container.appendChild(item.cloneNode(true));
    });
    
    // Thêm search info
    const searchInfo = document.createElement("div");
    searchInfo.className = "search-info";
    searchInfo.textContent = `Found ${matchedItems.length} result${matchedItems.length !== 1 ? "s" : ""}`;
    container.insertBefore(searchInfo, container.firstChild);
  }
}

/**
 * Khôi phục tất cả items
 */
function restoreAllItems(container) {
  if (allLibraryItems.length === 0) return;
  
  container.innerHTML = "";
  
  // Remove search info nếu có
  const searchInfo = container.querySelector(".search-info");
  if (searchInfo) searchInfo.remove();
  
  // Append lại tất cả items
  allLibraryItems.forEach(item => {
    container.appendChild(item.cloneNode(true));
  });
}

/**
 * Clear cache khi library thay đổi (được gọi từ bên ngoài)
 */
export function clearSearchCache() {
  allLibraryItems = [];
  console.log("🗑️ Search cache cleared");
}

/**
 * Reset search state khi chuyển tab
 */
export function resetSearchOnTabChange() {
  if (isSearching) {
    exitSearchMode();
  }
  clearSearchCache();
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