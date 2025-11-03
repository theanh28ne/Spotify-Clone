let isModalOpen = false;
let sortBtn = null;
let sortModal = null;
let sortItems = null;
let viewButtons = null;

// Khởi tạo và lấy ra các element cần thiết
function initSortUI() {
  sortBtn = document.querySelector(".sort-btn");
  sortModal = document.querySelector(".sort-modal");
  
  if (!sortBtn || !sortModal) return;

  // Lấy ra các item sort và view buttons để xử lý sau
  sortItems = Array.from(sortModal.querySelectorAll(".sort-modal-item")); 
  viewButtons = Array.from(sortModal.querySelectorAll(".sort-modal-icon-btn"));

  // Toggle modal khi click button
  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isModalOpen = !isModalOpen;
    sortModal.hidden = !isModalOpen;
  });

  // Đóng modal khi click outside
  document.addEventListener("click", (e) => {
    if (isModalOpen && !sortModal.contains(e.target)) {
      isModalOpen = false;
      sortModal.hidden = true;
    }
  });

  // Đóng modal khi ấn ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isModalOpen) {
      isModalOpen = false; 
      sortModal.hidden = true;
    }
  });
}

// Khởi tạo khi DOM ready
document.addEventListener("DOMContentLoaded", initSortUI);

// Export các elements để module khác có thể sử dụng
export { sortItems, viewButtons, sortModal };