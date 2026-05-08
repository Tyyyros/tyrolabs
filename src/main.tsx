import ReactDOM from "react-dom/client";
import App from "./App";
import { CaptureOverlay } from "./components/overlays/CaptureOverlay";
import { I18nProvider } from "./lib/i18n";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;

if (window.location.pathname === "/capture") {
  document.documentElement.classList.add("capture-mode");
  ReactDOM.createRoot(root).render(
    <I18nProvider>
      <CaptureOverlay />
    </I18nProvider>,
  );
} else {
  ReactDOM.createRoot(root).render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}
