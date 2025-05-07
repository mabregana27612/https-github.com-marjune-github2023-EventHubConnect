import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";

// Set page title
document.title = "EventPro - Event Management Platform";

// Add meta description
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'EventPro - A comprehensive event management platform for organizing events, managing speakers, tracking attendance, and generating certificates.';
document.head.appendChild(metaDescription);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  </QueryClientProvider>
);
