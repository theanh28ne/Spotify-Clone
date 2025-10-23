// Generic context menu utility (singleton)
const MENU_ID = "app-context-menu";

function createMenu() {
    let menu = document.getElementById(MENU_ID);
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = MENU_ID;
    Object.assign(menu.style, {
        position: "fixed",
        minWidth: "160px",
        background: "#222",
        color: "#fff",
        borderRadius: "6px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
        padding: "6px 0",
        zIndex: "10000",
        display: "none",
        fontSize: "14px",
        overflow: "hidden",
    });
    document.body.appendChild(menu);

    document.addEventListener("click", (e) => {
        if (!e.target.closest(`#${MENU_ID}`)) hideMenu();
    });
    window.addEventListener("resize", hideMenu);
    window.addEventListener("scroll", hideMenu, { passive: true });
    return menu;
}

function renderItems(menu, items) {
    menu.innerHTML = "";
    items.forEach((it, idx) => {
        const div = document.createElement("div");
        div.className = "ctx-menu-item";
        div.dataset.idx = String(idx);
        div.style.padding = "8px 16px";
        div.style.cursor = "pointer";
        div.textContent = it.label || "";
        div.addEventListener("mouseenter", () => div.style.background = "rgba(255,255,255,0.04)");
        div.addEventListener("mouseleave", () => div.style.background = "transparent");
        menu.appendChild(div);
    });
}

function showMenuAt(menu, x, y) {
    const pad = 8;
    menu.style.display = "block";

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(pad, x), vw - rect.width - pad);
    const top = Math.min(Math.max(pad, y), vh - rect.height - pad);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function hideMenu() {
    const menu = document.getElementById(MENU_ID);
    if (menu) menu.style.display = "none";
}


export function attachContextMenu(selector, getItems, onSelect) {
    const menu = createMenu();

    async function onContext(e) {

        console.debug("[contextMenu] event contextmenu on", e.target);

        const target = e.target.closest(selector);
        if (!target) {

            const path = e.composedPath ? e.composedPath() : (e.path || []);
            const found = path.find(node => node && node.matches && node.matches && node.matches(selector));
            if (!found) {

                return;
            }

            e.preventDefault();
            try { e.stopImmediatePropagation(); } catch (err) { }
            console.debug("[contextMenu] matched via composedPath", found);

        } else {

            e.preventDefault();
            try { e.stopImmediatePropagation(); } catch (err) { }
            console.debug("[contextMenu] matched via closest", target);
        }


        const actualTarget = e.target.closest(selector) || (e.composedPath ? e.composedPath().find(n => n && n.matches && n.matches(selector)) : null);
        if (!actualTarget) return;

        const items = getItems(actualTarget);
        if (!items || !items.length) return;

        renderItems(menu, items);
        showMenuAt(menu, e.clientX, e.clientY);

        const handler = async (clickEvent) => {
            const itemEl = clickEvent.target.closest(".ctx-menu-item");
            if (!itemEl) return;
            const idx = Number(itemEl.dataset.idx || -1);
            const item = items[idx];
            hideMenu();
            try { await onSelect(item?.action, item?.data, actualTarget); } catch (err) { console.error("contextMenu onSelect error:", err); }
        };

        menu.addEventListener("click", handler, { once: true });
    }


    document.addEventListener("contextmenu", onContext, true);
    return function detach() {
        document.removeEventListener("contextmenu", onContext, true);
        hideMenu();
    };
}