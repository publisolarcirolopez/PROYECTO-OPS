import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

// Traduce los códigos de error de Firebase Auth a mensajes claros en español.
function mensajeError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'El email no tiene un formato válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(mensajeError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-white to-gold-400/20">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-gold-500" />
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo size={52} />
            <p className="text-sm text-gray-500 mt-4">Gestión de Operaciones</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-charcoal text-sm font-semibold mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-charcoal text-sm font-semibold mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-gold-500 text-white font-semibold py-2.5 rounded-lg hover:from-brand-600 hover:to-gold-600 transition-colors disabled:opacity-60"
            >
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
