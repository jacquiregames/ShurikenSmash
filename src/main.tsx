import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/bangers";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/700.css";
// Fallback for the kanji and kana that Bangers and Rajdhani lack (Kunai Bullseye).
import "@fontsource/zen-kaku-gothic-new/japanese-400.css";
import "@fontsource/zen-kaku-gothic-new/japanese-700.css";
import App from "./app/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
