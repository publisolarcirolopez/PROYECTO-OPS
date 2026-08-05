import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const COLLECTION = 'appData';

// Caché a nivel de módulo: conserva el último valor conocido de cada "tabla"
// entre montajes de componentes dentro de la sesión. CRÍTICO para no perder
// datos: sin esto, al volver a un módulo el espejo del valor arrancaba vacío
// y una escritura inmediata (antes de recibir el snapshot) machacaba TODO el
// documento en Firestore con solo el último cambio.
const cache = new Map<string, unknown>();

// Drop-in para useLocalStorage: misma firma [valor, setValor], pero los datos
// viven en Firestore (coleccion appData, un documento por key con un campo `value`)
// y se sincronizan en tiempo real entre todos los usuarios via onSnapshot.
export function useFirestoreState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    cache.has(key) ? (cache.get(key) as T) : initialValue
  );
  // Espejo sincrono del valor para resolver setValue(prev => ...) sin depender del render.
  const valueRef = useRef<T>(cache.has(key) ? (cache.get(key) as T) : initialValue);
  // ¿Hemos confirmado ya el estado del servidor para esta key en la sesión?
  // Si ya está en caché, damos por cargado (evita bloquear tras remontar).
  const loadedRef = useRef<boolean>(cache.has(key));

  useEffect(() => {
    const ref = doc(db, COLLECTION, key);
    const unsub = onSnapshot(ref, (snap) => {
      // Hemos recibido el estado del servidor (exista o no el documento).
      loadedRef.current = true;

      if (snap.exists()) {
        const remote = snap.data().value as T;
        valueRef.current = remote;
        cache.set(key, remote);
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
        cache.set(key, parsed);
        setValue(parsed);
        setDoc(ref, { value: parsed }).catch((err) => {
          console.error(`[useFirestoreState] Error migrando "${key}" a Firestore:`, err);
        });
      } catch {
        /* localStorage corrupto o inaccesible: ignorar */
      }
    });

    return () => unsub();
  }, [key]);

  const update: React.Dispatch<React.SetStateAction<T>> = (next) => {
    // Guard anti-machaque: no escribir hasta haber confirmado el estado del
    // servidor. Evita que una escritura basada en el valor inicial vacío
    // sobrescriba los datos existentes en el instante posterior al montaje.
    if (!loadedRef.current) {
      console.warn(`[useFirestoreState] Escritura en "${key}" ignorada: aún no se cargó el estado del servidor.`);
      return;
    }
    const resolved = next instanceof Function ? next(valueRef.current) : next;
    valueRef.current = resolved;
    cache.set(key, resolved);
    setValue(resolved);
    setDoc(doc(db, COLLECTION, key), { value: resolved }).catch((err) => {
      console.error(`[useFirestoreState] Error guardando "${key}" en Firestore:`, err);
    });
  };

  return [value, update];
}
