import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";

const PersonaCtx = createContext();

export function PersonaProvider({ children }) {
  const { user } = useAuth();
  const [persona, setPersona] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!user) { setPersona(null); setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "users", user.uid, "profile", "onboarding"),
      (snap) => {
        setPersona(snap.exists() ? snap.data() : null);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  return (
    <PersonaCtx.Provider value={{ persona, loading }}>
      {children}
    </PersonaCtx.Provider>
  );
}

export function usePersona() {
  return useContext(PersonaCtx);
}