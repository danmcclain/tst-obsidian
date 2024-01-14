document.addEventListener("DOMContentLoaded", async () => {
  const settings = await browser.storage.local.get(["vaultName", "note"]);
  if (settings.vaultName) {
    document.getElementById("vault")!.value = settings.vaultName;
  }
  const notePath = settings.note || "FirefoxExport";
  document.getElementById("note")!.value = notePath;

  document
    .getElementById("settings")!
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const vaultName = document.getElementById("vault")!.value;
      const note = document.getElementById("note")!.value;
      await browser.storage.local.set({ vaultName, note });
    });

  document
    .getElementById("resetClose")!
    .addEventListener("click", async (event) => {
      event.preventDefault();
      await browser.storage.local.set({ autoClose: false });
    });
});
