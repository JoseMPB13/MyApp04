import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';
import { playLightImpact } from '../utils/haptics';
import { useAppTheme } from '../context/ThemeContext';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * A premium reusable button component with haptic feedback and smooth animations.
 */
const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  title, 
  onPress, 
  style, 
  textStyle,
  disabled = false,
  variant = 'primary'
}) => {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  // Animated style for the scale effect
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
    playLightImpact();
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    if (variant === 'primary') return colors.accent;
    if (variant === 'secondary') return colors.card;
    if (variant === 'outline') return 'transparent';
    return colors.accent;
  };

  const getTextColor = () => {
    if (disabled) return colors.text + '80';
    if (variant === 'primary') return '#FFFFFF';
    if (variant === 'outline') return colors.accent;
    return colors.text;
  };

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { 
            backgroundColor: getBackgroundColor(),
            borderColor: variant === 'outline' ? colors.accent : 'transparent',
            borderWidth: variant === 'outline' ? 1.5 : 0,
          },
          pressed && variant !== 'outline' && { opacity: 0.95 }
        ]}
      >
        <Text style={[
          styles.text, 
          { color: getTextColor() }, 
          textStyle
        ]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default PremiumButton;
