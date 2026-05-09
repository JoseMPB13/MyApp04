import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VaultWord } from '../../../api/vault';

const CATEGORY_COLORS = ['#e17055', '#0984e3', '#00b894', '#6c5ce7', '#f39c12', '#e84393'];
const CATEGORY_ICONS: Record<string, any> = {
  food: 'restaurant', comida: 'restaurant',
  travel: 'airplane', viajes: 'airplane',
  work: 'briefcase', trabajo: 'briefcase',
  nature: 'leaf', naturaleza: 'leaf',
  home: 'home', hogar: 'home',
  general: 'star',
};

export const SelectPracticePhase = ({ chat, colors }: any) => {
  const { loading, vaultWords, handleStartPractice } = chat;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#575fcf" />
        <Text style={styles.loadingText}>Cargando tu Baúl...</Text>
      </View>
    );
  }

  const grouped: Record<string, VaultWord[]> = {};
  vaultWords.forEach((w: VaultWord) => {
    const cat = (w.category || 'General').trim();
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(w);
  });

  const categories = Object.keys(grouped);
  if (categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="archive-outline" size={52} color={colors.accent} style={{ opacity: 0.4 }} />
        <Text style={[styles.phaseTitle, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>Tu baúl está vacío</Text>
        <Text style={[styles.phaseSubtitle, { textAlign: 'center' }]}>Agrega palabras desde las lecciones para practicarlas aquí.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.selectionContainer}>
      <Text style={[styles.phaseTitle, { color: colors.text }]}>Practica tu Baúl 🎯</Text>
      <Text style={styles.phaseSubtitle}>Elige una categoría · La IA genera la sesión</Text>
      <View style={styles.missionGrid}>
        {categories.map((cat, i) => {
          const words = grouped[cat];
          const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
          const icon = CATEGORY_ICONS[cat.toLowerCase()] || 'book';
          
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.missionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                i === 0 && styles.missionCardWide
              ]}
              onPress={() => handleStartPractice(cat, words)}
              activeOpacity={0.85}
            >
              <View style={[styles.missionIconBg, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={30} color={color} />
              </View>
              <View style={i === 0 ? { flex: 1, paddingHorizontal: 16 } : { flex: 1, justifyContent: 'flex-end' }}>
                <Text style={[styles.missionTitle, { color: colors.text }]}>Práctica: {cat}</Text>
                <Text style={[styles.missionDesc, { color: colors.text }]}>{words.length} palabra{words.length !== 1 ? 's' : ''}</Text>
                <View style={[styles.missionStartBadge, { backgroundColor: color, alignSelf: 'flex-start' }]}>
                  <Text style={styles.missionStartLabel}>▶ Iniciar</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
  selectionContainer: { padding: 20, paddingBottom: 40 },
  phaseTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 6 },
  phaseSubtitle: { fontSize: 15, color: '#7f8c8d', marginBottom: 24, fontWeight: '500' },
  missionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  missionCard: { width: '48%', borderRadius: 24, borderWidth: 1.5, padding: 20, minHeight: 160, marginBottom: 16 },
  missionCardWide: { width: '100%', minHeight: 120, flexDirection: 'row', alignItems: 'center' },
  missionIconBg: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  missionTitle: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  missionDesc: { fontSize: 12, fontWeight: '600', opacity: 0.55, marginBottom: 14 },
  missionStartBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  missionStartLabel: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
