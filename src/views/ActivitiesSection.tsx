import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VaultService } from '../api/vault';
import { MissionsService } from '../api/missions';
import { AITutorService } from '../api/ai_tutor';
import WordMatcher from '../components/games/WordMatcher';
import AIScenario from '../components/games/AIScenario';
import { useAppTheme } from '../context/ThemeContext';

interface ActivitiesSectionProps {
  userId: string;
  onComplete: (missionType: string, data?: any) => void;
  onMissionStateChange: (active: boolean) => void;
}

const ActivitiesSection = ({ userId, onComplete, onMissionStateChange }: ActivitiesSectionProps) => {
  const { colors, isDarkMode } = useAppTheme();
  const [currentMission, setCurrentMission] = useState<string | null>(null);
  const [lessonWords, setLessonWords] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExp, setCurrentExp] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentWords, setRecentWords] = useState<string[]>([]);

  const loadLessonWords = async (overrideRecent?: string[]) => {
    setIsGenerating(true);
    try {
      const exp = await MissionsService.getMatcherExp(userId);
      const level = MissionsService.getLevelFromExp(exp);
      setCurrentExp(exp);
      setCurrentLevel(level);
      console.log("🚀 [ACTIVITIES] Iniciando carga de palabras. Exp:", exp, "Nivel:", level);
      
      const currentRecent = overrideRecent || recentWords;
      const vaultWords = await VaultService.getWords(userId);
      const vaultEn = vaultWords.map(w => w.word_en.toLowerCase());
      const shuffledVault = [...vaultEn].sort(() => Math.random() - 0.5).slice(0, 5);
      
      const generated = await AITutorService.generateMatcherLevel(level, shuffledVault, currentRecent);
      
      const mappedGenerated = generated.map((word: any) => ({
        ...word,
        inVault: vaultEn.includes(word.translation.toLowerCase())
      }));
      console.log("📦 [ACTIVITIES] Palabras listas para jugar:", mappedGenerated);
      setLessonWords(mappedGenerated);
    } catch (error) {
      console.error("Error loading level words:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartMission = (type: string) => {
    if (type === 'word-matcher') {
      loadLessonWords();
    }
    onMissionStateChange(true);
    setCurrentMission(type);
  };

  if (currentMission === 'word-matcher') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableOpacity onPress={() => {
          setCurrentMission(null);
          onMissionStateChange(false);
        }} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#575fcf" />
           <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Generando Nivel {currentLevel}...</Text>
          </View>
        ) : (
          <WordMatcher 
            words={lessonWords} 
            userId={userId}
            level={currentLevel}
            exp={currentExp}
            onNextLevel={async (matched, maxCombo) => {
              const expGain = 25 + (maxCombo * 5);
              await MissionsService.addMatcherExp(userId, expGain);
              const newRecent = [...recentWords, ...matched.map(w => w.translation.toLowerCase())].slice(-25);
              setRecentWords(newRecent);
              loadLessonWords(newRecent);
            }}
            onExit={async (matched, maxCombo) => {
              const expGain = 25 + (maxCombo * 5);
              await MissionsService.addMatcherExp(userId, expGain);
              setCurrentMission(null);
              onMissionStateChange(false);
              onComplete('word-matcher', { matched, expGain });
            }} 
          />
        )}
      </View>
    );
  }

  if (currentMission === 'ai-scenario') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableOpacity onPress={() => {
          setCurrentMission(null);
          onMissionStateChange(false);
        }} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#575fcf" />
           <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <AIScenario 
          userId={userId} 
          onComplete={() => onComplete('ai-scenario')} 
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionPadding}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Misiones Diarias</Text>
      <TouchableOpacity 
        style={[styles.missionCard, styles.cardShadow, { backgroundColor: colors.card }]} 
        onPress={() => handleStartMission('word-matcher')}
      >
        <View style={[styles.missionIcon, { backgroundColor: isDarkMode ? '#2c2c54' : '#eef1ff' }]}>
          <Ionicons name="extension-puzzle" size={32} color={colors.accent} />
        </View>
        <View style={styles.missionInfo}>
          <Text style={[styles.missionTitle, { color: colors.text }]}>Word Matcher</Text>
          <Text style={[styles.missionDesc, { color: colors.text, opacity: 0.6 }]}>Empareja palabras y agiliza tu memoria visual</Text>
        </View>
        <Ionicons name="play-circle" size={32} color={colors.accent} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.missionCard, styles.cardShadow, { backgroundColor: colors.card }]}
        onPress={() => handleStartMission('ai-scenario')}
      >
        <View style={[styles.missionIcon, { backgroundColor: isDarkMode ? '#4b2c20' : '#fff2f2' }]}>
          <Ionicons name="chatbubbles" size={32} color="#ff4757" />
        </View>
        <View style={styles.missionInfo}>
          <Text style={[styles.missionTitle, { color: colors.text }]}>Charla con Raccoon</Text>
          <Text style={[styles.missionDesc, { color: colors.text, opacity: 0.6 }]}>Conversa y aprende con tu guía interactivo</Text>
        </View>
        <Ionicons name="play-circle" size={32} color="#ff4757" />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ActivitiesSection;

const styles = StyleSheet.create({
  sectionPadding: { padding: 20, paddingBottom: 130 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 20 },
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  missionCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 16 },
  missionIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  missionDesc: { fontSize: 14, color: '#636e72', marginTop: 2 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '700', color: '#575fcf' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '700', opacity: 0.8 },
});
