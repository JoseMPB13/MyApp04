import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, SharedValue } from 'react-native-reanimated';

export const TypingBubble = ({ colors }: any) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(delay, withRepeat(
        withSequence(withTiming(-6, { duration: 300 }), withTiming(0, { duration: 300 })),
        -1, true
      ));
    };
    anim(dot1, 0);
    anim(dot2, 150);
    anim(dot3, 300);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={[styles.aiBubble, styles.typingBubble, { backgroundColor: colors.card }]}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style1]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style2]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style3]} />
    </View>
  );
};

const styles = StyleSheet.create({
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F0F2F5', padding: 16, borderRadius: 20, maxWidth: '85%' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24, width: 80, justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
