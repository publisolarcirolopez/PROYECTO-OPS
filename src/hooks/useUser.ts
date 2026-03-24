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

    const fetchUser = async () => {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
      setLoading(false);
    };

    fetchUser();
  }, [uid]);

  return { userData, loading };
};
