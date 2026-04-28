import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay 
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { AITutorService, FeedbackCapsule as FeedbackType, Correction } from '../../api/ai_tutor';
import { VaultService } from '../../api/vault';
import { useAppTheme } from '../../context/ThemeContext';

type Phase = 'SELECT_MISSION' | 'CHAT';

interface Mission {
  id: number;
  title: string;
  description: string;
  icon: any;
  color: string;
  scenarioGoal: string;
}

/**
 * Elimina emojis, caracteres especiales y bloques no-ASCII que rompen
 * los motores TTS nativos de iOS y Android.
 */
const cleanTextForSpeech = (rawText: string): string => {
  return rawText
    // Eliminar emojis y símbolos Unicode extendidos
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Eliminar caracteres de control y bloques especiales
    .replace(/[\u0080-\u009F]/g, '')
    // Eliminar corchetes con instrucciones internas tipo [INSTRUCCIÓN...]
    .replace(/\[.*?\]/g, '')
    // Conservar solo texto, puntuación básica y espacios
    .replace(/[^\w\s.,!?;:'\-()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  translation?: string;
  feedback?: FeedbackType;
  corrections?: Correction[];
  suggested_reply_en?: string;
  suggested_reply_es?: string;
}

// Tutor Note: shows inline corrections with a teacher-style left border
const TutorNote = ({ corrections }: { corrections: Correction[] }) => {
  const { colors, isDarkMode } = useAppTheme();
  if (!corrections || corrections.length === 0) return null;
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
      </View>
      {corrections.map((c, i) => (
        <View key={i} style={i > 0 && { marginTop: 8 }}>
          <View style={styles.correctionRow}>
            <Text style={styles.correctionWrong}>{c.original}</Text>
            <Ionicons name="arrow-forward" size={11} color="#95a5a6" style={{ marginHorizontal: 5 }} />
            <Text style={styles.correctionRight}>{c.corrected}</Text>
          </View>
          <Text style={[styles.correctionExplanation, { color: colors.text }]}>{c.explanation}</Text>
        </View>
      ))}
    </View>
  );
};

const TypingBubble = () => {
  const { colors } = useAppTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv: Animated.SharedValue<number>, delay: number) => {
      sv.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        true
      ));
    };
    anim(dot1, 0);
    anim(dot2, 150);
    anim(dot3, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each dot needs its own top-level useAnimatedStyle call (Rules of Hooks)
  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={[styles.aiBubble, styles.typingBubble, { backgroundColor: colors.card }]}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style1]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style2]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, style3]} />
    </View>
  );
};

