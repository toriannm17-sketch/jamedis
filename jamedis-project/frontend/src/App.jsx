import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CheckIn from './pages/CheckIn.jsx';
import ClinicalWorkspace from './pages/ClinicalWorkspace.jsx';
import PharmacistDashboard from './pages/PharmacistDashboard.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import AdminWorkspace from './pages/AdminWorkspace.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';

const SESSION_KEY = 'jamedis_session';

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

function ProtectedLayout({ session, onLogout }) {
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={session.user} onLogout={onLogout} />
        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RoleRoute({ user, allowedRoles, children }) {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);

  const handleLogin = useCallback(
    (data) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setSession(data);
      navigate('/', { replace: true });
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const user = session?.user;

  const renderHomeDashboard = () => {
    if (user?.role === 'pharmacist') return <PharmacistDashboard user={user} />;
    if (user?.role === 'patient') return <PatientPortal user={user} />;
    return <Dashboard user={user} />;
  };

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <Signup />} />

      <Route element={<ProtectedLayout session={session} onLogout={handleLogout} />}>
        <Route path="/" element={renderHomeDashboard()} />

        <Route
          path="/check-in"
          element={
            <RoleRoute user={user} allowedRoles={['doctor', 'nurse', 'staff', 'admin']}>
              <CheckIn />
            </RoleRoute>
          }
        />

        <Route
          path="/clinical"
          element={
            <RoleRoute user={user} allowedRoles={['doctor', 'nurse']}>
              <ClinicalWorkspace user={user} />
            </RoleRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <RoleRoute user={user} allowedRoles={['admin']}>
              <AdminWorkspace user={user} />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  );
}


/* 
import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';

const SESSION_KEY = 'jamedis_session';

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

function ProtectedLayout({ session, onLogout }) {
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={session.user} onLogout={onLogout} />
        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);

  const handleLogin = useCallback(
    (data) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setSession(data);
      navigate('/', { replace: true });
    },
    [navigate]
  );

  // Resets auth state, clears storage and returns the user to the Login page.
  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <Signup />} />

      <Route element={<ProtectedLayout session={session} onLogout={handleLogout} />}>
        <Route path="/" element={<Dashboard user={session?.user} />} />
        <Route path="/check-in" element={<CheckIn />} />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  );
}
*/