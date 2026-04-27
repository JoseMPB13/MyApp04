import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StreakData } from '../../api/missions';
import { useAppTheme } from '../../context/ThemeContext';

const DAYS_NAMES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const isCompleted = (date: Date, streak: StreakData | null) => {
  if (!streak || !streak.last_completion_date) return false;
  
  const activeStreak = streak.historical_streak ?? streak.current_streak;
  if (activeStreak === 0) return false;

  const [year, month, day] = streak.last_completion_date.split('-').map(Number);
  const lastDate = new Date(year, month - 1, day);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (target > lastDate) return false;
  
  const diffTime = lastDate.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays < activeStreak;
};

export const StreakPanel = ({ streak }: { streak: StreakData | null }) => {
  const { colors } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewDate] = useState(new Date());
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const getStreakMessage = (days: number) => {
    if (days === 0) return '¡Hora de empezar!';
    if (days >= 1 && days <= 3) return '¡Buen comienzo!';
    if (days >= 4 && days <= 7) return '¡En racha!';
    return '¡Racha imparable!';
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    
    const paddingDays = Array.from({ length: firstDayIndex }).map((_, i) => (
      <View key={`pad-${i}`} style={[styles.calendarDay, { backgroundColor: 'transparent' }]} />
    ));
    
    const monthDays = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = new Date(year, month, i + 1);
      const isDone = isCompleted(d, streak);
      const isToday = new Date().toDateString() === d.toDateString();
      
      return (
        <View key={i} style={[
          styles.calendarDay,
          { backgroundColor: colors.border },
          isDone ? styles.calendarDayDone : null,
          isToday && !isDone ? { borderWidth: 2, borderColor: colors.accent } : null
        ]}>
          <Text style={[styles.calendarDayText, { color: colors.text }, isDone ? { color: '#FFF' } : null]}>{i + 1}</Text>
        </View>
      );
    });

    const weekHeader = DAYS_NAMES.map((d, i) => (
      <View key={`hdr-${i}`} style={[styles.calendarDay, { backgroundColor: 'transparent', height: 20 }]}>
         <Text style={{ fontSize: 10, color: '#A4B0BE', fontWeight: 'bold' }}>{d}</Text>
      </View>
    ));

    return [
      ...weekHeader,
      ...paddingDays,
      ...monthDays
    ];
  };

  return (
    <View style={styles.cardShadow}>
      <TouchableOpacity activeOpacity={0.9} onPress={toggleExpand} style={styles.streakPanel}>
        <LinearGradient colors={['#575fcf', '#3c40c6']} style={styles.streakGradient}>
          <View style={styles.streakInfo}>
            <View style={styles.streakIconMain}>
              <Ionicons name="flame" size={30} color="#FFF" />
            </View>
            <View>
              <Text style={styles.streakCount}>{streak?.current_streak || 0} Días</Text>
              <Text style={styles.streakSub}>{getStreakMessage(streak?.current_streak || 0)}</Text>
            </View>
          </View>

          <View style={styles.weeklyRow}>
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dayLabel = DAYS_NAMES[d.getDay()];
              const isDone = isCompleted(d, streak);
              
              return (
                <View key={i} style={styles.weekDay}>
                  <Text style={styles.weekDayLabel}>{dayLabel}</Text>
                  <View style={[styles.weekDayCircle, isDone ? styles.doneDay : styles.pendingDay]}>
                    {isDone ? <Ionicons name="checkmark" size={16} color="#FFF" /> : <View style={styles.emptyDot} />}
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.expandHint}>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.tapToExpand}>{isExpanded ? 'Ver menos' : 'Ver historial completo'}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Animated.View style={[styles.expandedContainer, { backgroundColor: colors.card, height: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }), opacity: expandAnim }]}>
        <View style={styles.calendarFull}>
           <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
           <View style={styles.calendarGrid}>
             {renderCalendarGrid()}
           </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  streakPanel: { borderRadius: 28, overflow: 'hidden' },
  streakGradient: { padding: 24 },
  streakInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  streakIconMain: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  streakCount: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  streakSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  weekDay: { alignItems: 'center' },
  weekDayLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  weekDayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  doneDay: { backgroundColor: '#05c46b' },
  pendingDay: { backgroundColor: 'rgba(255,255,255,0.15)' },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  expandHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  tapToExpand: { color: '#FFF', fontSize: 12, fontWeight: '800', opacity: 0.9 },
  expandedContainer: { backgroundColor: '#FFF', borderRadius: 28, marginTop: 12, overflow: 'hidden' },
  calendarFull: { padding: 20 },
  monthTitle: { fontSize: 18, fontWeight: '900', color: '#2f3542', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'flex-start' },
  calendarDay: { width: '13%', aspectRatio: 1, margin: '0.6%', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#f1f2f6' },
  calendarDayDone: { backgroundColor: '#05c46b' },
  calendarDayToday: { borderWidth: 2, borderColor: '#575fcf' },
  calendarDayText: { fontSize: 13, fontWeight: '700', color: '#2f3542' },
});
