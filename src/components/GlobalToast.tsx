import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter, Platform } from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeOutUp, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{name: string, description?: string} | null>(null);
  
  const translateY = useSharedValue(0);

  const hideToast = useCallback(() => {
    setToast(null);
    translateY.value = 0;
  }, [translateY]);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('showGlobalToast', (event) => {
      setToast(event);
      translateY.value = 0;
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const timer = setTimeout(() => {
        if (toast) hideToast();
      }, 4000);
      
      return () => clearTimeout(timer);
    });

    return () => listener.remove();
  }, [toast, hideToast, translateY]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -40 || event.velocityY < -500) {
        translateY.value = withTiming(-100, { duration: 200 }, () => {
          runOnJS(hideToast)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  return (
    <View style={[styles.outerContainer, { top: insets.top > 0 ? insets.top + 10 : 40 }]} pointerEvents="box-none">
      <Animated.View 
        entering={FadeInUp.springify().damping(12)} 
        exiting={FadeOutUp}
        style={styles.layoutWrapper}
      >
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.toastCard, animatedStyle]}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle" size={24} color="#FFD32D" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{toast.name}</Text>
              {toast.description && <Text style={styles.description}>{toast.description}</Text>}
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  layoutWrapper: {
    width: '100%',
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
  description: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});

