import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TutorNote = ({ lessonFeedback, colors, isDarkMode }: any) => {
  const hasCorrection = !!lessonFeedback?.correction;
  const hasVaultUsage = !!lessonFeedback?.vault_usage_detected;
  const score = lessonFeedback?.score ?? null;

  if (!hasCorrection && !hasVaultUsage && score === null) return null;

  return (
    <View style={[
      styles.tutorNote,
      { 
        backgroundColor: isDarkMode ? '#2a1a0a' : '#fff8f0',
        borderColor: isDarkMode ? '#8a4a0a' : '#ffd0a0',
      }
    ]}>
      <View style={styles.tutorNoteHeader}>
        <Ionicons name="school" size={14} color="#e17055" />
        <Text style={styles.tutorNoteTitle}>Nota del Tutor</Text>
        {score !== null && (
          <View style={[styles.scoreBadge, { backgroundColor: score >= 7 ? '#2ed573' : score >= 4 ? '#f1c40f' : '#e74c3c' }]}>
            <Text style={styles.scoreBadgeText}>{score}/10</Text>
          </View>
        )}
      </View>

      {hasVaultUsage && (
        <View style={styles.vaultUsageRow}>
          <Ionicons name="checkmark-circle" size={13} color="#2ed573" />
          <Text style={[styles.vaultUsageText, { color: colors.text }]}>
            Usaste: <Text style={styles.vaultWord}>{lessonFeedback.vault_usage_detected}</Text>
          </Text>
        </View>
      )}

      {hasCorrection && (
        <View style={styles.correctionBlock}>
          <Ionicons name="alert-circle" size={13} color="#e17055" />
          <Text style={[styles.correctionExplanation, { color: colors.text, flex: 1 }]}>{lessonFeedback.correction}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tutorNote: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, marginHorizontal: 16 },
  tutorNoteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tutorNoteTitle: { fontSize: 12, fontWeight: '800', color: '#e17055', marginLeft: 6, flex: 1 },
  scoreBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  scoreBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  vaultUsageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vaultUsageText: { fontSize: 12, marginLeft: 6, fontWeight: '500' },
  vaultWord: { fontWeight: '800', color: '#05c46b' },
  correctionBlock: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, backgroundColor: '#e1705515', padding: 8, borderRadius: 8 },
  correctionExplanation: { fontSize: 12, marginLeft: 6, fontWeight: '600' },
});
