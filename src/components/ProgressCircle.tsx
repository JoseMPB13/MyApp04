import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressCircleProps {
  percentage: number;
  size: number;
  color: string;
  strokeWidth?: number;
  level?: string | number;
}

/**
 * A premium circular progress indicator with level display and smooth entry animation.
 */
const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  size,
  color,
  strokeWidth = 6,
  level
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    // Animate from 0 to target percentage on mount
    progress.value = withTiming(percentage, { 
      duration: 1500,
      easing: Easing.out(Easing.exp)
    });
  }, [percentage, progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (progress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Circle (Track) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={0.12}
          fill="transparent"
        />
        {/* Progress Circle (Indicator) */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {level !== undefined && (
        <View style={styles.labelContainer}>
          <Text style={[styles.levelLabel, { color }]}>Niv.</Text>
          <Text style={[styles.levelValue, { color }]}>{level}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.8,
    marginBottom: -2,
  },
  levelValue: {
    fontSize: 16,
    fontWeight: '900',
  },
});

export default ProgressCircle;
