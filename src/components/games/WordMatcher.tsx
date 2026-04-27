import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VaultService } from '../../api/vault';
import { AITutorService } from '../../api/ai_tutor';
import { useAppTheme } from '../../context/ThemeContext';

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}



interface WordPair {
  id: string; // The database id, or index if fallback
  word: string; // Spanish
  translation: string; // English
  matchId: number;
  inVault?: boolean;
}

interface Card {
  id: string; // unique card id e.g. "es-1"
  content: string;
  matchId: number;
  type: 'es' | 'en';
}

export default function WordMatcher({ 
  words = [], 
  userId,
  level,
  exp,
  onComplete 
}: { 
  words: WordPair[], 
  userId: string,
  level: number,
  exp: number,
  onComplete: (matchedWords: WordPair[], maxCombo: number) => void 
}) {
  const { colors, isDarkMode } = useAppTheme();
  const [esCards, setEsCards] = useState<Card[]>([]);
  const [enCards, setEnCards] = useState<Card[]>([]);
  
  const [selectedEs, setSelectedEs] = useState<Card | null>(null);
  const [selectedEn, setSelectedEn] = useState<Card | null>(null);
  
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [wrongEs, setWrongEs] = useState<Card | null>(null);
  const [wrongEn, setWrongEn] = useState<Card | null>(null);

  const [showSummary, setShowSummary] = useState(false);
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const safeSetTimeout = (cb: () => void, delay: number) => {
    const id = setTimeout(cb, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  // Initialize
  useEffect(() => {
    if (words.length === 0) return;

    const esList: Card[] = [];
    const enList: Card[] = [];
    const alreadySaved: string[] = [];
    
    words.forEach(p => {
      esList.push({ id: `es-${p.matchId}`, content: p.word, matchId: p.matchId, type: 'es' });
      enList.push({ id: `en-${p.matchId}`, content: p.translation, matchId: p.matchId, type: 'en' });
      if (p.inVault) {
        alreadySaved.push(p.id);
      }
    });
    
    setEsCards(shuffleArray(esList));
    setEnCards(shuffleArray(enList));
    setSavedWords(alreadySaved);
  }, [words]);

  // Main Matching Logic
  useEffect(() => {
    if (selectedEs && selectedEn) {
      if (selectedEs.matchId === selectedEn.matchId) {
        // MATCH!
        setCombo(prev => {
          const newCombo = prev + 1;
          setMaxCombo(m => Math.max(m, newCombo));
          return newCombo;
        });
        const mId = selectedEs.matchId;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        safeSetTimeout(() => {
          setMatchedIds(prev => {
            const next = [...prev, mId];
            if (next.length === words.length && words.length > 0) {
              safeSetTimeout(() => setShowSummary(true), 600);
            }
            return next;
          });
          setSelectedEs(null);
          setSelectedEn(null);
        }, 300);
        
      } else {
        // ERROR
        setCombo(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const wEs = selectedEs;
        const wEn = selectedEn;
        setWrongEs(wEs);
        setWrongEn(wEn);
        setSelectedEs(null);
        setSelectedEn(null);
        
        safeSetTimeout(() => {
          setWrongEs(null);
          setWrongEn(null);
        }, 800);
      }
    }
  }, [selectedEs, selectedEn, words.length]);

  const handleSelect = (card: Card) => {
    // If it's already matched, or wait state is active
    if (matchedIds.includes(card.matchId) || (wrongEs !== null)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (card.type === 'en') {
      Speech.speak(card.content, { language: 'en-US' });
    }
    
    if (card.type === 'es') {
      // Toggle off if same
      if (selectedEs?.id === card.id) setSelectedEs(null);
      else setSelectedEs(card);
    } else {
      if (selectedEn?.id === card.id) setSelectedEn(null);
      else setSelectedEn(card);
    }
  };

  const handleSaveToVault = async (pair: WordPair) => {
    if (savedWords.includes(pair.id) || savingId !== null) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavingId(pair.id);

    try {
      // Auto classify
      const generatedCategory = await AITutorService.categorizeVaultWord(pair.translation, pair.word);
      
      const newWord = {
        user_id: userId,
        word_en: pair.translation,
        word_es: pair.word,
        category: generatedCategory,
        status: 'learning' as const
      };

      const res = await VaultService.addVaultItem(newWord);
      
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSavedWords(prev => [...prev, pair.id]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      console.error("Error saving word", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingId(null);
    }
  };

  const renderCard = (card: Card) => {
    const isEs = card.type === 'es';
    const isSelected = isEs ? selectedEs?.id === card.id : selectedEn?.id === card.id;
    const isWrong = isEs ? wrongEs?.id === card.id : wrongEn?.id === card.id;
    const isMatched = matchedIds.includes(card.matchId);

    return (
      <TouchableOpacity
        key={card.id}
        onPress={() => handleSelect(card)}
        disabled={isMatched}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isSelected && [styles.cardSelected, { borderColor: colors.accent, backgroundColor: isDarkMode ? '#28285c' : '#f8f9ff' } ],
          isMatched && [styles.cardMatched, isDarkMode && { backgroundColor: '#1c4a30' }],
          isWrong && [styles.cardWrong, isDarkMode && { backgroundColor: '#4a1515' }]
        ]}
      >
        <Text style={[
          styles.cardText, 
          { color: colors.text },
          isSelected && [styles.cardTextActive, { color: colors.accent }],
          isMatched && styles.cardTextMatched,
          isWrong && styles.cardTextWrong
        ]}>
          {card.content}
        </Text>
      </TouchableOpacity>
    );
  };

  if (showSummary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.titleSuccess, isDarkMode && { color: '#2ed573' }]}>¡Victoria! 🎉</Text>
        <View style={styles.expContainer}>
          <Text style={[styles.expText, { color: colors.text }]}>Nivel {level} • {exp % 100}/100 EXP</Text>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${exp % 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.expGainText}>+{25 + maxCombo * 5} EXP ganados (Combo: {maxCombo}x)</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>Has emparejado las palabras correctamente. Guárdalas en tu baúl para no olvidarlas.</Text>
        
        <ScrollView style={{ width: '100%', marginTop: 10 }}>
          {words.map(w => {
            const isSaved = savedWords.includes(w.id);
            const isSavingThis = savingId === w.id;

            return (
              <View key={w.id} style={[styles.summaryRow, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryInfo}>
                  <Text style={[styles.summaryWordEs, { color: colors.text }]}>{w.word}</Text>
                  <Text style={[styles.summaryWordEn, { color: colors.accent }]}>{w.translation}</Text>
                </View>
                {w.inVault ? (
                  <View style={styles.inVaultBadge}>
                    <Text style={styles.inVaultText}>En tu baúl 💎</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => handleSaveToVault(w)} 
                    style={[styles.saveBtn, isSaved && styles.savedBtn]}
                    disabled={isSaved || isSavingThis}
                  >
                    {isSavingThis ? (
                      <ActivityIndicator color="#575fcf" size="small" />
                    ) : (
                      <Ionicons 
                        name={isSaved ? "bookmark" : "bookmark-outline"} 
                        size={24} 
                        color={isSaved ? "#FFF" : colors.accent} 
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.primaryBtn, styles.cardShadow, { backgroundColor: colors.accent }]} 
          onPress={() => onComplete(words, maxCombo)}
        >
          <Text style={styles.primaryBtnText}>Siguiente Nivel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Nivel {level} - Empareja</Text>
      
      <View style={styles.columnsContainer}>
        {/* English Column (Left) */}
        <Animated.View style={styles.column} entering={FadeInDown.delay(100).springify()}>
          {enCards.map(c => renderCard(c))}
        </Animated.View>

        {/* Spanish Column (Right) */}
        <Animated.View style={styles.column} entering={FadeInDown.delay(200).springify()}>
          {esCards.map(c => renderCard(c))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 20 },
  titleSuccess: { fontSize: 26, fontWeight: '900', color: '#05c46b', marginBottom: 8, marginTop: 20 },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 20, textAlign: 'center', paddingHorizontal: 10 },
  
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  column: {
    flex: 1,
    paddingHorizontal: 8,
  },
  
  card: {
    width: '100%',
    minHeight: 64,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#eef1ff',
    borderBottomWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
    })
  },
  cardSelected: { borderColor: '#575fcf', backgroundColor: '#f8f9ff', opacity: 1 },
  // Animamos 'haciendo invisible' cuando se completan
  cardMatched: { borderColor: '#05c46b', backgroundColor: '#ebfdf2', opacity: 0.4, borderBottomWidth: 2 },
  cardWrong: { borderColor: '#ff4757', backgroundColor: '#fff2f2' },
  
  cardText: { fontSize: 15, fontWeight: '800', color: '#2d3436', textAlign: 'center' },
  cardTextActive: { color: '#575fcf' },
  cardTextMatched: { color: '#05c46b' },
  cardTextWrong: { color: '#ff4757' },

  // Summary Styles
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F2F6',
    borderBottomWidth: 4,
  },
  summaryInfo: { flex: 1 },
  summaryWordEs: { fontSize: 18, fontWeight: '900', color: '#1e272e' },
  summaryWordEn: { fontSize: 15, color: '#575fcf', fontWeight: '700', marginTop: 2 },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBtn: {
    backgroundColor: '#05c46b',
  },
  primaryBtn: {
    backgroundColor: '#575fcf',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  
  inVaultBadge: {
    backgroundColor: 'rgba(5, 196, 107, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(5, 196, 107, 0.3)',
  },
  inVaultText: {
    color: '#05c46b',
    fontSize: 12,
    fontWeight: '800',
  },

  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  expContainer: { width: '100%', alignItems: 'center', marginVertical: 15 },
  expText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  progressBarBg: { width: '80%', height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  expGainText: { fontSize: 12, fontWeight: '600', color: '#2ed573', marginTop: 5 },
});
