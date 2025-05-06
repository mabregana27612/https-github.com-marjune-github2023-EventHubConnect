import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Redirect based on user role
    if (user) {
      if (user.role === 'admin' || user.role === 'speaker') {
        setLocation('/dashboard');
      } else {
        setLocation('/events'); // Regular users go to events
      }
    }
  }, [user, setLocation]);

  return null; // This component just redirects, so no UI is needed
}
