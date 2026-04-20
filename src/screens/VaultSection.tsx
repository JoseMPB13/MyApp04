import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { VaultService, VaultWord } from '../api/vault';
import { AITutorService } from '../api/ai_tutor';
import { useTranslation } from '../hooks/useTranslation';
import { useAppTheme } from '../context/ThemeContext';

interface VaultSectionProps {
  userId: string;
}

const VaultSection = ({ userId }: VaultSectionProps) => {
  const { colors } = useAppTheme();
  const [words, setWords] = useState<VaultWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // States for new word form
  const [wordEn, setWordEn] = useState('');
  const [wordEs, setWordEs] = useState('');
  const [saving, setSaving] = useState(false);
  
  // AI Translation Hook
  const { translate, loading: translating, error: translationError } = useTranslation();
  const [activeInput, setActiveInput] = useState<'en' | 'es' | null>(null);



  useEffect(() => {
    if (userId) loadVault();
  }, [userId]);

  // Auto-translation logic for English -> Spanish
  useEffect(() => {
    if (activeInput !== 'en' || !wordEn.trim() || wordEs.trim()) return;

    const timer = setTimeout(async () => {
      const translation = await translate(wordEn, 'Spanish');
      if (translation && !wordEs.trim()) {
        setWordEs(translation);
        setActiveInput(null); // Clear focus to avoid loops
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [wordEn, activeInput]);

  // Auto-translation logic for Spanish -> English
  useEffect(() => {
    if (activeInput !== 'es' || !wordEs.trim() || wordEn.trim()) return;

    const timer = setTimeout(async () => {
      const translation = await translate(wordEs, 'English');
      if (translation && !wordEn.trim()) {
        setWordEn(translation);
        setActiveInput(null); // Clear focus to avoid loops
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [wordEs, activeInput]);

  const loadVault = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await VaultService.getWords(userId);
    setWords(data);
    setLoading(false);
  };

  const handleAddWord = async () => {
    if (!userId || !wordEn || !wordEs) {
      if (!userId) console.error('VaultSection: No hay userId disponible');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Error', 
        !userId ? 'No se detectó una sesión activa.' : 'Por favor completa ambos campos.'
      );
      return;
    }

    setSaving(true);
    const generatedCategory = await AITutorService.categorizeVaultWord(wordEn.trim(), wordEs.trim());
    
    const newWord: VaultWord = {
      user_id: userId,
      word_en: wordEn.trim(),
      word_es: wordEs.trim(),
      category: generatedCategory,
      status: 'learning'
    };

    console.log('VaultSection: Intentando guardar palabra...', newWord);
    const result = await VaultService.addVaultItem(newWord);
    setSaving(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWordEn('');
      setWordEs('');
      setShowForm(false);
      loadVault();
    } else {
      console.error('VaultSection: Error al guardar:', result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Error al guardar',
        `No se pudo guardar la palabra: ${result.error?.message || 'Error desconocido'}. Revisa la consola para más detalles técnicos.`
      );
    }
  };

  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await VaultService.deleteWord(id);
    if (result.success) {
      loadVault();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>The Vault</Text>
        <Text style={styles.sectionSubtitle}>Tu almacén de conocimiento personal 💎</Text>

        {/* Bento Hub Hub Area */}
        <View style={styles.bentoGrid}>
          {/* Main Action Card */}
          <TouchableOpacity 
            style={[styles.bentoCard, styles.mainActionCard, styles.cardShadow3D]}
            onPress={() => {
              setShowForm(!showForm);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.bentoIconContainer}>
               <Ionicons name={showForm ? "close-circle" : "add-circle"} size={32} color="#FFF" />
            </View>
            <Text style={styles.mainActionTitle}>{showForm ? "Cancelar" : "Nueva Palabra"}</Text>
          </TouchableOpacity>

          {/* Stats Card */}
          <View style={[styles.bentoCard, styles.statsCard, styles.cardShadow, { backgroundColor: colors.card }]}>
            <Text style={styles.statsCount}>{words.length}</Text>
            <Text style={[styles.statsLabel, { color: colors.text, opacity: 0.7 }]}>Guardadas</Text>
          </View>

          {/* Mastered Card */}
          <View style={[styles.bentoCard, styles.masteredCard, styles.cardShadow, { backgroundColor: colors.card }]}>
             <Ionicons name="trophy" size={20} color="#FFD32D" />
             <Text style={[styles.masteredLabel, { color: colors.text }]}>Domina 5 más para subir de nivel</Text>
          </View>
        </View>

        {/* Form Overlay-ish */}
        {showForm && (
          <View style={[styles.formContainer, styles.cardShadow, { backgroundColor: colors.card }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Añadir al Baúl</Text>
            

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Inglés</Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Resilience"
                  value={wordEn}
                  onChangeText={(text) => {
                    setWordEn(text);
                    setActiveInput('en');
                  }}
                  placeholderTextColor="#A4B0BE"
                />
                {translating && activeInput === 'es' && (
                  <ActivityIndicator size="small" color="#575fcf" style={styles.inputLoader} />
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Español</Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Resiliencia"
                  value={wordEs}
                  onChangeText={(text) => {
                    setWordEs(text);
                    setActiveInput('es');
                  }}
                  placeholderTextColor="#A4B0BE"
                />
                {translating && activeInput === 'en' && (
                  <ActivityIndicator size="small" color="#575fcf" style={styles.inputLoader} />
                )}
              </View>
            </View>

            {/* Removed manual category picker */}

            <TouchableOpacity 
              style={[
                styles.saveButton, 
                styles.cardShadow3D,
                (!wordEn.trim() || !wordEs.trim() || !userId) && styles.saveButtonDisabled
              ]}
              onPress={handleAddWord}
              disabled={saving || !wordEn.trim() || !wordEs.trim() || !userId}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar en el Baúl</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>Tus Palabras</Text>
          <TouchableOpacity onPress={loadVault}>
            <Ionicons name="refresh" size={20} color="#575fcf" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#575fcf" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.wordList}>
            {words.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="journal-outline" size={60} color="#d1d8e0" />
                <Text style={styles.emptyText}>Tu baúl está esperando tus primeras palabras.</Text>
              </View>
            ) : (
              Object.entries(
                words.reduce((acc, word) => {
                  const cat = word.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(word);
                  return acc;
                }, {} as Record<string, VaultWord[]>)
              ).map(([cat, catWords]) => (
                <View key={cat} style={styles.categorySection}>
                  <Text style={styles.categoryHeader}>{cat}</Text>
                  {catWords.map((w) => (
                    <View 
                      key={w.id} 
                      style={[styles.wordCard, styles.cardShadow3D, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={styles.wordInfo}>
                        <Text style={[styles.wordEs, { color: colors.text }]}>{w.word_es}</Text>
                        <View style={styles.wordEnRow}>
                           <Text style={styles.wordEn}>{w.word_en}</Text>
                        </View>
                        <View style={styles.categoryTag}>
                           <Text style={styles.categoryTagText}>{w.category || 'General'}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => w.id && handleDelete(w.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF4757" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default VaultSection;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: '#1e272e', marginBottom: 6 },
  sectionSubtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 24, fontWeight: '500' },
  
  // Bento Grid
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  bentoCard: { borderRadius: 24, padding: 20, marginBottom: 14 },
  mainActionCard: { width: '64%', backgroundColor: '#575fcf', height: 140, justifyContent: 'center' },
  statsCard: { width: '32%', backgroundColor: '#FFF', height: 140, alignItems: 'center', justifyContent: 'center' },
  masteredCard: { width: '100%', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 16 },
  
  bentoIconContainer: { marginBottom: 12 },
  mainActionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  statsCount: { fontSize: 32, fontWeight: '900', color: '#575fcf' },
  statsLabel: { fontSize: 12, color: '#7f8c8d', fontWeight: '700', marginTop: 4 },
  masteredLabel: { marginLeft: 12, fontSize: 13, color: '#2d3436', fontWeight: '700' },

  // Form
  formContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: '900', color: '#2d3436', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#485460', marginBottom: 8 },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  input: { backgroundColor: '#F1F2F6', borderRadius: 12, padding: 14, fontSize: 16, color: '#2d3436', fontWeight: '600', paddingRight: 40 },
  inputLoader: { position: 'absolute', right: 12 },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryChip: { backgroundColor: '#F1F2F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: '#EEF1FF', borderColor: '#575fcf' },
  categoryText: { fontSize: 12, fontWeight: '800', color: '#7f8c8d' },
  categoryTextActive: { color: '#575fcf' },
  
  saveButton: { backgroundColor: '#05c46b', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8, borderBottomWidth: 4, borderColor: '#04a75b' },
  saveButtonDisabled: { backgroundColor: '#a4b0be', borderColor: '#747d8c', opacity: 0.7 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  // List & Grouping
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  wordList: { marginTop: 4 },
  categorySection: { marginBottom: 20 },
  categoryHeader: { fontSize: 18, fontWeight: '900', color: '#575fcf', marginBottom: 12, marginLeft: 4 },
  wordCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: '#F1F2F6', borderWidth: 1, borderBottomWidth: 5 },
  wordInfo: { flex: 1 },
  wordEs: { fontSize: 18, fontWeight: '900', color: '#2d3436' },
  wordEnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  wordEn: { fontSize: 15, color: '#575fcf', fontWeight: '800' },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: '#F1F2F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 10 },
  categoryTagText: { fontSize: 10, fontWeight: '900', color: '#95a5a6' },
  deleteBtn: { padding: 10 },

  // Mixins/Shadows
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  cardShadow3D: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
    })
  },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#95a5a6', marginTop: 16, textAlign: 'center', width: 220, fontSize: 14, fontWeight: '600' },

});
