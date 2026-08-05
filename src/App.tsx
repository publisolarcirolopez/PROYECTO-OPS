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
import { Icon, IconName } from './components/Icons';
import { useAuth } from './hooks/useAuth';
import { useUser } from './hooks/useUser';

const TABS: { id: Modulo; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'calendario', label: 'Calendario', icon: 'calendar' },
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'obras', label: 'Obras', icon: 'briefcase' },
  { id: 'operarios', label: 'Operarios', icon: 'users' },
  { id: 'ausencias', label: 'Ausencias', icon: 'ausencias' },
];

const ROL_LABEL: Record<string, string> = {
  instalador: 'Instalador',
  jefe_produccion: 'Jefe de Producción',
  director: 'Director',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function DashboardLayout() {
  const [modulo, setModulo] = useState<Modulo>('dashboard');
  const { logout, user } = useAuth();
  const { userData } = useUser(user?.uid || null);

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = userData?.rol === 'director';
  const tabs = isAdmin
    ? [...TABS, { id: 'admin' as Modulo, label: 'Admin', icon: 'settings' as IconName }]
    : TABS;

  const tituloActual = tabs.find(t => t.id === modulo)?.label || '';

  const hoy = new Date();
  const fechaHoy = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;

  const iniciales = (userData?.nombre || user?.email || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Barra lateral */}
      <aside className="w-60 shrink-0 bg-ink text-gray-300 flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-white/10">
          <Logo size={34} light />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map(t => {
            const activo = modulo === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setModulo(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-brand-500/15 text-brand-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon name={t.icon} size={18} className={activo ? 'text-brand-400' : ''} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userData?.nombre || 'Usuario'}</p>
              <p className="text-xs text-gray-400 truncate">
                {userData ? (ROL_LABEL[userData.rol] || userData.rol) : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f5f3]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="text-xl font-bold text-charcoal">{tituloActual}</h1>
          <span className="text-sm text-gray-400 capitalize hidden sm:block">{fechaHoy}</span>
        </header>

        <main className="flex-1 min-w-0">
          {modulo === 'operarios' && <Operarios />}
          {modulo === 'obras' && <Obras />}
          {modulo === 'calendario' && <Calendario />}
          {modulo === 'resumen' && <ResumenMensual />}
          {modulo === 'dashboard' && <Dashboard />}
          {modulo === 'ausencias' && <GestionAusencias />}
          {modulo === 'admin' && isAdmin && <AdminPage />}
        </main>
      </div>
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
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
