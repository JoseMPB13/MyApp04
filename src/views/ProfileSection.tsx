import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, ViewStyle } from 'react-native';
import { supabase } from '../api/supabase';
import { AchievementsService, Achievement, UserAchievement } from '../api/achievements';
import { MissionsService } from '../api/missions';
import { useAppTheme } from '../context/ThemeContext';
import AchievementCard from '../components/AchievementCard';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

const ProfileSection: React.FC = () => {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userProgress, setUserProgress] = useState({ total_exp: 0, current_level: 1, lifetime_xp: 0 });
  const { username, avatarUrl } = useUser();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      const [achievements, userAch, progress] = await Promise.all([
        AchievementsService.getAllAchievements(),
        AchievementsService.getUserAchievements(user.id),
        MissionsService.getUserProgress(user.id)
      ]);

      setAllAchievements(achievements);
      setUserAchievements(userAch);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementsData = useMemo(() => {
    return allAchievements.map(achievement => ({
      ...achievement,
      isUnlocked: userAchievements.some(ua => ua.achievement_id === achievement.id)
    }));
  }, [allAchievements, userAchievements]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={achievementsData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper as ViewStyle}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.raccoonAvatar, { borderColor: colors.accent, backgroundColor: colors.card }]}>
              {avatarUrl ? (
                <Text style={{ fontSize: 42 }}>🖼️</Text> // Aquí iría un Image component con avatarUrl
              ) : (
                <Text style={{ fontSize: 42 }}>🦝</Text>
              )}
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>
              {username || userEmail.split('@')[0]}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="star" size={14} color="#FFF" />
              <Text style={styles.levelText}>Nivel {userProgress.current_level}</Text>
            </View>
            <Text style={[styles.expText, { color: colors.text + '80' }]}>
              {userProgress.total_exp} EXP Total
            </Text>

            <View style={styles.sectionTitleRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Logros y Medallas</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.text + '60' }]}>
                  Tu progreso en la aventura
                </Text>
              </View>
              <View style={[styles.counterBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.counterText, { color: colors.accent }]}>
                  {userAchievements.length}/{allAchievements.length}
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <AchievementCard
            title={item.name}
            description={item.description || ''}
            iconName={item.icon as any || 'star'}
            isUnlocked={item.isUnlocked}
            index={index}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  raccoonAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    marginBottom: 8,
  },
  levelText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 6,
  },
  expText: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
  },
  sectionTitleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 45,
    paddingHorizontal: 4,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '800',
  }
});

export default ProfileSection;
