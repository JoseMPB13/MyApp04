import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { MissionsService, StreakData } from '../api/missions';
import { AITutorService } from '../api/ai_tutor';
import { useAppTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { StreakPanel } from '../components/common/StreakPanel';
import ProgressCircle from '../components/ProgressCircle';
import { Ionicons } from '@expo/vector-icons';

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
  
  // Real user progress state
  const [progress, setProgress] = useState<{ total_exp: number, current_level: number }>({ total_exp: 0, current_level: 1 });

  useEffect(() => {
    const loadLesson = async () => {
      try {
        const CACHE_KEY = 'daily_lesson_cache';
        const today = new Date().toLocaleDateString('en-CA');
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        
        if (cached) {
          const { lesson, date } = JSON.parse(cached);
          if (date === today) {
            setMiniLesson(lesson);
            setLoadingLesson(false);
            return;
          }
        }

        // Si no hay caché o es de otro día, pedir nueva
        const newLesson = await AITutorService.getMiniLesson();
        setMiniLesson(newLesson);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ lesson: newLesson, date: today }));
      } catch (error) {
        console.error('Error loading daily lesson:', error);
      } finally {
        setLoadingLesson(false);
      }
    };

    loadLesson();

    // Fetch real progress from Supabase
    if (user?.id) {
      MissionsService.getUserProgress(user.id).then(data => {
        setProgress(data);
      });
    }
  }, [user?.id]);

  const displayName = username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Amigo';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionPadding}>
      {/* Fixed layout transition to avoid infinite bounce issues */}
      <Animated.View layout={LinearTransition.duration(250)}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              {getGreeting()}, <Text style={{ color: colors.accent }}>{displayName}</Text>! 👋
            </Text>
          </View>
          <ProgressCircle 
            percentage={progress.total_exp % 100} 
            size={64} 
            color={colors.accent} 
            level={progress.current_level} 
          />
        </View>
        
        <StreakPanel streak={streak} />

        <Animated.View 
          style={styles.coachContext} 
          layout={LinearTransition.duration(250)}
        >
          <View style={[styles.raccoonAvatar, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <Text style={{ fontSize: 32 }}>🦝</Text>
          </View>
          <View style={[styles.chatBubble, styles.cardShadow, { backgroundColor: colors.card }]}>
            <View style={styles.lessonHeader}>
              <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.coachName, { color: colors.accent }]}>Lección del Día</Text>
            </View>
            
            {loadingLesson ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            ) : (
              <>
                <Text style={[styles.lessonTitle, { color: colors.text }]}>
                  {miniLesson?.title}
                </Text>
                <Text style={[styles.coachMsg, { color: colors.text, opacity: 0.8 }]}>
                  {miniLesson?.explanation}
                </Text>
                <View style={[styles.exampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.exampleLabel, { color: colors.accent }]}>EJEMPLO:</Text>
                  <Text style={[styles.exampleEn, { color: colors.text }]}>&quot;{miniLesson?.exampleEn}&quot;</Text>
                  <Text style={[styles.exampleEs, { color: colors.text }]}>{miniLesson?.exampleEs}</Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Animated.View>
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
  chatBubble: { flex: 1, marginLeft: 16, padding: 20, borderRadius: 24, borderTopLeftRadius: 4 },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  coachName: { fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  lessonTitle: { fontWeight: '900', fontSize: 20, marginBottom: 12, letterSpacing: -0.6 },
  coachMsg: { fontSize: 16, lineHeight: 24, fontWeight: '500', marginBottom: 6, opacity: 0.9 },
  exampleBox: { marginTop: 18, padding: 18, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed' },
  exampleLabel: { fontSize: 11, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', opacity: 0.6 },
  exampleEn: { fontWeight: '900', fontSize: 18, marginBottom: 6, letterSpacing: -0.3 },
  exampleEs: { fontSize: 14, fontWeight: '600', opacity: 0.6 },
});
