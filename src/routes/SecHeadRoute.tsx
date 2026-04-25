import { Navigate, Outlet } from 'react-router-dom';
import { isSecHead } from '@/api/guardPanel';
import { useSession } from '@/session/SessionContext';

/** Офисы и сотрудники — только для SEC_HEAD (см. whoami → position). */
export function SecHeadRoute() {
  const { profile } = useSession();
  if (!isSecHead(profile?.position)) {
    return <Navigate to="/tasks" replace />;
  }
  return <Outlet />;
}
