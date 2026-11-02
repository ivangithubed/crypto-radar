import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Шрифти дизайн-системи (UX §9.2) у складі сайту, без запитів до Google (NFR-10, CSP).
// CSS ваг @fontsource має unicode-range: браузер завантажує лише підмножини, потрібні тексту (кирилиця, латиниця).
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/unbounded/600.css";
import "./index.css";
import App from "./app/App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
