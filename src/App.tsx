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
import { Logo } from './components/Logo';
import { useAuth } from './hooks/useAuth';
import { useUser } from './hooks/useUser';

const TABS: { id: Modulo; label: string }[] = [
  { id: 'operarios', label: 'Operarios' },
  { id: 'obras', label: 'Obras' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ausencias', label: 'Ausencias' },
];

const ROL_LABEL: Record<string, string> = {
  instalador: 'Instalador',
  jefe_produccion: 'Jefe de Producción',
  director: 'Director',
};

function DashboardLayout() {
  const [modulo, setModulo] = useState<Modulo>('operarios');
  const { logout, user } = useAuth();
  const { userData } = useUser(user?.uid || null);

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = userData?.rol === 'director';
  const tabs: { id: Modulo; label: string }[] = isAdmin
    ? [...TABS, { id: 'admin' as Modulo, label: 'Admin' }]
    : TABS;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecera de marca */}
      <header className="bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-gold-500" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <Logo size={38} />
            <div className="flex items-center gap-3">
              {userData && (
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-semibold text-charcoal">{userData.nombre}</span>
                  <span className="text-xs text-brand-600 font-medium">
                    {ROL_LABEL[userData.rol] || userData.rol}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-md transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setModulo(t.id)}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                  modulo === t.id
                    ? 'text-brand-600 border-brand-500'
                    : 'text-gray-500 border-transparent hover:text-charcoal hover:border-brand-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-b" />
      </header>

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
            <ProtectedRoute requiredRole="director">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
