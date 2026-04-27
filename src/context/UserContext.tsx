import React, { createContext, useContext, useState } from 'react';

export const UserContext = createContext({
  username: '',
  updateUsername: (name: string) => {}
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState('');

  return (
    <UserContext.Provider value={{ username, updateUsername: setUsername }}>
      {children}
    </UserContext.Provider>
  );
};
