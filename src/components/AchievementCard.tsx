import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '../context/ThemeContext';

interface AchievementCardProps {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isUnlocked: boolean;
  index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ 
  title, 
  description, 
  iconName, 
  isUnlocked, 
  index 
}) => {
  const { colors, isDarkMode } = useAppTheme();

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      backgroundColor: isUnlocked 
        ? colors.card 
        : (isDarkMode ? '#252525' : '#F2F2F2'),
      borderColor: isUnlocked ? colors.border : 'transparent',
      opacity: isUnlocked ? 1 : 0.7,
    }
  ];

  if (isUnlocked) {
    containerStyle.push(styles.unlockedShadow);
  }

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()}
      style={containerStyle}
    >
      <View style={[
        styles.iconWrapper, 
        { backgroundColor: isUnlocked ? (isDarkMode ? '#2c2c2c' : '#F7F8FA') : 'transparent' }
      ]}>
        <Ionicons 
          name={iconName} 
          size={36} 
          color={isUnlocked ? colors.accent : '#95a5a6'} 
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text 
          style={[styles.description, { color: isUnlocked ? colors.text : '#7f8c8d' }]}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>

      {!isUnlocked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color="#95a5a6" />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 28,
    margin: 6, // Margen para el grid
    borderWidth: 1,
    minHeight: 180,
    justifyContent: 'center',
  },
  unlockedShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  }
});

export default AchievementCard;
