import ReactDOM from "react-dom/client";
import App from "./App";
import { CaptureOverlay } from "./components/overlays/CaptureOverlay";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;

if (window.location.pathname === "/capture") {
  ReactDOM.createRoot(root).render(<CaptureOverlay />);
} else {
  ReactDOM.createRoot(root).render(<App />);
}
