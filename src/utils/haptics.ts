import * as Haptics from 'expo-haptics';

/**
 * Plays a light impact haptic feedback.
 * Ideal for button presses and small interactions.
 */
export const playLightImpact = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.warn('Haptics not available', error);
  }
};

/**
 * Plays a success notification haptic feedback.
 * Ideal for completing a task or a successful action.
 */
export const playSuccess = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn('Haptics not available', error);
  }
};

/**
 * Plays an error notification haptic feedback.
 * Ideal for failures or invalid actions.
 */
export const playError = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.warn('Haptics not available', error);
  }
};
