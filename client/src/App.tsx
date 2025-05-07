import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import EventDetails from "@/pages/event-details";
import EventAttendance from "@/pages/event-attendance";
import Speakers from "@/pages/speakers";
import Users from "@/pages/users";
import Certificates from "@/pages/certificates";
import Profile from "@/pages/profile";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Allow accessing reset password page without authentication */}
      <Route path="/reset-password" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/events" component={Events} />
      <ProtectedRoute path="/events/:id" component={EventDetails} />
      <ProtectedRoute path="/events/:id/attend" component={EventAttendance} />
      <ProtectedRoute path="/speakers" component={Speakers} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/certificates" component={Certificates} />
      <ProtectedRoute path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
