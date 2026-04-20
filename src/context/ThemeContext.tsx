import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#F0F2F5',
    text: '#1e272e',
    card: '#FFFFFF',
    accent: '#575fcf',
    border: '#EEF1FF'
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    card: '#1e1e1e',
    accent: '#706fd3',
    border: '#2c2c2c'
  }
};

export const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  colors: Colors.light,
  username: '',
  updateUsername: (name: string) => {}
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemAuth = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then((stored) => {
      if (stored !== null) {
        setIsDarkMode(stored === 'dark');
      } else {
        setIsDarkMode(systemAuth === 'dark');
      }
      setIsLoaded(true);
    });
  }, [systemAuth]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const colors = isDarkMode ? Colors.dark : Colors.light;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors, username, updateUsername: setUsername }}>
      {children}
    </ThemeContext.Provider>
  );
};
