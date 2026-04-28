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
import { AITutorService, FeedbackCapsule as FeedbackType } from '../../api/ai_tutor';
import { VaultService } from '../../api/vault';
import { useAppTheme } from '../../context/ThemeContext';

type Phase = 'SELECT_CATEGORY' | 'SELECT_TOPIC' | 'CHAT';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  translation?: string;
  feedback?: FeedbackType;
}

const FeedbackCapsule = ({ feedback }: { feedback: FeedbackType }) => {
  const { colors, isDarkMode } = useAppTheme();
  return (
    <View style={[styles.feedbackContainer, { backgroundColor: isDarkMode ? '#281a3a' : '#f8f4ff', borderColor: isDarkMode ? '#4b2c6e' : '#efe5ff' }]}>
      <View style={styles.feedbackHeader}>
        <Ionicons name="bulb" size={20} color={colors.accent} />
        <Text style={[styles.feedbackHeaderText, { color: colors.accent }]}>Análisis de tu mensaje anterior</Text>
      </View>
      <View style={styles.feedbackItem}>
        <Text style={[styles.feedbackLabel, isDarkMode && { color: '#a29bfe' }]}>Gramática:</Text>
        <Text style={[styles.feedbackValue, { color: colors.text }]}>{feedback.grammar}</Text>
      </View>
      <View style={styles.feedbackItem}>
        <Text style={[styles.feedbackLabel, isDarkMode && { color: '#a29bfe' }]}>Vocabulario:</Text>
        <Text style={[styles.feedbackValue, { color: colors.text }]}>{feedback.vocabulary}</Text>
      </View>
      <View style={styles.feedbackItem}>
        <Text style={[styles.feedbackLabel, isDarkMode && { color: '#a29bfe' }]}>Naturalidad:</Text>
        <Text style={[styles.feedbackValue, { color: colors.text }]}>{feedback.naturalness}</Text>
      </View>
    </View>
  );
};

const TypingBubble = () => {
  const { colors } = useAppTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv: any, delay: number) => {
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
  }, []);

  const animatedStyle = (sv: any) => useAnimatedStyle(() => ({
    transform: [{ translateY: sv.value }]
  }));

  return (
    <View style={[styles.aiBubble, styles.typingBubble, { backgroundColor: colors.card }]}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, animatedStyle(dot1)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, animatedStyle(dot2)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.text, opacity: 0.4 }, animatedStyle(dot3)]} />
    </View>
  );
};

