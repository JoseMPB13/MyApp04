import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TutorNote } from './TutorNote';
import { TypingBubble } from './TypingBubble';

export const ChatPhase = ({ chat, colors, isDarkMode }: any) => {
  const {
    activeCategory, turnCount, targetWords, usedWords, messages,
    loading, inputText, setInputText, sendMessage, setPhase,
    visibleTranslations, toggleTranslation, perfectGrammarMsgId,
    speakingMsgId, playAudio, showHint, setShowHint,
    currentHint, hintJustUsed, setHintJustUsed, bonusExpVisible
  } = chat;

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.progressHeader, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => setPhase('SELECT_PRACTICE')} style={styles.backLinkBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressText, { color: colors.accent }]}>
            {activeCategory ?? 'Práctica'} · Turno {Math.min(turnCount, 5)} de 5
          </Text>
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5' }]}>
            <View style={[styles.progressFill, { width: `${(Math.min(turnCount, 5) / 5) * 100}%`, backgroundColor: '#05c46b' }]} />
          </View>
        </View>
      </View>

      {targetWords.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.wordHud, { backgroundColor: colors.background }]} contentContainerStyle={styles.wordHudContent}>
          {targetWords.map((w: any, i: number) => {
            const wordKey = w.word_en.toLowerCase().trim();
            const isUsed = usedWords.includes(wordKey);
            return (
              <View key={i} style={[styles.wordPill, isUsed ? { backgroundColor: '#05c46b22', borderColor: '#05c46b' } : { backgroundColor: isDarkMode ? '#2c2c2c' : '#F0F2F5', borderColor: colors.border }]}>
                {isUsed && <Ionicons name="checkmark-circle" size={12} color="#05c46b" style={{ marginRight: 4 }} />}
                <Text style={[styles.wordPillText, { color: isUsed ? '#05c46b' : colors.text }]}>{w.word_en}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <ScrollView 
        ref={scrollRef}
        style={styles.chatContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m: any) => (
          <View key={m.id} style={styles.messageWrapper}>
            {m.sender === 'ai' && m.lessonFeedback && <TutorNote lessonFeedback={m.lessonFeedback} colors={colors} isDarkMode={isDarkMode} />}
            
            <View style={[styles.bubble, m.sender === 'user' ? [styles.userBubble, { backgroundColor: colors.accent }, perfectGrammarMsgId === m.id && styles.perfectBubble] : [styles.aiBubble, { backgroundColor: colors.card }]]}>
              {m.sender === 'ai' && (
                <TouchableOpacity style={[styles.speakerIcon, speakingMsgId === m.id && { opacity: 1 }]} onPress={() => playAudio(m.id, m.text)}>
                  <Ionicons name={speakingMsgId === m.id ? 'volume-high' : 'volume-medium'} size={18} color={speakingMsgId === m.id ? '#05c46b' : colors.accent} />
                </TouchableOpacity>
              )}
              {m.sender === 'user' && perfectGrammarMsgId === m.id && <Text style={styles.perfectLabel}>✨ Perfecto</Text>}
              <Text style={m.sender === 'user' ? styles.messageText : [styles.aiMessageText, { color: colors.text }]}>{m.text}</Text>
              
              {m.sender === 'ai' && m.translation && (
                <View style={[styles.translationContainer, { borderTopColor: colors.border }]}>
                  <TouchableOpacity onPress={() => toggleTranslation(m.id)} style={styles.translateBtn}>
                    <Ionicons name="language" size={16} color="#95a5a6" />
                    <Text style={styles.translateBtnText}>Traducir</Text>
                  </TouchableOpacity>
                  {visibleTranslations[m.id] && <Text style={[styles.translationText, { color: colors.text, opacity: 0.8 }]}>{m.translation}</Text>}
                </View>
              )}
            </View>
          </View>
        ))}

        {loading && messages[messages.length - 1]?.sender === 'user' && <TypingBubble colors={colors} />}

        {turnCount > 5 && !loading && (
          <View style={styles.completionContainer}>
            <Text style={styles.completionTitle}>¡Lección Completada!</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase('SUMMARY')}>
              <Text style={styles.primaryBtnText}>Ver Resultados</Text>
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

          {showHint && currentHint && (
            <TouchableOpacity
              style={[styles.hintInline, { backgroundColor: isDarkMode ? '#1e1a2e' : '#f3eeff', borderColor: isDarkMode ? '#4b2c6e' : '#ddd2f8' }]}
              onPress={() => { setInputText(currentHint.en); setShowHint(false); setHintJustUsed(true); inputRef.current?.focus(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="bulb" size={14} color="#f1c40f" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.hintInlineText, { color: colors.text }]}>{currentHint.en}</Text>
                {currentHint.es && <Text style={[styles.hintInlineSubtext, { color: colors.text }]}>({currentHint.es})</Text>}
              </View>
              <Text style={styles.hintInjectLabel}>Usar →</Text>
            </TouchableOpacity>
          )}

          {hintJustUsed && currentHint?.es && inputText === currentHint.en && (
            <Text style={[styles.hintTranslationBar, { color: colors.text }]}>Traducción: {currentHint.es}</Text>
          )}
          <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Escribe en inglés..."
              placeholderTextColor="#95a5a6"
              value={inputText}
              onChangeText={t => { setInputText(t); if (hintJustUsed && t !== currentHint?.en) setHintJustUsed(false); }}
              multiline
              editable={!loading}
            />
            {currentHint && (
              <TouchableOpacity style={[styles.hintButton, { backgroundColor: showHint ? '#f1c40f' : (isDarkMode ? '#2c2c2c' : '#F0F2F5'), borderColor: showHint ? '#f1c40f' : colors.border }]} onPress={() => setShowHint((prev: boolean) => !prev)}>
                <Ionicons name="bulb" size={22} color={showHint ? '#1e1e1e' : '#f1c40f'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.sendButton, loading && { opacity: 0.5 }]} onPress={sendMessage} disabled={loading}>
              <Ionicons name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  progressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  progressText: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  backLinkBtn: { padding: 4, marginRight: 12, justifyContent: 'center' },
  wordHud: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  wordHudContent: { gap: 8, alignItems: 'center' },
  wordPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  wordPillText: { fontSize: 12, fontWeight: '700' },
  chatContainer: { flex: 1, padding: 16 },
  messageWrapper: { marginBottom: 20 },
  bubble: { padding: 16, borderRadius: 20, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  perfectBubble: { borderWidth: 2, borderColor: '#05c46b' },
  perfectLabel: { fontSize: 10, fontWeight: '900', color: '#05c46b', marginBottom: 4 },
  speakerIcon: { position: 'absolute', top: 12, right: 12, padding: 4, opacity: 0.7 },
  messageText: { fontSize: 17, color: '#FFF', fontWeight: '500' },
  aiMessageText: { fontSize: 17, fontWeight: '500', paddingRight: 24 },
  translationContainer: { marginTop: 12, borderTopWidth: 1, paddingTop: 8 },
  translateBtn: { flexDirection: 'row', alignItems: 'center' },
  translateBtnText: { color: '#95a5a6', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  translationText: { fontSize: 14, marginTop: 8, fontStyle: 'italic', fontWeight: '500' },
  completionContainer: { marginTop: 32, alignItems: 'center' },
  completionTitle: { fontSize: 22, fontWeight: '900', color: '#05c46b', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#575fcf', padding: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  bonusExpBanner: { backgroundColor: '#05c46b', padding: 8, alignItems: 'center' },
  bonusExpText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  hintInline: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  hintInlineText: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  hintInlineSubtext: { fontSize: 12, marginLeft: 8, marginTop: 2, opacity: 0.8 },
  hintInjectLabel: { fontSize: 12, fontWeight: '900', color: '#f1c40f', marginLeft: 8 },
  hintTranslationBar: { fontSize: 12, textAlign: 'center', paddingVertical: 4, opacity: 0.6 },
  inputArea: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100 },
  hintButton: { width: 48, height: 48, borderRadius: 24, marginLeft: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  sendButton: { width: 48, height: 48, backgroundColor: '#575fcf', borderRadius: 24, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
});
