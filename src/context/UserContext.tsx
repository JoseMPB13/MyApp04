import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useState } from 'react';

export interface UserContextType {
  session: Session | null;
  username: string;
  avatarUrl: string | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  updateUser: (data: { username?: string, avatarUrl?: string | null }) => void;
  setIsLoading: (loading: boolean) => void;
}

export const UserContext = createContext<UserContextType>({
  session: null,
  username: '',
  avatarUrl: null,
  isLoading: true,
  setSession: () => {},
  updateUser: () => {},
  setIsLoading: () => {}
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUser = (data: { username?: string, avatarUrl?: string | null }) => {
    if (data.username !== undefined) setUsername(data.username);
    if (data.avatarUrl !== undefined) setAvatarUrl(data.avatarUrl);
  };

  return (
    <UserContext.Provider value={{ 
      session, 
      username, 
      avatarUrl, 
      isLoading,
      setSession,
      updateUser,
      setIsLoading
    }}>
      {children}
    </UserContext.Provider>
  );
};

