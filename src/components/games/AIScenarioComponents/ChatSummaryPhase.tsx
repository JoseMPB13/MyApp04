import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export const ChatSummaryPhase = ({ chat, colors, isDarkMode, level, exp, onComplete }: any) => {
  const { targetWords, usedWords, totalExpEarned } = chat;

  return (
    <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.titleSuccess, isDarkMode && { color: '#2ed573' }]}>¡Victoria! 🎉</Text>
      
      <View style={styles.expContainer}>
        <Text style={[styles.expText, { color: colors.text }]}>Nivel {level} • {exp % 100}/100 EXP</Text>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${exp % 100}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={styles.expGainText}>+{totalExpEarned} EXP ganados (Bonus: {totalExpEarned - 50})</Text>
      </View>
      
      <Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>Has practicado estas palabras de tu baúl. ¡Sigue así para dominarlas por completo!</Text>
      
      <ScrollView style={{ width: '100%', marginTop: 10 }}>
        {targetWords.map((w: any, i: number) => {
          const wordKey = w.word_en.toLowerCase().trim();
          const isUsed = usedWords.includes(wordKey);

          return (
            <View key={i} style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryWordEs, { color: colors.text }]}>{w.word_es}</Text>
                <Text style={[styles.summaryWordEn, { color: colors.accent }]}>{w.word_en}</Text>
              </View>
              {isUsed ? (
                <View style={styles.inVaultBadge}>
                  <Text style={styles.inVaultText}>Usada ✅</Text>
                </View>
              ) : (
                <View style={[styles.inVaultBadge, { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5', borderColor: colors.border }]}>
                  <Text style={[styles.inVaultText, { color: '#95a5a6' }]}>Pendiente</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.accent, flex: 1 }]} 
          onPress={() => onComplete(totalExpEarned)}
        >
          <Text style={styles.primaryBtnText}>Volver a Misiones</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, padding: 16, paddingTop: 40, alignItems: 'center' },
  titleSuccess: { fontSize: 32, fontWeight: '900', color: '#05c46b', marginBottom: 16 },
  expContainer: { width: '100%', marginBottom: 20 },
  expText: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  expGainText: { fontSize: 14, color: '#05c46b', fontWeight: '800', marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  summaryInfo: { flex: 1 },
  summaryWordEs: { fontSize: 16, fontWeight: '800' },
  summaryWordEn: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  inVaultBadge: { backgroundColor: '#05c46b15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#05c46b' },
  inVaultText: { color: '#05c46b', fontSize: 12, fontWeight: '800' },
  actionButtonsContainer: { flexDirection: 'row', width: '100%', marginTop: 20 },
  primaryBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