export default function AIScenario({ onComplete, userId }: { onComplete: () => void; userId: string }) {
  const { colors, isDarkMode } = useAppTheme();
  const [phase, setPhase] = useState<Phase>('SELECT_MISSION');
  const [vaultWords, setVaultWords] = useState<string[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [turnCount, setTurnCount] = useState(1);
  const [visibleTranslations, setVisibleTranslations] = useState<{[key: string]: boolean}>({});
  const [currentHint, setCurrentHint] = useState<{ en: string; es: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [perfectGrammarMsgId, setPerfectGrammarMsgId] = useState<string | null>(null);
  const [bonusExpVisible, setBonusExpVisible] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Misiones de rol estáticas — cubren escenarios universales de A1/A2
  const MISSIONS: Mission[] = [
    {
      id: 1,
      title: "Coffee Shop",
      description: "Ordena tu desayuno favorito",
      icon: "cafe",
      color: "#e17055",
      scenarioGoal: "Role-play: the student is ordering breakfast at a coffee shop. Use food and drink vocabulary.",
    },
    {
      id: 2,
      title: "New Friend",
      description: "Preséntate a alguien nuevo",
      icon: "people",
      color: "#0984e3",
      scenarioGoal: "Role-play: the student is meeting someone new and introducing themselves. Use greetings, hobbies, and basic personal info vocabulary.",
    },
    {
      id: 3,
      title: "City Explorer",
      description: "Pide direcciones en la ciudad",
      icon: "map",
      color: "#00b894",
      scenarioGoal: "Role-play: the student is lost in a city and needs to ask for and understand directions. Use location and direction vocabulary.",
    },
    {
      id: 4,
      title: "Shopping",
      description: "Compra ropa en una tienda",
      icon: "bag-handle",
      color: "#6c5ce7",
      scenarioGoal: "Role-play: the student is shopping for clothes. Use clothing, sizes, colors, and price vocabulary.",
    },
  ];

  useEffect(() => {
    if (phase === 'CHAT' && messages.length > 0) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length, phase]);

  useEffect(() => {
    const loadVault = async () => {
      setLoading(true);
      try {
        const words = await VaultService.getWords(userId);
        const learning = words.filter(w => w.status !== 'mastered');
        setVaultWords(learning.map(w => w.word_en));
      } catch {
        setVaultWords([]);
      } finally {
        setLoading(false);
      }
    };
    loadVault();
  }, [userId]);

  const handleStartMission = async (mission: Mission) => {
    setActiveMission(mission);
    setPhase('CHAT');
    setLoading(true);
    setMessages([]);
    setTurnCount(1);
    setCurrentHint(null);

    const vaultContext = vaultWords.length > 0
      ? `Also, try to naturally incorporate some of these vocabulary words from the student's personal vault: [${vaultWords.slice(0, 5).join(', ')}].`
      : 'The student is a complete beginner. Use only the most basic vocabulary.';

    try {
      const iceBreaker = await AITutorService.getLessonResponse(
        [],
        `${mission.scenarioGoal} ${vaultContext}`,
        vaultWords,
        0
      );
      const firstMsg: Message = {
        id: '1',
        text: iceBreaker.text,
        sender: 'ai',
        translation: iceBreaker.translation,
      };
      setMessages([firstMsg]);
      const enHint = iceBreaker.suggested_reply_en || iceBreaker.suggested_reply || null;
      const esHint = iceBreaker.suggested_reply_es || null;
      if (enHint) setCurrentHint({ en: enHint, es: esHint ?? '' });
      else setCurrentHint(null);
      console.log("\ud83d\udfe2 [CHAT] Ice-Breaker generado para misión:", mission.title);
    } catch {
      const fallbackText = `Hi! I'm Coach Raccoon. Let's practice your English together! ${mission.scenarioGoal.split('.')[0]}. Are you ready?`;
      setMessages([{ id: '1', text: fallbackText, sender: 'ai', translation: '¡Hola! Soy el Coach Raccoon. ¡Practiquemos inglés juntos! ¿Estás listo?' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTranslation = (msgId: string) => {
    setVisibleTranslations(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading || turnCount > 5) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText, sender: 'user' };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const response = await AITutorService.getLessonResponse(
        newMessages,
        activeMission?.scenarioGoal ?? 'General English conversation practice.',
        vaultWords,
        turnCount
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        translation: response.translation,
        feedback: response.feedbackCapsule,
        corrections: response.corrections,
        suggested_reply_en: response.suggested_reply_en,
        suggested_reply_es: response.suggested_reply_es,
      };

      // Detección de gramática perfecta (basada en ausencia de correcciones)
      const hasPerfectGrammar = !response.corrections || response.corrections.length === 0;
      const isPerfect = hasPerfectGrammar && (response.feedbackCapsule?.grammar?.toLowerCase().includes('perfecto') ||
        response.feedbackCapsule?.grammar?.toLowerCase().includes('excelente') ||
        response.feedbackCapsule?.grammar?.toLowerCase().includes('correcto') ||
        response.feedbackCapsule?.grammar?.toLowerCase().includes('sin errores') ||
        hasPerfectGrammar);
      if (isPerfect) {
        setPerfectGrammarMsgId(userMsg.id);
        setBonusExpVisible(true);
        console.log("\ud83d\udfe3 [CHAT] Gramática perfecta detectada, otorgando bonus de EXP");
        setTimeout(() => setBonusExpVisible(false), 3000);
      } else {
        setPerfectGrammarMsgId(null);
      }

      setMessages(prev => [...prev, aiMsg]);
      setTurnCount(prev => prev + 1);
      const enHint = response.suggested_reply_en || response.suggested_reply || null;
      const esHint = response.suggested_reply_es || null;
      if (enHint) { setCurrentHint({ en: enHint, es: esHint ?? '' }); setShowHint(false); }
      else setCurrentHint(null);
    } catch (error) {
      console.error("AI Lesson Error:", error);
      const systemError: Message = {
        id: 'error-' + Date.now(),
        text: "Error de conexión. Por favor, intenta enviar tu mensaje de nuevo.",
        sender: 'ai'
      };
      setMessages(prev => [...prev, systemError]);
    } finally {
      setLoading(false);
    }
  };

  const renderPhase = () => {
    if (loading && phase !== 'CHAT') {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#575fcf" />
          <Text style={styles.loadingText}>Cargando tu sesión...</Text>
        </View>
      );
    }

    if (phase === 'SELECT_MISSION') {
      return (
        <ScrollView contentContainerStyle={styles.selectionContainer}>
          <Text style={[styles.phaseTitle, { color: colors.text }]}>Elige tu Misión 🎯</Text>
          <Text style={styles.phaseSubtitle}>1 toque · IA te da el primer mensaje</Text>
          <View style={styles.missionGrid}>
            {MISSIONS.map((mission, i) => (
              <TouchableOpacity
                key={mission.id}
                style={[
                  styles.missionCard,
                  styles.cardShadow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  i === 0 && styles.missionCardWide,
                ]}
                onPress={() => handleStartMission(mission)}
                activeOpacity={0.85}
              >
                <View style={[styles.missionIconBg, { backgroundColor: mission.color + '20' }]}>
                  <Ionicons name={mission.icon} size={32} color={mission.color} />
                </View>
                <Text style={[styles.missionTitle, { color: colors.text }]}>{mission.title}</Text>
                <Text style={[styles.missionDesc, { color: colors.text }]}>{mission.description}</Text>
                <View style={[styles.missionStartBadge, { backgroundColor: mission.color }]}>
                  <Text style={styles.missionStartLabel}>▶ Empezar</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }

    // CHAT Phase
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.progressHeader, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => setPhase('SELECT_MISSION')} style={styles.backLinkBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.progressText, { color: colors.accent }]}>{activeMission?.title} · Turno {Math.min(turnCount, 5)} de 5</Text>
            <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5' }]}>
              <View style={[styles.progressFill, { width: `${(Math.min(turnCount, 5) / 5) * 100}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView 
          ref={scrollRef}
          style={styles.chatContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <View key={m.id} style={styles.messageWrapper}>
              {/* Tutor Note: corrections shown just above the AI bubble */}
              {m.sender === 'ai' && m.corrections && m.corrections.length > 0 && (
                <TutorNote corrections={m.corrections} />
              )}
              
              <View style={[
                styles.bubble,
                m.sender === 'user'
                  ? [styles.userBubble, { backgroundColor: colors.accent }, perfectGrammarMsgId === m.id && styles.perfectBubble]
                  : [styles.aiBubble, { backgroundColor: colors.card }]
              ]}>
                {m.sender === 'ai' && (
                  <TouchableOpacity 
                    style={[styles.speakerIcon, speakingMsgId === m.id && { opacity: 1 }]} 
                    onPress={() => {
                      const cleanText = cleanTextForSpeech(m.text);
                      console.log("\ud83d\udd0a [SPEECH] Solicitando audio para:", cleanText);
                      Speech.stop();
                      setSpeakingMsgId(m.id);
                      setTimeout(() => {
                        Speech.speak(cleanText, { 
                          language: 'en-US', 
                          pitch: 1.0, 
                          rate: 0.85,
                          onDone: () => setSpeakingMsgId(null),
                          onError: () => setSpeakingMsgId(null),
                          onStopped: () => setSpeakingMsgId(null),
                        });
                      }, 100);
                    }}
                  >
                    <Ionicons 
                      name={speakingMsgId === m.id ? 'volume-high' : 'volume-medium'} 
                      size={18} 
                      color={speakingMsgId === m.id ? '#05c46b' : colors.accent} 
                    />
                  </TouchableOpacity>
                )}
                {m.sender === 'user' && perfectGrammarMsgId === m.id && (
                  <Text style={styles.perfectLabel}>✨ Perfecto</Text>
                )}
                <Text style={m.sender === 'user' ? styles.messageText : [styles.aiMessageText, { color: colors.text }]}>
                  {m.text}
                </Text>
                
                {m.sender === 'ai' && m.translation && (
                  <View style={[styles.translationContainer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity onPress={() => toggleTranslation(m.id)} style={styles.translateBtn}>
                      <Ionicons name="language" size={16} color="#95a5a6" />
                      <Text style={styles.translateBtnText}>Traducir</Text>
                    </TouchableOpacity>
                    
                    {visibleTranslations[m.id] && (
                      <Text style={[styles.translationText, { color: colors.text, opacity: 0.8 }]}>{m.translation}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {loading && messages[messages.length - 1]?.sender === 'user' && (
            <TypingBubble />
          )}

          {turnCount > 5 && !loading && (
            <View style={styles.completionContainer}>
              <Text style={styles.completionTitle}>¡Lección Completada!</Text>
              <TouchableOpacity style={[styles.primaryBtn, styles.cardShadow]} onPress={onComplete}>
                <Text style={styles.primaryBtnText}>Terminar y Recoger Recompensas</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {turnCount <= 5 && (
          <View>
            {bonusExpVisible && (
              <View style={styles.bonusExpBanner}>
                <Text style={styles.bonusExpText}>✨ +5 EXP · Gramática Perfecta</Text>
              </View>
            )}

            {/* Dual-language hint banner */}
            {showHint && currentHint && (
              <TouchableOpacity
                style={[styles.hintInline, { backgroundColor: isDarkMode ? '#1e1a2e' : '#f3eeff', borderColor: isDarkMode ? '#4b2c6e' : '#ddd2f8' }]}
                onPress={() => {
                  console.log("\ud83d\udfe1 [CHAT] Pista inyectada en el input:", currentHint.en);
                  setInputText(currentHint.en);
                  setShowHint(false);
                  inputRef.current?.focus();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="bulb" size={14} color="#f1c40f" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hintInlineText, { color: colors.text }]}>
                    {currentHint.en}
                  </Text>
                  {currentHint.es ? (
                    <Text style={[styles.hintInlineSubtext, { color: colors.text }]}>
                      ({currentHint.es})
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.hintInjectLabel}>Usar →</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Escribe en inglés..."
                placeholderTextColor="#95a5a6"
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!loading}
              />
              {currentHint && (
                <TouchableOpacity 
                  style={[styles.hintButton, { 
                    backgroundColor: showHint ? '#f1c40f' : (isDarkMode ? '#2c2c2c' : '#F0F2F5'),
                    borderColor: showHint ? '#f1c40f' : colors.border 
                  }]}
                  onPress={() => setShowHint(prev => !prev)}
                >
                  <Ionicons name="bulb" size={22} color={showHint ? '#1e1e1e' : '#f1c40f'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.sendButton, loading && { opacity: 0.5 }]} 
                onPress={sendMessage}
                disabled={loading}
              >
                <Ionicons name="send" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 80}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tiny Lesson</Text>
        <Text style={styles.headerSubtitle}>
          {phase === 'CHAT' ? activeMission?.title ?? 'Tiny Lesson' : 'Práctica Rápida'}
        </Text>
      </View>

      {renderPhase()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
  
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e272e' },
  headerSubtitle: { fontSize: 14, color: '#636e72', marginTop: 2, fontWeight: '600' },
  
  selectionContainer: { padding: 20, paddingBottom: 40 },
  phaseTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 6 },
  phaseSubtitle: { fontSize: 15, color: '#7f8c8d', marginBottom: 24, fontWeight: '500' },

  // Mission selection grid
  missionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  missionCard: {
    width: '47%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  missionCardWide: { width: '100%', minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: 20 },
  missionIconBg: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  missionTitle: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  missionDesc: { fontSize: 12, fontWeight: '600', opacity: 0.55, marginBottom: 14 },
  missionStartBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  missionStartLabel: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  backLink: { padding: 16, alignItems: 'center', marginTop: 8 },
  backLinkText: { color: '#95a5a6', fontSize: 15, fontWeight: '700' },
  backLinkBtn: { padding: 4, marginRight: 12, justifyContent: 'center' },
  
  progressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: '#FFF' },
  progressText: { fontSize: 13, fontWeight: '800', color: '#575fcf', marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#05c46b', borderRadius: 4 },
  
  chatContainer: { flex: 1, padding: 16 },
  messageWrapper: { marginBottom: 20 },
  bubble: { padding: 16, borderRadius: 20, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#575fcf' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F0F2F5' },
  messageText: { fontSize: 17, color: '#FFF', fontWeight: '500' },
  aiMessageText: { fontSize: 17, color: '#2d3436', fontWeight: '500' },
  
  translationContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#dfe4ea', paddingTop: 8 },
  translateBtn: { flexDirection: 'row', alignItems: 'center' },
  translateBtnText: { color: '#95a5a6', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  translationText: { fontSize: 14, color: '#485460', marginTop: 8, fontStyle: 'italic', fontWeight: '500' },
  
  // (feedbackContainer and feedbackHeader styles are defined below in the Tutor Note section)
  
  inputArea: { 
    flexDirection: 'row', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#F0F2F5', 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#2d3436'
  },
  sendButton: { 
    width: 48, 
    height: 48, 
    backgroundColor: '#575fcf', 
    borderRadius: 24, 
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingChat: { padding: 10, alignSelf: 'center' },
  typingBubble: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    alignItems: 'center',
    width: 70,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    marginBottom: 20
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
  
  completionContainer: { padding: 24, alignItems: 'center', marginTop: 16 },
  completionTitle: { fontSize: 24, fontWeight: '900', color: '#05c46b', marginBottom: 24 },
  primaryBtn: { backgroundColor: '#575fcf', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  // Corrections panel and Tutor Note
  feedbackContainer: { 
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ed573',
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  feedbackHeaderText: { marginLeft: 8, fontSize: 13, fontWeight: '800' },
  correctionItem: { paddingVertical: 8 },
  correctionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  correctionWrong: { 
    fontSize: 13, fontWeight: '700', color: '#e74c3c', 
    textDecorationLine: 'line-through', opacity: 0.85 
  },
  correctionRight: { fontSize: 13, fontWeight: '800', color: '#2ed573' },
  correctionExplanation: { fontSize: 12, fontWeight: '500', opacity: 0.75, lineHeight: 18 },

  // Tutor Note (orange teacher-style annotation)
  tutorNote: {
    borderLeftWidth: 4,
    borderLeftColor: '#e17055',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tutorNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tutorNoteTitle: { fontSize: 12, fontWeight: '800', color: '#e17055', letterSpacing: 0.5 },

  // Perfect grammar reward
  perfectBubble: { borderWidth: 2, borderColor: '#2ed573' },
  perfectLabel: { fontSize: 11, fontWeight: '800', color: '#2ed573', marginBottom: 4 },
  bonusExpBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#05c46b',
    alignItems: 'center',
  },
  bonusExpText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  // Hint inline bar
  hintInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  hintInlineText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  hintInlineSubtext: { fontSize: 11, fontWeight: '500', opacity: 0.6, marginTop: 2 },
  hintInjectBtn: { backgroundColor: '#575fcf', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  hintInjectLabel: { color: '#575fcf', fontSize: 12, fontWeight: '900' },

  speakerIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10
  },
  hintButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  hintModal: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  hintModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  hintModalLabel: { fontSize: 13, fontWeight: '800' },
  hintModalText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },

  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
});

