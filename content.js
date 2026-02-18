const mq = window.matchMedia("(prefers-color-scheme: dark)");

function updateTheme() {
  chrome.storage.local.set({ theme: mq.matches ? "dark" : "light" });
}

updateTheme();
mq.addEventListener("change", updateTheme);
