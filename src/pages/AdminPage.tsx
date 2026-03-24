import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('instalador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Guardar datos en Firestore
      await addDoc(collection(db, 'users'), {
        uid,
        email,
        nombre,
        rol,
        createdAt: serverTimestamp(),
      });

      setSuccess(`Usuario ${nombre} creado exitosamente`);
      setEmail('');
      setPassword('');
      setNombre('');
      setRol('instalador');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Cerrar Sesión
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
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
};
