import httpRequest from "../utils/httpRequest.js";

export function updateAuthUI() {
    const authButtons = document.querySelector(".auth-buttons");
    const userMenu = document.querySelector(".user-menu");
    const accessToken = localStorage.getItem("accessToken");

    if (authButtons) authButtons.style.display = accessToken ? "none" : "flex";
    if (userMenu) userMenu.style.display = accessToken ? "flex" : "none";
}

export async function fetchAndRenderUser() {
    if (!httpRequest.token) return;
    const userNameEl = document.getElementById("userName");
    try {
        const { user } = await httpRequest.get("users/me");
        if (userNameEl) userNameEl.textContent = user.email ? user.email.split("@")[0] : "User";
        updateAuthUI();
    } catch (err) {
        if (err.response?.status === 401) {
            localStorage.removeItem("accessToken");
            updateAuthUI();
        }
    }
}

export function initAuthUI() {
    const logoutBtn = document.getElementById("logoutBtn");
    updateAuthUI();
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("accessToken");
            httpRequest.setToken(null);
            updateAuthUI();
        });
    }
}

export function initAuthModal() {
    const authModal = document.getElementById("authModal");
    const modalClose = document.getElementById("modalClose");
    const signupBtn = document.querySelector(".signup-btn");
    const loginBtn = document.querySelector(".login-btn");
    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showSignupBtn = document.getElementById("showSignup");

    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");

    function showSignupForm() {
        if (signupForm) signupForm.style.display = "block";
        if (loginForm) loginForm.style.display = "none";
    }
    function showLoginForm() {
        if (signupForm) signupForm.style.display = "none";
        if (loginForm) loginForm.style.display = "block";
    }

    if (signupBtn) signupBtn.addEventListener("click", () => { showSignupForm(); if (authModal) authModal.classList.add("show"); });
    if (loginBtn) loginBtn.addEventListener("click", () => { showLoginForm(); if (authModal) authModal.classList.add("show"); });
    if (modalClose && authModal) modalClose.addEventListener("click", () => authModal.classList.remove("show"));
    if (authModal) {
        authModal.addEventListener("click", (e) => { if (e.target === authModal) authModal.classList.remove("show"); });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && authModal && authModal.classList.contains("show")) authModal.classList.remove("show");
    });
    if (showLoginBtn) showLoginBtn.addEventListener("click", showLoginForm);
    if (showSignupBtn) showSignupBtn.addEventListener("click", showSignupForm);

    function showError(group, errorBox, message) {
        if (!errorBox) return;
        const span = errorBox.querySelector("span");
        if (span) span.textContent = message;
        errorBox.style.display = "flex";
        if (group) group.classList.add("invalid");
    }
    function hideError(input) {
        if (!input) return;
        const group = input.closest(".form-group");
        if (!group) return;
        group.classList.remove("invalid");
        const err = group.querySelector(".error-message");
        if (err) err.style.display = "none";
    }
    function resetErrors(inputs) { (inputs || []).forEach(hideError); }

    // Signup submit
    if (signupForm) {
        const signupContent = signupForm.querySelector(".auth-form-content");
        if (signupContent) {
            signupContent.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = signupEmail?.value.trim();
                const password = signupPassword?.value.trim();
                const credentials = { email, password };

                const emailGroup = signupEmail?.closest(".form-group");
                const passwordGroup = signupPassword?.closest(".form-group");
                const emailError = emailGroup?.querySelector(".error-message");
                const passwordError = passwordGroup?.querySelector(".error-message");

                resetErrors([signupEmail, signupPassword]);

                try {
                    const { user, access_token } = await httpRequest.post("auth/register", credentials);
                    httpRequest.setToken(access_token);
                    updateAuthUI();
                    fetchAndRenderUser();
                    if (authModal) authModal.classList.remove("show");
                } catch (error) {
                    const resError = error.response?.error;
                    if (resError?.code === "VALIDATION_ERROR" && Array.isArray(resError.details)) {
                        resError.details.forEach(({ field, message }) => {
                            if (field === "email") showError(emailGroup, emailError, message);
                            if (field === "password") showError(passwordGroup, passwordError, message);
                        });
                        return;
                    }
                    if (resError?.code === "EMAIL_EXISTS") {
                        showError(emailGroup, emailError, resError.message);
                        return;
                    }
                }
            });
        }
    }

    // Login submit
    if (loginForm) {
        const loginContent = loginForm.querySelector(".auth-form-content");
        if (loginContent) {
            loginContent.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = loginEmail?.value.trim();
                const password = loginPassword?.value.trim();
                const credentials = { email, password };

                const emailGroup = loginEmail?.closest(".form-group");
                const passwordGroup = loginPassword?.closest(".form-group");
                const emailError = emailGroup?.querySelector(".error-message");
                const passwordError = passwordGroup?.querySelector(".error-message");

                resetErrors([loginEmail, loginPassword]);

                try {
                    const { user, access_token } = await httpRequest.post("auth/login", credentials);
                    httpRequest.setToken(access_token);
                    updateAuthUI();
                    fetchAndRenderUser();
                    if (authModal) authModal.classList.remove("show");
                } catch (error) {
                    const resError = error.response?.error;
                    if (resError?.code === "INVALID_CREDENTIALS") {
                        showError(emailGroup, emailError, resError.message);
                        showError(passwordGroup, passwordError, resError.message);
                        return;
                    }
                }
            });
        }
    }

    // hide errors on input
    [signupEmail, signupPassword, loginEmail, loginPassword].forEach((input) => {
        if (input) input.addEventListener("input", () => hideError(input));
    });
}

export function initUserMenu() {
    const userAvatar = document.getElementById("userAvatar");
    const userDropdown = document.getElementById("userDropdown");
    if (!userAvatar || !userDropdown) return;

    userAvatar.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove("show");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") userDropdown.classList.remove("show");
    });
}