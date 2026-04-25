import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { whoAmI } from '@/api/guardPanel';
import { setStoredAccessToken } from '@/api/client';
import type { WhoAmIResponse } from '@/api/types';

interface SessionValue {
  profile: WhoAmIResponse | null;
  setProfile: (p: WhoAmIResponse | null) => void;
  refreshProfile: () => Promise<WhoAmIResponse>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [profile, setProfile] = useState<WhoAmIResponse | null>(null);

  const refreshProfile = useCallback(async () => {
    const p = await whoAmI();
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(() => {
    setStoredAccessToken(null);
    setProfile(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(
    () => ({ profile, setProfile, refreshProfile, logout }),
    [profile, refreshProfile, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession вне SessionProvider');
  }
  return ctx;
}
