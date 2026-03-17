import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '../context/AuthSessionContext';

interface ProtectedRouteProps {
  allowMembers?: boolean;
}

const ProtectedRoute = ({ allowMembers = true }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isLoading, isAuthenticated, user, mustChangePassword } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-panel-muted">
        <div className="flex items-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-text-secondary shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-blue" />
          Checking access
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowMembers && user?.role === 'member') {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
