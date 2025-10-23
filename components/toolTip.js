// Lightweight tooltip manager used directly from index.html
(function () {
    const audio = document.querySelector("#audio");

    // create tooltip element
    const tip = document.createElement("div");
    tip.id = "app-tooltip";
    Object.assign(tip.style, {
        position: "fixed",
        padding: "6px 10px",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "13px",
        pointerEvents: "none",
        zIndex: 10000,
        transition: "opacity 120ms ease, transform 120ms ease",
        opacity: "0",
        transform: "translateY(6px)",
        whiteSpace: "nowrap",
    });
    document.body.appendChild(tip);

    let showTimer = 0;
    let hideTimer = 0;

    function getIconClass(el, cls) {
        return !!el.querySelector(`i.${cls}`);
    }

    function getTooltipText(el) {
        if (!el) return null;
        if (el.classList.contains("create-btn")) return "Create playlist";
        if (el.classList.contains("add-btn")) return "Add to Liked Songs";


        if (getIconClass(el, "fa-random")) {
            return el.classList.contains("active") ? "Disable shuffle" : "Shuffle";
        }
        if (getIconClass(el, "fa-step-backward")) return "Previous";
        if (getIconClass(el, "fa-step-forward")) return "Next";
        if (getIconClass(el, "fa-redo")) {
            return el.classList.contains("active") ? "Disable repeat" : "Repeat";
        }
        if (getIconClass(el, "fa-volume-mute") || getIconClass(el, "fa-volume-down") || getIconClass(el, "fa-volume-up")) {

            const isMuted = getIconClass(el, "fa-volume-mute") || (audio && audio.muted);
            return isMuted ? "Unmute" : "Mute";
        }

        if (el.classList.contains("play-btn")) {
            const isPlaying = audio ? !audio.paused && !audio.ended : el.querySelector("i.fa-pause");
            return isPlaying ? "Pause" : "Play";
        }
        return null;
    }

    function positionTooltip(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pad = 8;
        tip.style.left = `${Math.min(Math.max(pad, rect.left + rect.width / 2 - tip.offsetWidth / 2), window.innerWidth - tip.offsetWidth - pad)}px`;

        const above = rect.top - 10 - tip.offsetHeight > 0;
        tip.style.top = above ? `${rect.top - 8 - tip.offsetHeight}px` : `${rect.bottom + 8}px`;
    }

    function show(el) {
        const text = getTooltipText(el);
        if (!text) return;
        clearTimeout(hideTimer);
        showTimer = setTimeout(() => {
            tip.textContent = text;
            tip.style.opacity = "0";
            tip.style.transform = "translateY(6px)";
            tip.style.display = "block";

            requestAnimationFrame(() => {
                positionTooltip(el);
                tip.style.opacity = "1";
                tip.style.transform = "translateY(0)";
            });
        }, 250);
    }

    function hide() {
        clearTimeout(showTimer);
        hideTimer = setTimeout(() => {
            tip.style.opacity = "0";
            tip.style.transform = "translateY(6px)";
            setTimeout(() => (tip.style.display = "none"), 140);
        }, 80);
    }


    document.addEventListener("mouseover", (e) => {
        const btn = e.target.closest(".create-btn, .add-btn, .control-btn, .play-btn");
        if (!btn) return;
        show(btn);
    });

    document.addEventListener("mouseout", (e) => {
        const btn = e.target.closest(".create-btn, .add-btn, .control-btn, .play-btn");
        if (!btn) return;

        if (!e.relatedTarget || !btn.contains(e.relatedTarget)) hide();
    });


    document.addEventListener("focusin", (e) => {
        const btn = e.target.closest(".create-btn, .add-btn, .control-btn, .play-btn");
        if (!btn) return;
        show(btn);
    });
    document.addEventListener("focusout", (e) => {
        const btn = e.target.closest(".create-btn, .add-btn, .control-btn, .play-btn");
        if (!btn) return;
        hide();
    });


    function refreshIfVisible() {
        if (tip.style.display === "none" || tip.style.opacity === "0") return;

        const hovered = document.querySelector(":hover");
        const btn = hovered ? hovered.closest(".create-btn, .add-btn, .control-btn, .play-btn") : null;
        if (btn) {
            tip.textContent = getTooltipText(btn) || "";
            positionTooltip(btn);
        }
    }


    audio?.addEventListener("play", refreshIfVisible);
    audio?.addEventListener("pause", refreshIfVisible);


    const obs = new MutationObserver(refreshIfVisible);
    const controlButtons = Array.from(document.querySelectorAll(".control-btn, .play-btn"));
    controlButtons.forEach(b => obs.observe(b, { attributes: true, attributeFilter: ["class"] }));


    window.addEventListener("unload", () => {
        obs.disconnect();
        tip.remove();
    });
})();