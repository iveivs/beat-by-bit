import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    const serviceWorkerUrl = new URL("sw.js", baseUrl);
    serviceWorkerUrl.searchParams.set("v", import.meta.env.VITE_APP_VERSION);

    void navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: baseUrl.pathname })
      .catch(() => undefined);
  });
}
