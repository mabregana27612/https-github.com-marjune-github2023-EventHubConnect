import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration - hardcoded for simplicity
// Note: In a production environment, these values should be stored in environment variables
const firebaseConfig = {
  apiKey: "AIzaSyAnAiaFW3nw23zyiYdObFA4ppafq-sphOw",
  authDomain: "eventpro-ac7f4.firebaseapp.com",
  projectId: "eventpro-ac7f4",
  storageBucket: "eventpro-ac7f4.firebasestorage.app",
  messagingSenderId: "325145470826",
  appId: "1:325145470826:web:8d6cceb74f1f83134fa713",
  measurementId: "G-7SLGBKJLS1"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(firebaseApp);

// Create Google provider instance
const googleProvider = new GoogleAuthProvider();

// Add scopes for additional permissions if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Set custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // This ensures that the redirected authentication response contains an ID token
  access_type: 'offline',
  // Include the user's email in the sign-in process 
  login_hint: 'user@example.com'
});

export { auth, googleProvider };