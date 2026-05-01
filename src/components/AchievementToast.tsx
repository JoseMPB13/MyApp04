import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter, Platform } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

interface Achievement {
  id: string;
  name: string;
  description?: string;
}

const AchievementToast = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();
  const [queue, setQueue] = useState<Achievement[]>([]);
  
  // El primer elemento de la cola es el que se muestra
  const current = queue[0] || null;

  useEffect(() => {
    // Listener para recibir logros desde cualquier parte de la app
    const sub = DeviceEventEmitter.addListener('achievementUnlocked', (achievement: Achievement) => {
      const achievementWithId = { 
        ...achievement, 
        id: achievement.id || Math.random().toString() 
      };
      setQueue(prev => [...prev, achievementWithId]);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Si no hay nada en la cola, no hacemos nada
    if (!current) return;

    // Feedback táctico al aparecer
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Auto-cierre robusto tras 3.5 segundos
    const timer = setTimeout(() => {
      setQueue(prev => prev.slice(1));
    }, 3500);

    // Limpieza crítica para evitar bugs con múltiples logros
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  const topOffset = insets.top > 0 ? insets.top + 12 : 48;

  return (
    <View style={[styles.outerContainer, { top: topOffset }]} pointerEvents="none">
      <Animated.View 
        key={current.id}
        entering={SlideInUp.springify().damping(20).stiffness(90)} 
        exiting={SlideOutUp.duration(300)}
        style={[
          styles.toastCard, 
          { 
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            shadowColor: '#000',
          }
        ]}
      >
        {/* Icono Minimalista */}
        <View style={[styles.iconWrapper, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}>
          <Ionicons name="trophy" size={22} color={colors.accent} />
        </View>

        {/* Texto Premium */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDarkMode ? '#FFF' : '#000' }]}>
            ¡Logro Desbloqueado!
          </Text>
          <Text style={[styles.name, { color: isDarkMode ? '#AAA' : '#666' }]} numberOfLines={1}>
            {current.name}
          </Text>
        </View>

        {/* Decoración sutil */}
        <Ionicons name="star" size={14} color={colors.accent} style={{ opacity: 0.5 }} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    // Sombras
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    // Borde sutil para modo oscuro
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
  }
});

export default AchievementToast;



