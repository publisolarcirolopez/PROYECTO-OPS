import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Logo } from '@/components/Logo';

// Colecciones de datos de negocio que se pueden vaciar desde la Zona de datos.
const COLECCIONES_DATOS: { key: string; label: string }[] = [
  { key: 'operarios', label: 'Montadores' },
  { key: 'obras', label: 'Obras' },
  { key: 'calendario', label: 'Calendario (producción)' },
  { key: 'ausencias', label: 'Ausencias' },
];

export const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('instalador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [datosMsg, setDatosMsg] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

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

      // Guardar datos en Firestore (con la app principal, ya autenticada como director)
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
      // Cerrar y desechar la app secundaria pase lo que pase.
      await signOut(secondaryAuth).catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-gold-500" />
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Logo size={34} />
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-charcoal">Panel de Administración</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-md transition-colors"
        >
          Cerrar sesión
        </button>
      </nav>

      <div className="p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6">Crear Nuevo Usuario</h2>

        <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="instalador">Instalador</option>
              <option value="jefe_produccion">Jefe de Producción</option>
              <option value="director">Director de Operaciones</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 text-white font-semibold py-2 rounded-lg hover:bg-brand-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>

        {/* Zona de datos (borrado) */}
        <div className="mt-10 bg-white p-6 rounded-lg shadow border border-red-200">
          <h2 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-1">
            <span>⚠️</span> Zona de datos
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Vacía los datos de negocio para empezar de cero. Estas acciones son
            permanentes y no se pueden deshacer.
          </p>

          <div className="space-y-2">
            {COLECCIONES_DATOS.map(c => (
              <div key={c.key} className="flex items-center justify-between border-b border-gray-100 pb-2">
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
            <p className="text-sm mt-4 text-gray-700 bg-gray-50 border rounded px-3 py-2">
              {datosMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
