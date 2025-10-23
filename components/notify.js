
function ensureContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {

        c = document.createElement("div");
        c.id = "toast-container";
        document.body.appendChild(c);
    }
    return c;
}

function removeToast(toast) {
    if (!toast) return;
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, { once: true });

    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
}

export function showToast(type = "info", message = "", duration = 3000) {
    const container = ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const text = document.createElement("div");
    text.className = "toast-text";
    text.textContent = message;

    const close = document.createElement("button");
    close.className = "close-btn";
    close.type = "button";
    close.innerHTML = "✕";
    close.addEventListener("click", () => removeToast(toast));

    toast.appendChild(text);
    toast.appendChild(close);
    container.appendChild(toast);

    // show (trigger transition)
    requestAnimationFrame(() => toast.classList.add("show"));

    const t = setTimeout(() => {
        removeToast(toast);
        clearTimeout(t);
    }, duration);

    return {
        dismiss: () => removeToast(toast)
    };
}

export const toast = {
    success(msg, dur) { return showToast("success", msg, dur); },
    info(msg, dur) { return showToast("info", msg, dur); },
    error(msg, dur) { return showToast("error", msg, dur); }
};