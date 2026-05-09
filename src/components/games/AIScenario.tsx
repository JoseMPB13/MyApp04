import React from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useAIChat } from '../../hooks/useAIChat';

// Components
import { SelectPracticePhase } from './AIScenarioComponents/SelectPracticePhase';
import { ChatPhase } from './AIScenarioComponents/ChatPhase';
import { ChatSummaryPhase } from './AIScenarioComponents/ChatSummaryPhase';

export default function AIScenario({ 
  onComplete, 
  exp = 0,
  level = 1
}: { 
  onComplete: (expEarned: number) => void; 
  exp?: number;
  level?: number;
}) {
  const { colors, isDarkMode } = useAppTheme();
  const { session } = useUser();
  const userId = session?.user?.id || '';

  // 🧠 Entire business logic isolated in custom hook
  const chatHook = useAIChat(userId);
  const { phase, activeCategory } = chatHook;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 80}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Charla con Raccoon</Text>
        <Text style={styles.headerSubtitle}>
          {phase === 'CHAT' || phase === 'SUMMARY' ? activeCategory ?? 'Charla con Raccoon' : 'Práctica Rápida'}
        </Text>
      </View>

      {phase === 'SELECT_PRACTICE' && (
        <SelectPracticePhase chat={chatHook} colors={colors} isDarkMode={isDarkMode} />
      )}

      {phase === 'CHAT' && (
        <ChatPhase chat={chatHook} colors={colors} isDarkMode={isDarkMode} />
      )}

      {phase === 'SUMMARY' && (
        <ChatSummaryPhase 
          chat={chatHook} 
          colors={colors} 
          isDarkMode={isDarkMode} 
          level={level} 
          exp={exp} 
          onComplete={onComplete} 
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSubtitle: { fontSize: 14, marginTop: 2, fontWeight: '600', opacity: 0.7 },
});
