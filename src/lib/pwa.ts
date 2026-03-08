export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const isProd = import.meta.env.PROD;

  if (!isProd || isLocalhost) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("planer-diety-"))
            .forEach((key) => caches.delete(key));
        });
      }
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        const promptUpdate = () => {
          if (!registration.waiting) return;
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        };

        promptUpdate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate();
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      })
      .catch((err) => {
        console.error("Rejestracja SW nieudana", err);
      });
  });
}
