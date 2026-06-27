import "./shared/lib/i18n";
import i18next from "i18next";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Providers } from "./app/providers";
import { App } from "./app/App";
import { loadSettings } from "./features/settings/settings.service";

async function init() {
  try {
    const settings = await loadSettings();
    if (settings.language) {
      await i18next.changeLanguage(settings.language);
    }
  } catch {
    // use OS-detected language
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Providers>
        <App />
      </Providers>
    </React.StrictMode>
  );
}

init();
