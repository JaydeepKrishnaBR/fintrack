import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiAyF3MNi8sl3eu8nW6Gk6YxZhbWwAheM",
  authDomain: "fintrack-011.firebaseapp.com",
  projectId: "fintrack-011",
  storageBucket: "fintrack-011.firebasestorage.app",
  messagingSenderId: "351252302840",
  appId: "1:351252302840:web:7f38686b3be3276613a40d"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);