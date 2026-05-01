import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../context/ThemeContext';

const AchievementToast = () => {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [achievementName, setAchievementName] = useState('');

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('achievementUnlocked', ({ name }) => {
      setAchievementName(name);
      setVisible(true);
      
      // Feedback Haptico
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Auto-ocultar después de 4 segundos
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    });

    return () => sub.remove();
  }, []);

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeInUp.springify()} 
      exiting={FadeOutUp}
      style={[
        styles.container, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.accent,
          shadowColor: colors.accent 
        }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
        <Ionicons name="trophy" size={22} color="#FFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.accent }]}>¡LOGRO DESBLOQUEADO!</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {achievementName}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  }
});

export default AchievementToast;
