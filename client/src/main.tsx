import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // You might want to add some basic CSS here
import { LoggerNames, LogLevel, setLogLevel } from "livekit-client";

Object.values(LoggerNames).forEach((name) => setLogLevel(LogLevel.debug, name));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
