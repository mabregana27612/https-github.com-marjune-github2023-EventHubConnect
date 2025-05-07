import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithRedirect,
  getRedirectResult,
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

  // Check for redirect result on component mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log("Checking for redirect result...");
        const result = await getRedirectResult(auth);
        console.log("Redirect result:", result ? "Success" : "No result");
        
        if (result) {
          // Get user info from result
          const user = result.user;
          console.log("Firebase user obtained:", user.email);
          
          try {
            // Send the Firebase ID token to your backend
            const idToken = await user.getIdToken(true); // Force token refresh
            console.log("ID token obtained, proceeding with server auth");
            
            // Check if user is already authenticated with our server
            // If yes, this is an account linking action, otherwise it's a login/registration
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
              } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to authenticate with the server');
              }
            }
          } catch (serverError) {
            console.error("Server authentication error:", serverError);
            toast({
              title: 'Server authentication failed',
              description: serverError instanceof Error ? serverError.message : 'Failed to authenticate with the server',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
        if (error instanceof Error) {
          toast({
            title: 'Authentication failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    // Execute immediately
    handleRedirectResult();
  }, [toast, queryClient]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithRedirect(auth, googleProvider);
      // The rest of the auth flow will be handled when the redirect comes back
    } catch (error) {
      console.error('Error starting Google sign-in:', error);
      toast({
        title: 'Sign-in failed',
        description: error instanceof Error ? error.message : 'An error occurred during sign in',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Link current account with Google
  const linkAccountWithGoogle = async () => {
    try {
      setIsLoading(true);
      // Use redirect for consistent behavior with signInWithGoogle
      await signInWithRedirect(auth, googleProvider);
      // The rest will be handled in the redirect handler
    } catch (error) {
      console.error('Error linking account with Google:', error);
      toast({
        title: 'Link failed',
        description: error instanceof Error ? error.message : 'An error occurred while linking your account',
        variant: 'destructive',
      });
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