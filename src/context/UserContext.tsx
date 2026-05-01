import React, { createContext, useContext, useState } from 'react';

export interface UserContextType {
  username: string;
  avatarUrl: string | null;
  updateUser: (data: { username?: string, avatarUrl?: string | null }) => void;
}

export const UserContext = createContext<UserContextType>({
  username: '',
  avatarUrl: null,
  updateUser: () => {}
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const updateUser = (data: { username?: string, avatarUrl?: string | null }) => {
    if (data.username !== undefined) setUsername(data.username);
    if (data.avatarUrl !== undefined) setAvatarUrl(data.avatarUrl);
  };

  return (
    <UserContext.Provider value={{ username, avatarUrl, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};