export default function AIScenario({ onComplete, userId }: { onComplete: () => void; userId: string }) {
  const { colors, isDarkMode } = useAppTheme();
  const [phase, setPhase] = useState<Phase>('SELECT_CATEGORY');
  const [categories, setCategories] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [vaultWords, setVaultWords] = useState<string[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [turnCount, setTurnCount] = useState(1);
  const [visibleTranslations, setVisibleTranslations] = useState<{[key: string]: boolean}>({});
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (phase === 'CHAT' && messages.length > 0) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length, phase]);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      const words = await VaultService.getWords(userId);
      // Extraer palabras en aprendizaje
      const learning = words.filter(w => w.status !== 'mastered');
      setVaultWords(learning.map(w => w.word_en));

      // Extraer categorías únicas
      let uniqueCategories = Array.from(new Set(learning.map(w => w.category).filter(Boolean))) as string[];
      
      // Fallback si no hay categorías
      if (uniqueCategories.length === 0) {
        uniqueCategories = ['General', 'Viajes', 'Comida'];
      }

      setCategories(uniqueCategories.slice(0, 5)); // Mostrar max 5
      setLoading(false);
    };

    loadCategories();
  }, [userId]);

  const handleSelectCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setPhase('SELECT_TOPIC');
    setLoading(true);
    
    const generatedTopics = await AITutorService.generateTopicsForCategory(cat);
    setTopics(generatedTopics);
    setLoading(false);
  };

  const handleSelectTopic = async (topic: string) => {
    setSelectedTopic(topic);
    setPhase('CHAT');
    setLoading(true);

    try {
      // Ice Breaker: la IA toma la iniciativa y genera la apertura
      const iceBreaker = await AITutorService.getLessonResponse(
        [{ id: 'system-init', text: `[INSTRUCCIÓN INTERNA: Eres Raccoon 🦝, un tutor amigable. Preséntate brevemente y haz UNA pregunta específica y abierta sobre el tema "${topic}" para iniciar la conversación. NO evalúes nada todavía.]`, sender: 'user' }],
        `Tema: ${topic}. Categoría: ${selectedCategory}. ${vaultWords.length === 0 ? 'El usuario es nuevo, usa vocabulario básico.' : `Palabras objetivo del usuario: [${vaultWords.slice(0, 5).join(', ')}].`}`,
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
      if (iceBreaker.nextGoal) setCurrentHint(iceBreaker.nextGoal);
    } catch {
      // Fallback estático si la IA falla
      const fallbackText = vaultWords.length === 0
        ? `Hi, I'm Raccoon 🦝! Your vocabulary vault is empty, but no worries! Let's warm up. How are you feeling today?`
        : `Hi, I'm Raccoon 🦝! Let's talk about "${topic}". What's the first thing that comes to mind?`;
      setMessages([{ id: '1', text: fallbackText, sender: 'ai', translation: '¡Hola! Soy Raccoon. Hablemos.' }]);
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
        `Tema: ${selectedTopic}. Categoría de palabras: ${selectedCategory}.`,
        vaultWords,
        turnCount
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        translation: response.translation,
        feedback: response.feedbackCapsule
      };

      setMessages(prev => [...prev, aiMsg]);
      setTurnCount(prev => prev + 1);
      if (response.nextGoal) setCurrentHint(response.nextGoal);
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
          <Text style={styles.loadingText}>
            {phase === 'SELECT_TOPIC' ? 'Generando temas con IA...' : 'Cargando tu Baúl...'}
          </Text>
        </View>
      );
    }

    if (phase === 'SELECT_CATEGORY') {
      const catIcons: Record<number, any> = { 0: 'star', 1: 'airplane', 2: 'restaurant', 3: 'briefcase', 4: 'leaf' };
      const catColors = ['#575fcf', '#ff6b6b', '#05c46b', '#ff9f43', '#0984e3'];
      return (
        <ScrollView contentContainerStyle={styles.selectionContainer}>
          <Text style={[styles.phaseTitle, { color: colors.text }]}>¿Sobre qué quieres hablar?</Text>
          <Text style={styles.phaseSubtitle}>Basado en tu baúl de vocabulario</Text>
          <View style={styles.bentoGrid}>
            {categories.map((cat, i) => (
              <TouchableOpacity 
                key={i} 
                style={[
                  styles.bentoCatCard, 
                  styles.cardShadow, 
                  { backgroundColor: colors.card, borderColor: colors.border },
                  i === 0 && styles.bentoCatCardWide
                ]} 
                onPress={() => handleSelectCategory(cat)}
              >
                <View style={[styles.bentoCatIcon, { backgroundColor: catColors[i % catColors.length] + '22' }]}>
                  <Ionicons name={catIcons[i] || 'ellipse'} size={28} color={catColors[i % catColors.length]} />
                </View>
                <Text style={[styles.bentoCatText, { color: colors.text }]}>{cat}</Text>
                <Text style={[styles.bentoCatSub, { color: colors.text }]}>Toca para elegir →</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }

    if (phase === 'SELECT_TOPIC') {
      return (
        <ScrollView contentContainerStyle={styles.selectionContainer}>
          <Text style={[styles.phaseTitle, { color: colors.text }]}>Elige tu escenario</Text>
          <Text style={styles.phaseSubtitle}>Categoría: {selectedCategory}</Text>
          {topics.map((topic, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.bentoTopicCard, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={() => handleSelectTopic(topic)}
            >
              <View style={styles.bentoTopicLeft}>
                <Text style={styles.bentoTopicNumber}>0{i + 1}</Text>
                <Text style={[styles.bentoTopicText, { color: colors.text }]}>{topic}</Text>
              </View>
              <View style={styles.bentoTopicPlay}>
                <Ionicons name="play" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backLink} onPress={() => setPhase('SELECT_CATEGORY')}>
            <Text style={styles.backLinkText}>← Volver a Categorías</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // CHAT Phase
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.progressHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.progressText, { color: colors.accent }]}>Turno {Math.min(turnCount, 5)} de 5</Text>
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5' }]}>
            <View style={[styles.progressFill, { width: `${(Math.min(turnCount, 5) / 5) * 100}%` }]} />
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
              {m.feedback && <FeedbackCapsule feedback={m.feedback} />}
              
              <View style={[
                styles.bubble,
                m.sender === 'user' ? [styles.userBubble, { backgroundColor: colors.accent }] : [styles.aiBubble, { backgroundColor: colors.card }]
              ]}>
                {m.sender === 'ai' && (
                  <TouchableOpacity 
                    style={styles.speakerIcon} 
                    onPress={() => {
                      Speech.stop();
                      Speech.speak(m.text, { language: 'en-US', pitch: 1.0, rate: 0.9 });
                    }}
                  >
                    <Ionicons name="volume-medium" size={18} color={colors.accent} />
                  </TouchableOpacity>
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
            {showHintModal && currentHint && (
              <TouchableOpacity 
                style={[styles.hintModal, { backgroundColor: isDarkMode ? '#281a3a' : '#f8f4ff', borderColor: isDarkMode ? '#4b2c6e' : '#ddd2f8' }]}
                onPress={() => setShowHintModal(false)}
              >
                <View style={styles.hintModalHeader}>
                  <Ionicons name="bulb" size={16} color="#f1c40f" />
                  <Text style={[styles.hintModalLabel, { color: colors.accent }]}>Podrías decir...</Text>
                  <Ionicons name="close" size={16} color={colors.text} style={{ opacity: 0.4, marginLeft: 'auto' }} />
                </View>
                <Text style={[styles.hintModalText, { color: colors.text }]}>{currentHint}</Text>
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
              <TouchableOpacity 
                style={[styles.hintButton, { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5', borderColor: colors.border }]}
                onPress={() => setShowHintModal(prev => !prev)}
              >
                <Ionicons name="bulb" size={24} color="#f1c40f" />
              </TouchableOpacity>
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
          {phase === 'CHAT' ? `Tema: ${selectedTopic}` : 'Práctica Rápida'}
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

  // Bento Grid - Categorías
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bentoCatCard: {
    width: '47%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  bentoCatCardWide: { width: '100%' },
  bentoCatIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bentoCatText: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  bentoCatSub: { fontSize: 11, fontWeight: '600', opacity: 0.4 },

  // Bento List - Temas
  bentoTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 12,
  },
  bentoTopicLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bentoTopicNumber: { fontSize: 28, fontWeight: '900', color: '#E0E3FF', marginRight: 14 },
  bentoTopicText: { fontSize: 16, fontWeight: '800', flex: 1 },
  bentoTopicPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#575fcf', alignItems: 'center', justifyContent: 'center' },

  backLink: { padding: 16, alignItems: 'center', marginTop: 8 },
  backLinkText: { color: '#95a5a6', fontSize: 15, fontWeight: '700' },
  
  progressHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFF' },
  progressText: { fontSize: 14, fontWeight: '800', color: '#575fcf', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden' },
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
  
  feedbackContainer: { 
    borderWidth: 1.5, 
    borderColor: '#efe5ff', 
    backgroundColor: '#f8f4ff', 
    borderRadius: 16, 
    padding: 12, 
    marginBottom: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#9b59b6'
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  feedbackHeaderText: { marginLeft: 8, fontSize: 14, fontWeight: '700', color: '#575fcf' },
  feedbackItem: { marginBottom: 4 },
  feedbackLabel: { fontSize: 12, fontWeight: '700', color: '#8e44ad' },
  feedbackValue: { fontSize: 13, color: '#2d3436', fontWeight: '500' },
  
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

