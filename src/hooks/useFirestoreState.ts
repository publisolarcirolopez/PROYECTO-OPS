import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const COLLECTION = 'appData';

// Drop-in para useLocalStorage: misma firma [valor, setValor], pero los datos
// viven en Firestore (coleccion appData, un documento por key con un campo `value`)
// y se sincronizan en tiempo real entre todos los usuarios via onSnapshot.
export function useFirestoreState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  // Espejo sincrono del valor para resolver setValue(prev => ...) sin depender del render.
  const valueRef = useRef<T>(initialValue);

  useEffect(() => {
    const ref = doc(db, COLLECTION, key);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const remote = snap.data().value as T;
        valueRef.current = remote;
        setValue(remote);
        return;
      }

      // El documento aun no existe en Firestore. Migracion segura de una sola vez:
      // si hay datos en localStorage con esta key, los subimos como punto de partida.
      // Nunca borra nada; si no hay datos locales, no escribe.
      try {
        const local = window.localStorage.getItem(key);
        if (!local) return;
        const parsed = JSON.parse(local) as T;
        const tieneContenido = Array.isArray(parsed) ? parsed.length > 0 : parsed != null;
        if (!tieneContenido) return;
        valueRef.current = parsed;
        setValue(parsed);
        setDoc(ref, { value: parsed });
      } catch {
        /* localStorage corrupto o inaccesible: ignorar */
      }
    });

    return () => unsub();
  }, [key]);

  const update: React.Dispatch<React.SetStateAction<T>> = (next) => {
    const resolved = next instanceof Function ? next(valueRef.current) : next;
    valueRef.current = resolved;
    setValue(resolved);
    setDoc(doc(db, COLLECTION, key), { value: resolved });
  };

  return [value, update];
}
