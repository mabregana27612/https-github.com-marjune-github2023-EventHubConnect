import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { User } from '@shared/schema';

interface FirebaseAuthContextProps {
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutFromFirebase: () => Promise<void>;
  linkAccountWithGoogle: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextProps | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Process authentication with server
  const handleAuthentication = async (user: FirebaseUser) => {
    try {
      console.log("Processing authentication for user:", user.email);
      // Send the Firebase ID token to your backend
      const idToken = await user.getIdToken(true);
      console.log("ID token obtained, proceeding with server auth");
      
      // Check if user is already authenticated with our server
      const isAuthenticated = queryClient.getQueryData(['/api/user']);
      
      if (isAuthenticated) {
        console.log("Existing user detected, linking account");
        // This is an account linking
        const res = await apiRequest('POST', '/api/auth/link-google', { idToken });
        
        if (res.ok) {
          // Invalidate the user query to refresh the user data
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: 'Account linked',
            description: 'Your account has been successfully linked with Google',
          });
          return true;
        } else {
          throw new Error('Failed to link your account');
        }
      } else {
        console.log("New sign-in, proceeding with authentication");
        // This is a sign in or registration
        const res = await apiRequest('POST', '/api/auth/google', { idToken });
        
        if (res.ok) {
          // Invalidate the user query to refresh the user data
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: 'Successfully signed in',
            description: 'You have successfully signed in with Google',
          });
          
          // Redirect to home page after successful login
          window.location.href = "/";
          return true;
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to authenticate with the server');
        }
      }
    } catch (error) {
      console.error("Server authentication error:", error);
      toast({
        title: 'Server authentication failed',
        description: error instanceof Error ? error.message : 'Failed to authenticate with the server',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Sign in with Google using popup
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google sign-in with popup");
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google sign-in successful");
      
      // Handle the signed-in user
      await handleAuthentication(result.user);
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      toast({
        title: 'Sign-in failed',
        description: error instanceof Error ? error.message : 'An error occurred during sign in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Link current account with Google using popup
  const linkAccountWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log("Starting account linking with Google");
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google auth successful, linking account");
      
      // Handle the signed-in user for account linking
      await handleAuthentication(result.user);
    } catch (error) {
      console.error('Error linking account with Google:', error);
      toast({
        title: 'Link failed',
        description: error instanceof Error ? error.message : 'An error occurred while linking your account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOutFromFirebase = async () => {
    try {
      await signOut(auth);
      // Call your backend API to log out the user
      await apiRequest('POST', '/api/logout');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign-out failed',
        description: error instanceof Error ? error.message : 'An error occurred during sign out',
        variant: 'destructive',
      });
    }
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        firebaseUser,
        isLoading,
        signInWithGoogle,
        signOutFromFirebase,
        linkAccountWithGoogle,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}