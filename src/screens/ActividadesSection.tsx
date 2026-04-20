import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { VaultService } from '../api/vault';
import WordMatcher from '../components/games/WordMatcher';
import AIScenario from './AIScenario';

interface ActividadesSectionProps {
  userId: string;
  onComplete: (missionType: string, data?: any) => void;
  onMissionStateChange: (active: boolean) => void;
}

const ActividadesSection = ({ userId, onComplete, onMissionStateChange }: ActividadesSectionProps) => {
  const [currentMission, setCurrentMission] = useState<string | null>(null);
  const [lessonWords, setLessonWords] = useState<any[]>([]);

  const loadLessonWords = async () => {
    // 1. Cargar hasta 3 palabras que el usuario está aprendiendo del Baúl
    const vaultWords = await VaultService.getWords(userId);
    const shuffledVault = vaultWords.sort(() => Math.random() - 0.5);
    const learningWords = shuffledVault
      .filter(w => w.status !== 'mastered')
      .slice(0, 3);

    // 2. Extraer del vocabulario base para enseñar palabras nuevas
    const amountNeeded = 5 - learningWords.length;
    let baseWords: any[] = [];
    
    const { data: baseVocab } = await supabase
      .from('vocabulary')
      .select('*')
      .limit(20);
      
    if (baseVocab) {
      // Filtrar palabras que el usuario ya tenga en el baúl (para no repetirlas)
      const vaultEn = vaultWords.map(w => w.word_en.toLowerCase());
      const filteredBase = baseVocab.filter(w => !vaultEn.includes(w.word_en.toLowerCase()));
      baseWords = filteredBase.sort(() => Math.random() - 0.5).slice(0, amountNeeded);
    }

    const combined = [...learningWords, ...baseWords];

    const formatted = combined.map((w, index) => ({
      id: w.id || index.toString(),
      word: w.word_es,
      translation: w.word_en,
      matchId: index + 1,
      inVault: learningWords.some(lw => lw.id === w.id)
    }));
    
    setLessonWords(formatted);
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
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => {
          setCurrentMission(null);
          onMissionStateChange(false);
        }} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#575fcf" />
           <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <WordMatcher 
          words={lessonWords} 
          userId={userId}
          onComplete={(matched) => onComplete('word-matcher', matched)} 
        />
      </View>
    );
  }

  if (currentMission === 'ai-scenario') {
    return (
      <View style={{ flex: 1 }}>
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
      <Text style={styles.sectionTitle}>Misiones Diarias</Text>
      <TouchableOpacity 
        style={[styles.missionCard, styles.cardShadow]} 
        onPress={() => handleStartMission('word-matcher')}
      >
        <View style={[styles.missionIcon, { backgroundColor: '#eef1ff' }]}>
          <Ionicons name="extension-puzzle" size={32} color="#575fcf" />
        </View>
        <View style={styles.missionInfo}>
          <Text style={styles.missionTitle}>Word Matcher</Text>
          <Text style={styles.missionDesc}>Empareja el vocabulario de la semana.</Text>
        </View>
        <Ionicons name="play-circle" size={32} color="#575fcf" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.missionCard, styles.cardShadow]}
        onPress={() => handleStartMission('ai-scenario')}
      >
        <View style={[styles.missionIcon, { backgroundColor: '#fff2f2' }]}>
          <Ionicons name="chatbubbles" size={32} color="#ff4757" />
        </View>
        <View style={styles.missionInfo}>
          <Text style={styles.missionTitle}>AI Scenario</Text>
          <Text style={styles.missionDesc}>Practica con tu Tutor IA</Text>
        </View>
        <Ionicons name="play-circle" size={32} color="#ff4757" />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ActividadesSection;

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
});
