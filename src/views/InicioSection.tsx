import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StreakData } from '../api/missions';
import { AITutorService } from '../api/ai_tutor';
import { useAppTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { StreakPanel } from '../components/common/StreakPanel';
import ProgressCircle from '../components/ProgressCircle';

const getGreeting = () => {
  const hours = new Date().getHours();
  if (hours < 12) return '¡Buenos días';
  if (hours < 18) return '¡Buenas tardes';
  return '¡Buenas noches';
};

export default function InicioSection({ streak, user }: { streak: StreakData | null, user: any }) {
  const { colors } = useAppTheme();
  const { username } = useUser();
  const [miniLesson, setMiniLesson] = useState<{title: string, explanation: string, exampleEn: string, exampleEs: string} | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);

  useEffect(() => {
    AITutorService.getMiniLesson().then(lesson => {
      setMiniLesson(lesson);
      setLoadingLesson(false);
    });
  }, []);

  const displayName = username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Amigo';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionPadding}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            {getGreeting()}, <Text style={{ color: colors.accent }}>{displayName}</Text>! 👋
          </Text>
        </View>
        <ProgressCircle 
          percentage={75} 
          size={64} 
          color={colors.accent} 
          level="3" 
        />
      </View>
      
      <StreakPanel streak={streak} />

      <View style={styles.coachContext}>
        <View style={[styles.raccoonAvatar, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={{ fontSize: 32 }}>🦝</Text>
        </View>
        <View style={[styles.chatBubble, styles.cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.coachName, { color: colors.accent }]}>Coach Raccoon</Text>
          {loadingLesson ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
          ) : (
            <>
              <Text style={[styles.lessonTitle, { color: colors.accent }]}>
                {miniLesson?.title}
              </Text>
              <Text style={[styles.coachMsg, { color: colors.text }]}>
                {miniLesson?.explanation}
              </Text>
              <View style={[styles.exampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.exampleEn, { color: colors.text }]}>&quot;{miniLesson?.exampleEn}&quot;</Text>
                <Text style={[styles.exampleEs, { color: colors.text }]}>{miniLesson?.exampleEs}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionPadding: { padding: 20, paddingBottom: 130 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  greetingText: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  coachContext: { flexDirection: 'row', marginTop: 32, alignItems: 'flex-start' },
  raccoonAvatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  chatBubble: { flex: 1, marginLeft: 16, padding: 18, borderRadius: 22, borderTopLeftRadius: 4, minHeight: 80 },
  coachName: { fontWeight: '900', marginBottom: 6, fontSize: 15 },
  coachMsg: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  lessonTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  exampleBox: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  exampleEn: { fontWeight: 'bold', fontSize: 13, fontStyle: 'italic', marginBottom: 2 },
  exampleEs: { fontSize: 12, opacity: 0.8 },
});
