import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { AITutorService } from '../../api/ai_tutor';
import { generateGrid, CellData, ClueInfo } from '../../utils/crosswordGenerator';
import { VaultService } from '../../api/vault';

interface CrosswordGameProps {
  userId: string;
  level: number;
  exp: number;
  onNextLevel: () => void;
  onExit: (expGain: number) => void;
}

const { width } = Dimensions.get('window');
const GRID_SIZE = 8;
const CELL_SIZE = Math.floor((width - 40) / GRID_SIZE);

export default function CrosswordGame({ userId, level, exp, onNextLevel, onExit }: CrosswordGameProps) {
  const { colors, isDarkMode } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [acrossClues, setAcrossClues] = useState<ClueInfo[]>([]);
  const [downClues, setDownClues] = useState<ClueInfo[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // To handle focus direction. true = across, false = down
  const [directionAcross, setDirectionAcross] = useState(true);

  // References to input fields
  const inputsRef = useRef<(TextInput | null)[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setShowSummary(false);
    try {
      const vaultWords = await VaultService.getWords(userId);
      const vaultEn = vaultWords.map((w: any) => w.word_en.toLowerCase());
      const shuffledVault = [...vaultEn].sort(() => Math.random() - 0.5).slice(0, 5);
      
      const data = await AITutorService.generateCrosswordData(level, shuffledVault);
      const { grid: newGrid, acrossClues: aClues, downClues: dClues } = generateGrid(data, GRID_SIZE);
      
      setGrid(newGrid);
      setAcrossClues(aClues);
      setDownClues(dClues);
      
      // Initialize empty user grid
      setUserGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('')));
      
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [level, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTextChange = (text: string, r: number, c: number) => {
    const val = text.toUpperCase();
    const newGrid = [...userGrid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = val;
    setUserGrid(newGrid);

    if (val !== '') {
      // Move focus
      let nextR = r;
      let nextC = c;
      if (directionAcross) {
        nextC++;
      } else {
        nextR++;
      }

      if (nextR < GRID_SIZE && nextC < GRID_SIZE && !grid[nextR][nextC].isBlack) {
        inputsRef.current[nextR][nextC]?.focus();
      }
    }
  };

  const handleCellPress = (r: number, c: number) => {
    // Toggle direction if already focused
    setDirectionAcross(!directionAcross);
  };

  const checkWin = () => {
    let allCorrect = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c].isBlack) {
          if (userGrid[r][c] !== grid[r][c].letter) {
            allCorrect = false;
            break;
          }
        }
      }
      if (!allCorrect) break;
    }

    if (allCorrect) {
      setShowSummary(true);
    } else {
      Alert.alert("Revisa tus respuestas", "Hay letras incorrectas o faltantes. ¡Sigue intentándolo!");
    }
  };

  if (showSummary) {
    const expGain = 30; // base exp for crossword
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Text style={[styles.titleSuccess, isDarkMode && { color: '#2ed573' }]}>¡Crucigrama Completado! 🎉</Text>
        <View style={[styles.expContainer, { backgroundColor: isDarkMode ? '#2c2c54' : '#f8f9ff' }]}>
          <Text style={[styles.expText, { color: colors.text }]}>Nivel {level} • {exp % 100}/100 EXP</Text>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${exp % 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.expGainText}>+{expGain} EXP ganados</Text>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.accent, flex: 1, marginRight: 8 }]} 
            onPress={() => {
              onNextLevel();
              loadData();
            }}
          >
            <Text style={styles.primaryBtnText}>Siguiente Nivel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryBtn, { flex: 1, marginLeft: 8 }]} 
            onPress={() => onExit(expGain)}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Volver a Misiones</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Generando cuadrícula...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, marginBottom: 16 }}>Hubo un problema al generar el crucigrama.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent, paddingHorizontal: 20 }]} onPress={loadData}>
          <Text style={styles.primaryBtnText}>Reintentar generación</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mini Crucigrama</Text>
          <TouchableOpacity style={[styles.checkBtn, { backgroundColor: colors.accent }]} onPress={checkWin}>
            <Text style={styles.checkBtnText}>Comprobar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          {grid.map((row, r) => (
            <View key={`row-${r}`} style={styles.row}>
              {row.map((cell, c) => (
                <View key={`cell-${r}-${c}`} style={[styles.cell, { backgroundColor: cell.isBlack ? (isDarkMode ? '#1e1e1e' : '#e0e0e0') : (isDarkMode ? '#2c2c54' : '#fff'), borderColor: colors.border }]}>
                  {!cell.isBlack && (
                    <>
                      {cell.number && <Text style={[styles.cellNumber, { color: colors.text }]}>{cell.number}</Text>}
                      <TextInput
                        ref={el => {
                          if (!inputsRef.current[r]) inputsRef.current[r] = [];
                          inputsRef.current[r][c] = el;
                        }}
                        style={[styles.cellInput, { color: colors.text }]}
                        maxLength={1}
                        value={userGrid[r]?.[c] || ''}
                        onChangeText={(text) => handleTextChange(text, r, c)}
                        onPressIn={() => handleCellPress(r, c)}
                        autoCapitalize="characters"
                        selectTextOnFocus
                      />
                    </>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.cluesContainer}>
          <View style={styles.clueColumn}>
            <Text style={[styles.clueTitle, { color: colors.accent }]}>Horizontales</Text>
            {acrossClues.map(clue => (
              <Text key={`across-${clue.number}`} style={[styles.clueText, { color: colors.text }]}>
                {clue.number}. {clue.clue}
              </Text>
            ))}
          </View>
          <View style={styles.clueColumn}>
            <Text style={[styles.clueTitle, { color: colors.accent }]}>Verticales</Text>
            {downClues.map(clue => (
              <Text key={`down-${clue.number}`} style={[styles.clueText, { color: colors.text }]}>
                {clue.number}. {clue.clue}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  checkBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  checkBtnText: { color: '#FFF', fontWeight: 'bold' },
  gridContainer: { alignSelf: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#ccc' },
  row: { flexDirection: 'row' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
  cellNumber: { position: 'absolute', top: 2, left: 2, fontSize: 10, opacity: 0.7, zIndex: 1 },
  cellInput: { width: '100%', height: '100%', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  cluesContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, justifyContent: 'space-between' },
  clueColumn: { flex: 1, paddingRight: 10 },
  clueTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  clueText: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  
  // Summary Styles
  titleSuccess: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  expContainer: { padding: 20, borderRadius: 16, marginHorizontal: 20, marginBottom: 30, alignItems: 'center' },
  expText: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  progressBarBg: { height: 12, width: '100%', borderRadius: 6, backgroundColor: '#eef1ff', overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  expGainText: { fontSize: 14, color: '#2ed573', fontWeight: '700' },
  actionButtonsContainer: { flexDirection: 'row', paddingHorizontal: 20 },
  primaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  secondaryBtnText: { fontSize: 16, fontWeight: 'bold' },
});
