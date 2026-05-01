import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { 
  useAnimatedStyle, 
  SharedValue, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';
import { VaultWord } from '../api/vault';
import { useAppTheme } from '../context/ThemeContext';
import { playLightImpact, playSuccess } from '../utils/haptics';

interface VaultItemProps {
  word: VaultWord;
  onDelete: (id: string) => void;
  onMarkMastered: (id: string) => void;
}

/**
 * Component for Right Action (Delete)
 */
const RightAction = ({ drag }: { drag: SharedValue<number> }) => {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(drag.value, [-100, -50], [1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(drag.value, [-100, -50], [1, 0.7], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[styles.actionContainer, styles.rightAction]}>
      <Animated.View style={styleAnimation}>
        <Ionicons name="trash" size={28} color="#FFF" />
      </Animated.View>
    </View>
  );
};

/**
 * Component for Left Action (Mastered)
 */
const LeftAction = ({ drag }: { drag: SharedValue<number> }) => {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(drag.value, [50, 100], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(drag.value, [50, 100], [0.7, 1], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={[styles.actionContainer, styles.leftAction]}>
      <Animated.View style={styleAnimation}>
        <Ionicons name="checkmark-circle" size={28} color="#FFF" />
      </Animated.View>
    </View>
  );
};

const VaultItem: React.FC<VaultItemProps> = ({ word, onDelete, onMarkMastered }) => {
  const { colors } = useAppTheme();

  const handleOpen = (direction: 'left' | 'right') => {
    if (!word.id) return;
    
    // En ReanimatedSwipeable, un gesto hacia la izquierda ('left') revela las RightActions (Eliminar)
    // y un gesto hacia la derecha ('right') revela las LeftActions (Dominar).
    if (direction === 'left') {
      onDelete(word.id);
      playLightImpact();
    } else if (direction === 'right') {
      onMarkMastered(word.id);
      playSuccess();
    }
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      leftThreshold={80}
      rightThreshold={80}
      renderLeftActions={(_prog, drag) => <LeftAction drag={drag} />}
      renderRightActions={(_prog, drag) => <RightAction drag={drag} />}
      onSwipeableOpen={handleOpen}
      containerStyle={styles.swipeableContainer}
    >
      <View 
        style={[
          styles.wordCard, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            borderBottomColor: colors.border
          }
        ]}
      >
        <View style={styles.wordInfo}>
          <Text style={[styles.wordEs, { color: colors.text }]}>{word.word_es}</Text>
          <View style={styles.wordEnRow}>
            <Text style={styles.wordEn}>{word.word_en}</Text>
          </View>
          <View style={styles.tagRow}>
            <View style={[styles.categoryTag, { backgroundColor: colors.background }]}>
              <Text style={styles.categoryTagText}>{word.category || 'General'}</Text>
            </View>
            {word.status === 'mastered' && (
              <View style={styles.masteredBadge}>
                <Ionicons name="star" size={10} color="#FFD32D" />
                <Text style={styles.masteredText}>Dominada</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusIcon}>
          <Ionicons 
            name={word.status === 'mastered' ? "checkmark-circle" : "ellipse-outline"} 
            size={22} 
            color={word.status === 'mastered' ? "#05c46b" : colors.border} 
          />
        </View>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  wordCard: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderBottomWidth: 4,
    borderRadius: 20,
  },
  wordInfo: {
    flex: 1,
  },
  wordEs: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  wordEnRow: {
    marginTop: 2,
  },
  wordEn: {
    fontSize: 15,
    color: '#575fcf',
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#95a5a6',
    textTransform: 'uppercase',
  },
  masteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  masteredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 10,
  },
  actionContainer: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    backgroundColor: '#05c46b',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: 30,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  rightAction: {
    backgroundColor: '#FF4757',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 30,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
});

export default VaultItem;
