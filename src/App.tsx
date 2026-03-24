import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Modulo } from './types';
import { Operarios } from './components/Operarios';
import { Obras } from './components/Obras';
import { Calendario } from './components/Calendario';
import { ResumenMensual } from './components/ResumenMensual';
import { Dashboard } from './components/Dashboard';
import { GestionAusencias } from './components/GestionAusencias';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useUser } from './hooks/useUser';

function DashboardLayout() {
  const [modulo, setModulo] = useState<Modulo>('operarios');
  const { logout, user } = useAuth();
  const { userData } = useUser(user?.uid || null);

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = userData?.rol === 'director';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 justify-between items-center">
            <div className="flex gap-1">
              <button
                onClick={() => setModulo('operarios')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'operarios'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Operarios
              </button>
              <button
                onClick={() => setModulo('obras')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'obras'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Obras
              </button>
              <button
                onClick={() => setModulo('calendario')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'calendario'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendario
              </button>
              <button
                onClick={() => setModulo('resumen')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'resumen'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setModulo('dashboard')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'dashboard'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setModulo('ausencias')}
                className={`px-4 py-3 font-medium transition-colors ${
                  modulo === 'ausencias'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ausencias
              </button>
              {isAdmin && (
                <button
                  onClick={() => setModulo('admin' as Modulo)}
                  className={`px-4 py-3 font-medium transition-colors ${
                    modulo === 'admin'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admin
                </button>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto">
        {modulo === 'operarios' && <Operarios />}
        {modulo === 'obras' && <Obras />}
        {modulo === 'calendario' && <Calendario />}
        {modulo === 'resumen' && <ResumenMensual />}
        {modulo === 'dashboard' && <Dashboard />}
        {modulo === 'ausencias' && <GestionAusencias />}
        {modulo === 'admin' && isAdmin && <AdminPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
