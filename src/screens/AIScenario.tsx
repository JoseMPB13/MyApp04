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
import { Ionicons } from '@expo/vector-icons';
import { AITutorService, FeedbackCapsule as FeedbackType } from '../api/ai_tutor';
import { VaultService } from '../api/vault';

type Phase = 'SELECT_CATEGORY' | 'SELECT_TOPIC' | 'CHAT';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  translation?: string;
  feedback?: FeedbackType;
}

const FeedbackCapsule = ({ feedback }: { feedback: FeedbackType }) => (
  <View style={styles.feedbackContainer}>
    <View style={styles.feedbackHeader}>
      <Ionicons name="bulb" size={20} color="#575fcf" />
      <Text style={styles.feedbackHeaderText}>Análisis de la IA</Text>
    </View>
    <View style={styles.feedbackItem}>
      <Text style={styles.feedbackLabel}>Gramática:</Text>
      <Text style={styles.feedbackValue}>{feedback.grammar}</Text>
    </View>
    <View style={styles.feedbackItem}>
      <Text style={styles.feedbackLabel}>Vocabulario:</Text>
      <Text style={styles.feedbackValue}>{feedback.vocabulary}</Text>
    </View>
    <View style={styles.feedbackItem}>
      <Text style={styles.feedbackLabel}>Naturalidad:</Text>
      <Text style={styles.feedbackValue}>{feedback.naturalness}</Text>
    </View>
  </View>
);

export default function AIScenario({ onComplete, userId }: { onComplete: () => void; userId: string }) {
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

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleSelectCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setPhase('SELECT_TOPIC');
    setLoading(true);
    
    const generatedTopics = await AITutorService.generateTopicsForCategory(cat);
    setTopics(generatedTopics);
    setLoading(false);
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setPhase('CHAT');
    
    // Iniciar chat
    const welcome = `Great choice! Let's talk about "${topic}". How would you like to start?`;
    setMessages([{ 
      id: '1', 
      text: welcome, 
      sender: 'ai',
      translation: `¡Buena elección! Hablemos sobre "${topic}". ¿Cómo te gustaría empezar?`
    }]);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
      return (
        <ScrollView contentContainerStyle={styles.selectionContainer}>
          <Text style={styles.phaseTitle}>¿Qué quieres practicar hoy?</Text>
          <Text style={styles.phaseSubtitle}>Basado en tu Baúl de vocabulario</Text>
          
          {categories.map((cat, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.bentoBtn, styles.cardShadow]} 
              onPress={() => handleSelectCategory(cat)}
            >
              <Text style={styles.bentoBtnText}>{cat}</Text>
              <Ionicons name="chevron-forward" size={24} color="#575fcf" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (phase === 'SELECT_TOPIC') {
      return (
        <ScrollView contentContainerStyle={styles.selectionContainer}>
          <Text style={styles.phaseTitle}>Elige un Tema</Text>
          <Text style={styles.phaseSubtitle}>Categoría: {selectedCategory}</Text>
          
          {topics.map((topic, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.bentoBtn, styles.cardShadow, { backgroundColor: '#F0F2F5', borderColor: '#FFF' }]} 
              onPress={() => handleSelectTopic(topic)}
            >
              <Text style={[styles.bentoBtnText, { color: '#2d3436' }]}>{topic}</Text>
              <Ionicons name="play-circle" size={28} color="#05c46b" />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.backLink} onPress={() => setPhase('SELECT_CATEGORY')}>
            <Text style={styles.backLinkText}>Volver a Categorías</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // CHAT Phase
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Turno {Math.min(turnCount, 5)} de 5</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(Math.min(turnCount, 5) / 5) * 100}%` }]} />
          </View>
        </View>

        <ScrollView 
          ref={scrollRef}
          style={styles.chatContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <View key={m.id} style={styles.messageWrapper}>
              {m.feedback && <FeedbackCapsule feedback={m.feedback} />}
              
              <View style={[
                styles.bubble,
                m.sender === 'user' ? styles.userBubble : styles.aiBubble
              ]}>
                <Text style={m.sender === 'user' ? styles.messageText : styles.aiMessageText}>
                  {m.text}
                </Text>
                
                {m.sender === 'ai' && m.translation && (
                  <View style={styles.translationContainer}>
                    <TouchableOpacity onPress={() => toggleTranslation(m.id)} style={styles.translateBtn}>
                      <Ionicons name="language" size={16} color="#95a5a6" />
                      <Text style={styles.translateBtnText}>Traducir</Text>
                    </TouchableOpacity>
                    
                    {visibleTranslations[m.id] && (
                      <Text style={styles.translationText}>{m.translation}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingChat}>
              <ActivityIndicator color="#575fcf" />
            </View>
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
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Escribe en inglés..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!loading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, loading && { opacity: 0.5 }]} 
              onPress={sendMessage}
              disabled={loading}
            >
              <Ionicons name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={110}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tiny Lesson</Text>
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
  
  selectionContainer: { padding: 20 },
  phaseTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 8 },
  phaseSubtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 24, fontWeight: '500' },
  bentoBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EEF1FF'
  },
  bentoBtnText: { fontSize: 18, fontWeight: '800', color: '#575fcf' },
  backLink: { padding: 16, alignItems: 'center', marginTop: 8 },
  backLinkText: { color: '#95a5a6', fontSize: 16, fontWeight: '700' },
  
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
  
  completionContainer: { padding: 24, alignItems: 'center', marginTop: 16 },
  completionTitle: { fontSize: 24, fontWeight: '900', color: '#05c46b', marginBottom: 24 },
  primaryBtn: { backgroundColor: '#575fcf', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
});

