import { createContext, useContext, useEffect, useState } from "react";
import { auth, provider, db } from "../firebase/config";
import {
  signInWithPopup, signOut, onAuthStateChanged,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // Check admin
        const adminDoc = await getDoc(doc(db, "admins", u.uid));
        setIsAdmin(adminDoc.exists());

        // Save basic user info to Firestore so admin can see it
        if (!adminDoc.exists()) {
          await setDoc(doc(db, "users", u.uid, "profile", "info"), {
            displayName: u.displayName || "",
            email: u.email || "",
            photoURL: u.photoURL || "",
            lastLogin: new Date().toISOString(),
          }, { merge: true });
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const adminLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => { setIsAdmin(false); signOut(auth); };

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, adminLogin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}