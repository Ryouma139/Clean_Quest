import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { ConfirmProvider } from "./components/ConfirmDialog";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AuthProvider>
  </StrictMode>,
);
