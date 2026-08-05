import { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// Colecciones de datos de negocio que se pueden vaciar desde la Zona de datos.
const COLECCIONES_DATOS: { key: string; label: string }[] = [
  { key: 'operarios', label: 'Montadores' },
  { key: 'obras', label: 'Obras' },
  { key: 'calendario', label: 'Calendario (producción)' },
  { key: 'ausencias', label: 'Ausencias' },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400';

export const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('instalador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [datosMsg, setDatosMsg] = useState('');

  // Vacía una colección de appData (deja value: []). Pide confirmación.
  const vaciarColeccion = async (key: string, label: string) => {
    if (!window.confirm(`¿Vaciar "${label}"? Esta acción borra todos los registros y NO se puede deshacer.`)) {
      return;
    }
    setDatosMsg('');
    try {
      await setDoc(doc(db, 'appData', key), { value: [] });
      setDatosMsg(`"${label}" vaciado correctamente.`);
    } catch (err: any) {
      setDatosMsg(`Error al vaciar "${label}": ${err?.message || err}`);
    }
  };

  const vaciarTodo = async () => {
    if (!window.confirm('¿Empezar de cero? Se borrarán montadores, obras, calendario y ausencias. NO se puede deshacer.')) {
      return;
    }
    setDatosMsg('');
    try {
      for (const c of COLECCIONES_DATOS) {
        await setDoc(doc(db, 'appData', c.key), { value: [] });
      }
      setDatosMsg('Todos los datos de negocio se han vaciado. Ya puedes empezar a cargar la producción actual.');
    } catch (err: any) {
      setDatosMsg(`Error al vaciar los datos: ${err?.message || err}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // App Firebase SECUNDARIA: crea el usuario sin cambiar la sesión actual.
    // Con la app principal, createUserWithEmailAndPassword firma como el nuevo
    // usuario y expulsaría al director. Nombre único por instante para no colisionar.
    const secondaryApp = initializeApp(firebaseConfig, `crear-usuario-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      await addDoc(collection(db, 'users'), {
        uid,
        email,
        nombre,
        rol,
        createdAt: serverTimestamp(),
      });

      setSuccess(`Usuario ${nombre} creado correctamente`);
      setEmail('');
      setPassword('');
      setNombre('');
      setRol('instalador');
    } catch (err: any) {
      setError(err.message);
    } finally {
      await signOut(secondaryAuth).catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
      setLoading(false);
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
      {/* Crear usuario */}
      <div className="crm-card overflow-hidden self-start">
        <div className="crm-card-header">
          <h2 className="font-semibold text-charcoal">Crear nuevo usuario</h2>
        </div>
        <form onSubmit={handleCreateUser} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value)} className={inputCls}>
              <option value="instalador">Instalador</option>
              <option value="jefe_produccion">Jefe de Producción</option>
              <option value="director">Director de Operaciones</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>}
          {success && <p className="text-brand-700 text-sm bg-brand-50 border border-brand-100 rounded px-3 py-2">{success}</p>}

          <button type="submit" disabled={loading} className="crm-btn w-full justify-center">
            {loading ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      </div>

      {/* Zona de datos */}
      <div className="crm-card overflow-hidden self-start border-red-200">
        <div className="crm-card-header border-red-100">
          <h2 className="font-semibold text-red-700 flex items-center gap-2">
            <span>⚠️</span> Zona de datos
          </h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">
            Vacía los datos de negocio para empezar de cero. Estas acciones son permanentes y no se pueden deshacer.
          </p>

          <div className="divide-y divide-gray-100">
            {COLECCIONES_DATOS.map(c => (
              <div key={c.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-charcoal">{c.label}</span>
                <button
                  onClick={() => vaciarColeccion(c.key, c.label)}
                  className="text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                >
                  Vaciar
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={vaciarTodo}
            className="w-full mt-5 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Empezar de cero (borrar todo)
          </button>

          {datosMsg && (
            <p className="text-sm mt-4 text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">{datosMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
};
