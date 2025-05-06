import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title
document.title = "EventPro - Event Management Platform";

// Add meta description
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'EventPro - A comprehensive event management platform for organizing events, managing speakers, tracking attendance, and generating certificates.';
document.head.appendChild(metaDescription);

createRoot(document.getElementById("root")!).render(<App />);
