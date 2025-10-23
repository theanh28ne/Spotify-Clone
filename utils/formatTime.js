export const toMMSS = (sec = 0) => {
    if (typeof sec !== "number" || !isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = String(Math.floor(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
};