import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{name: string, description?: string} | null>(null);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('achievementUnlocked', (event) => {
      setToast(event);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToast(null);
      }, 4000);
    });

    return () => {
      listener.remove();
    };
  }, []);

  if (!toast) return null;

  return (
    <Animated.View 
      entering={FadeInUp.springify().damping(12)} 
      exiting={FadeOutUp}
      style={[styles.container, { top: insets.top > 0 ? insets.top + 10 : 40 }]}
    >
      <View style={styles.toastCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={24} color="#FFD32D" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>¡Logro Desbloqueado!</Text>
          <Text style={styles.name}>{toast.name}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  toastCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 211, 45, 0.3)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 211, 45, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD32D',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
