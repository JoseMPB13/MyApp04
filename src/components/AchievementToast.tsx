import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AchievementToast = () => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [achievementName, setAchievementName] = useState('');

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('achievementUnlocked', ({ name }) => {
      setAchievementName(name);
      setVisible(true);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    });

    return () => sub.remove();
  }, []);

  if (!visible) return null;

  const topOffset = insets.top > 0 ? insets.top + 8 : 44;

  return (
    <Animated.View 
      entering={FadeInDown.springify().damping(14)} 
      exiting={FadeOutUp.duration(300)}
      style={[styles.container, { top: topOffset }]}
    >
      <View style={styles.toastCard}>
        {/* Ícono izquierdo */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🏆</Text>
        </View>

        {/* Texto */}
        <View style={styles.textContainer}>
          <Text style={styles.label}>¡Logro Desbloqueado!</Text>
          <Text style={styles.name} numberOfLines={1}>{achievementName}</Text>
        </View>

        {/* Destellos decorativos */}
        <Ionicons name="sparkles" size={18} color="#FFD32D" style={{ opacity: 0.8 }} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toastCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 18,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 211, 45, 0.4)',
    shadowColor: '#FFD32D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 211, 45, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 211, 45, 0.3)',
  },
  iconEmoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#FFD32D',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  }
});

export default AchievementToast;
