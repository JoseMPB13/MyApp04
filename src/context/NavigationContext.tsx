import React, { createContext, useContext, useState } from 'react';

type TabType = 'inicio' | 'activities' | 'vault' | 'settings';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMissionActive: boolean;
  setIsMissionActive: (active: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [isMissionActive, setIsMissionActive] = useState(false);

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, isMissionActive, setIsMissionActive }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within a NavigationProvider');
  }
  return context;
};
