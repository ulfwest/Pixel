import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, query, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0227157883",
  appId: "1:569841876692:web:0a422f786863d231128541",
  apiKey: "AIzaSyBzd1iHR-cF9h6K64UlXKAhlmJlL02B_08",
  authDomain: "gen-lang-client-0227157883.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a6a506b7-3651-4f63-ab93-b6375f3fa895",
  storageBucket: "gen-lang-client-0227157883.firebasestorage.app",
  messagingSenderId: "569841876692",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying the created database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error signing in with Google", error);
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client offline.");
    }
  }
};

// Handle Firestore Errors safely
export const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
  const user = auth.currentUser;
  const errorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: user ? {
      userId: user.uid,
      email: user.email || '',
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerInfo: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    } : null
  };
  throw new Error(JSON.stringify(errorInfo, null, 2));
};
