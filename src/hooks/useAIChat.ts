import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import { AITutorService, LessonFeedback } from '../api/ai_tutor';
import { VaultService, VaultWord } from '../api/vault';

export type Phase = 'SELECT_PRACTICE' | 'CHAT' | 'SUMMARY';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  translation?: string;
  lessonFeedback?: LessonFeedback;
  corrections?: any[];
  suggested_reply_en?: string;
  suggested_reply_es?: string;
}

export const useAIChat = (userId: string) => {
  const [phase, setPhase] = useState<Phase>('SELECT_PRACTICE');
  const [vaultWords, setVaultWords] = useState<VaultWord[]>([]);
  const [targetWords, setTargetWords] = useState<VaultWord[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [turnCount, setTurnCount] = useState(1);
  const [visibleTranslations, setVisibleTranslations] = useState<{[key: string]: boolean}>({});
  const [currentHint, setCurrentHint] = useState<{ en: string; es: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintJustUsed, setHintJustUsed] = useState(false);
  const [perfectGrammarMsgId, setPerfectGrammarMsgId] = useState<string | null>(null);
  const [bonusExpVisible, setBonusExpVisible] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [totalExpEarned, setTotalExpEarned] = useState(50);

  useEffect(() => {
    const loadVault = async () => {
      setLoading(true);
      try {
        const words = await VaultService.getWords(userId);
        const learning = words.filter(w => w.status !== 'mastered');
        setVaultWords(learning);
      } catch {
        setVaultWords([]);
      } finally {
        setLoading(false);
      }
    };
    if (userId) loadVault();
  }, [userId]);

  const handleStartPractice = async (category: string, wordsInCategory: VaultWord[]) => {
    setActiveCategory(category);
    setTargetWords(wordsInCategory);
    setPhase('CHAT');
    setLoading(true);
    setMessages([]);
    setTurnCount(1);
    setCurrentHint(null);
    setShowHint(false);
    setUsedWords([]);
    setHintJustUsed(false);
    setTotalExpEarned(50);

    const wordList = wordsInCategory.map(w => w.word_en);
    const scenarioGoal = `The student is practicing words from their vocabulary vault in the category "${category}". Target words: [${wordList.join(', ')}]. Have a natural A1-level conversation that encourages the student to use these words.`;

    try {
      const iceBreaker = await AITutorService.getLessonResponse([], scenarioGoal, wordList, 0);
      const firstMsg: Message = {
        id: '1',
        text: iceBreaker.text,
        sender: 'ai',
        translation: iceBreaker.translation,
      };
      setMessages([firstMsg]);
      AITutorService.saveChatMessage(userId, 'assistant', firstMsg.text, category);
      
      const enHint = iceBreaker.suggested_reply_en || iceBreaker.suggested_reply || null;
      const esHint = iceBreaker.suggested_reply_es || null;
      if (enHint) setCurrentHint({ en: enHint, es: esHint ?? '' });
      else setCurrentHint(null);
    } catch {
      setMessages([{ id: '1', text: `Hi! Let's practice some words together. Are you ready?`, sender: 'ai', translation: '¡Hola! Practiquemos algunas palabras juntos. ¿Estás listo?' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTranslation = (msgId: string) => {
    setVisibleTranslations(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading || turnCount > 5) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText, sender: 'user' };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    AITutorService.saveChatMessage(userId, 'user', inputText, activeCategory || 'General');
    
    setInputText('');
    setLoading(true);

    try {
      const wordList = targetWords.map(w => w.word_en);
      const scenarioGoal = activeCategory
        ? `Student is practicing vocabulary from the "${activeCategory}" category. Target words: [${wordList.join(', ')}].`
        : 'General English conversation practice.';
      const response = await AITutorService.getLessonResponse(newMessages, scenarioGoal, wordList, turnCount);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        translation: response.translation,
        lessonFeedback: response.feedback,
        corrections: response.corrections,
        suggested_reply_en: response.suggested_reply_en,
        suggested_reply_es: response.suggested_reply_es,
      };

      if (response.feedback?.vault_usage_detected) {
        const detected = response.feedback.vault_usage_detected.toLowerCase().trim();
        setUsedWords(prev => prev.includes(detected) ? prev : [...prev, detected]);
      }

      const isPerfect = !response.feedback?.correction && (response.feedback?.score ?? 0) >= 8;
      if (isPerfect) {
        setPerfectGrammarMsgId(userMsg.id);
        setBonusExpVisible(true);
        setTotalExpEarned(prev => prev + 5);
        setTimeout(() => setBonusExpVisible(false), 3000);
      } else {
        setPerfectGrammarMsgId(null);
      }

      setMessages(prev => [...prev, aiMsg]);
      AITutorService.saveChatMessage(userId, 'assistant', aiMsg.text, activeCategory || 'General', aiMsg.lessonFeedback);
      
      setTurnCount(prev => prev + 1);
      const enHint = response.suggested_reply_en || response.suggested_reply || null;
      const esHint = response.suggested_reply_es || null;
      if (enHint) { setCurrentHint({ en: enHint, es: esHint ?? '' }); setShowHint(false); }
      else setCurrentHint(null);
    } catch {
      const systemError: Message = { id: 'error-' + Date.now(), text: "Error de conexión. Por favor, intenta enviar tu mensaje de nuevo.", sender: 'ai' };
      setMessages(prev => [...prev, systemError]);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = useCallback((id: string, text: string) => {
    const cleanText = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[^\w\s.,!?;:'\-()]/g, '').trim();
    Speech.stop();
    setSpeakingMsgId(id);
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
  }, []);

  return {
    phase, setPhase,
    vaultWords, targetWords, activeCategory,
    messages, inputText, setInputText,
    loading, turnCount,
    visibleTranslations, toggleTranslation,
    currentHint, showHint, setShowHint, hintJustUsed, setHintJustUsed,
    perfectGrammarMsgId, bonusExpVisible, speakingMsgId, playAudio,
    usedWords, totalExpEarned,
    handleStartPractice, sendMessage
  };
};
