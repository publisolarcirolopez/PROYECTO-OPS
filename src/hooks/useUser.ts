import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface UserData {
  uid: string;
  email: string;
  nombre: string;
  rol: string;
  createdAt: any;
}

export const useUser = (uid: string | null) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchUser = async () => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        setUserData(docSnap.exists() ? (docSnap.data() as UserData) : null);
      } catch (err) {
        console.error('[useUser] Error cargando el usuario:', err);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [uid]);

  return { userData, loading };
};
