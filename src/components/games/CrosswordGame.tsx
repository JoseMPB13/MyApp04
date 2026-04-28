import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export default function CrosswordGame({ userId, level, exp, onNextLevel, onExit }: CrosswordGameProps) {
  const { colors, isDarkMode } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [gridSize, setGridSize] = useState<number>(8);
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [acrossClues, setAcrossClues] = useState<ClueInfo[]>([]);
  const [downClues, setDownClues] = useState<ClueInfo[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const [directionAcross, setDirectionAcross] = useState(true);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [activeCol, setActiveCol] = useState<number | null>(null);
  const [validationGrid, setValidationGrid] = useState<string[][]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [recentWords, setRecentWords] = useState<string[]>([]);

  // References to input fields
  const inputsRef = useRef<(TextInput | null)[][]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setShowSummary(false);
    try {
      const vaultWords = await VaultService.getWords(userId);
      const vaultEn = vaultWords.map((w: any) => w.word_en.toLowerCase());
      const shuffledVault = [...vaultEn].sort(() => Math.random() - 0.5).slice(0, 5);
      
      const { items, gridSize: dynamicGridSize } = await AITutorService.generateCrosswordData(level, shuffledVault, recentWords);
      const { grid: newGrid, acrossClues: aClues, downClues: dClues } = generateGrid(items, dynamicGridSize);
      
      setGridSize(dynamicGridSize);
      setGrid(newGrid);
      setAcrossClues(aClues);
      setDownClues(dClues);
      
      // Initialize empty user grid and refs
      setUserGrid(Array(dynamicGridSize).fill(null).map(() => Array(dynamicGridSize).fill('')));
      setValidationGrid(Array(dynamicGridSize).fill(null).map(() => Array(dynamicGridSize).fill('none')));
      inputsRef.current = Array(dynamicGridSize).fill(null).map(() => Array(dynamicGridSize).fill(null));
      
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

  const isActiveWord = (r: number, c: number) => {
    if (activeRow === null || activeCol === null) return false;
    if (grid[r]?.[c]?.isBlack) return false;
    if (directionAcross && r === activeRow) {
      const minCol = Math.min(activeCol, c);
      const maxCol = Math.max(activeCol, c);
      for (let i = minCol; i <= maxCol; i++) {
        if (grid[r][i].isBlack) return false;
      }
      return true;
    }
    if (!directionAcross && c === activeCol) {
      const minRow = Math.min(activeRow, r);
      const maxRow = Math.max(activeRow, r);
      for (let i = minRow; i <= maxRow; i++) {
        if (grid[i][c].isBlack) return false;
      }
      return true;
    }
    return false;
  };

  const handleTextChange = (text: string, r: number, c: number) => {
    if (text === '') return; // El borrado lo maneja onKeyPress

    const val = text.toUpperCase().slice(-1); // Solo la última letra
    const newGrid = [...userGrid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = val;
    setUserGrid(newGrid);

    const newValGrid = [...validationGrid];
    newValGrid[r] = [...newValGrid[r]];
    newValGrid[r][c] = 'none';
    setValidationGrid(newValGrid);

    // Calcular siguiente celda
    const nextR = directionAcross ? r : r + 1;
    const nextC = directionAcross ? c + 1 : c;

    if (nextR < gridSize && nextC < gridSize && !grid[nextR][nextC].isBlack) {
      // Pequeño timeout para evitar conflictos de renderizado en React Native
      setTimeout(() => {
        inputsRef.current[nextR][nextC]?.focus();
        setActiveRow(nextR);
        setActiveCol(nextC);
      }, 10);
    }
  };

  const handleKeyPress = (e: any, r: number, c: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const currentVal = userGrid[r][c];
      
      if (!currentVal || currentVal === '') {
        // Retroceder si está vacío
        const prevR = directionAcross ? r : r - 1;
        const prevC = directionAcross ? c - 1 : c;

        if (prevR >= 0 && prevC >= 0 && !grid[prevR][prevC].isBlack) {
          const newGrid = [...userGrid];
          newGrid[prevR] = [...newGrid[prevR]];
          newGrid[prevR][prevC] = ''; // Limpiar la anterior
          setUserGrid(newGrid);
          
          const newValGrid = [...validationGrid];
          newValGrid[prevR] = [...newValGrid[prevR]];
          newValGrid[prevR][prevC] = 'none';
          setValidationGrid(newValGrid);

          inputsRef.current[prevR][prevC]?.focus();
          setActiveRow(prevR);
          setActiveCol(prevC);
        }
      } else {
        // Solo limpiar la actual
        const newGrid = [...userGrid];
        newGrid[r] = [...newGrid[r]];
        newGrid[r][c] = '';
        setUserGrid(newGrid);

        const newValGrid = [...validationGrid];
        newValGrid[r] = [...newValGrid[r]];
        newValGrid[r][c] = 'none';
        setValidationGrid(newValGrid);
      }
    }
  };

  const handleCellPress = (r: number, c: number) => {
    if (activeRow === r && activeCol === c) {
      setDirectionAcross(!directionAcross);
    } else {
      setActiveRow(r);
      setActiveCol(c);
    }
  };

  const getActiveClue = () => {
    if (activeRow === null || activeCol === null) return null;
    const clueList = directionAcross ? acrossClues : downClues;
    return clueList.find(c => {
      if (directionAcross) {
        return c.row === activeRow && activeCol >= c.col && activeCol < c.col + c.word.length;
      } else {
        return c.col === activeCol && activeRow >= c.row && activeRow < c.row + c.word.length;
      }
    });
  };

  const handleRevealHint = () => {
    if (activeRow === null || activeCol === null) return;
    
    const correctLetter = grid[activeRow][activeCol].letter;
    if (!correctLetter) return;

    setHintsUsed(prev => prev + 1);

    const newGrid = [...userGrid];
    newGrid[activeRow] = [...newGrid[activeRow]];
    newGrid[activeRow][activeCol] = correctLetter;
    setUserGrid(newGrid);

    const newValGrid = [...validationGrid];
    newValGrid[activeRow] = [...newValGrid[activeRow]];
    newValGrid[activeRow][activeCol] = 'correct';
    setValidationGrid(newValGrid);
  };

  const handleCluePress = (clue: ClueInfo) => {
    const isAcross = clue.direction === 'across';
    setDirectionAcross(isAcross);
    setActiveRow(clue.row);
    setActiveCol(clue.col);
    inputsRef.current[clue.row][clue.col]?.focus();
  };

  const checkWin = () => {
    let allCorrect = true;
    const newValGrid = [...validationGrid];
    for (let r = 0; r < gridSize; r++) {
      newValGrid[r] = [...newValGrid[r]];
      for (let c = 0; c < gridSize; c++) {
        if (!grid[r][c].isBlack) {
          if (userGrid[r][c] === grid[r][c].letter) {
            newValGrid[r][c] = 'correct';
          } else {
            newValGrid[r][c] = 'incorrect';
            allCorrect = false;
          }
        }
      }
    }
    setValidationGrid(newValGrid);

    if (allCorrect) {
      setShowSummary(true);
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
              const played = [...acrossClues, ...downClues].map(c => c.word.toLowerCase());
              setRecentWords(prev => [...prev, ...played].slice(-30));
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mini Crucigrama</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleRevealHint} style={{ marginRight: 15 }}>
              <Ionicons name="bulb-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.checkBtn, { backgroundColor: colors.accent }]} onPress={checkWin}>
              <Text style={styles.checkBtnText}>Comprobar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {getActiveClue() && (
          <View style={[styles.activeClueBar, { backgroundColor: isDarkMode ? '#2c2c54' : '#eef2f5', borderColor: colors.border }]}>
            <Text style={[styles.activeClueText, { color: colors.text }]}>
              {getActiveClue()?.number}. {getActiveClue()?.clue}
            </Text>
          </View>
        )}

        <View style={styles.gridContainer}>
          {grid.map((row, r) => (
            <View key={`row-${r}`} style={styles.row}>
              {row.map((cell, c) => {
                const cellSize = Math.floor((width - 40) / gridSize);
                const valStatus = validationGrid[r]?.[c] || 'none';
                
                let bgColor = cell.isBlack ? (isDarkMode ? '#1e1e1e' : '#e0e0e0') : (isDarkMode ? '#2c2c54' : '#fff');
                if (!cell.isBlack) {
                  if (activeRow === r && activeCol === c) {
                    bgColor = isDarkMode ? '#4a69bd' : '#c8d6e5';
                  } else if (isActiveWord(r, c)) {
                    bgColor = isDarkMode ? '#34495e' : '#eef2f5';
                  }
                }
                
                let textColor = colors.text;
                let borderColor = colors.border;
                if (valStatus === 'correct') {
                  textColor = '#2ed573';
                  borderColor = '#2ed573';
                } else if (valStatus === 'incorrect') {
                  textColor = '#ff4757';
                  borderColor = '#ff4757';
                }

                return (
                  <View key={`cell-${r}-${c}`} style={[styles.cell, { width: cellSize, height: cellSize, backgroundColor: bgColor, borderColor: borderColor }]}>
                    {!cell.isBlack && (
                      <>
                        {cell.number && <Text style={[styles.cellNumber, { color: textColor }]}>{cell.number}</Text>}
                        <TextInput
                          ref={el => {
                            if (!inputsRef.current[r]) inputsRef.current[r] = [];
                            inputsRef.current[r][c] = el;
                          }}
                          style={[styles.cellInput, { color: textColor, fontSize: cellSize * 0.4 }]}
                          maxLength={2}
                          value={userGrid[r]?.[c] || ''}
                          onChangeText={(text) => handleTextChange(text, r, c)}
                          onKeyPress={(e) => handleKeyPress(e, r, c)}
                          onPressIn={() => handleCellPress(r, c)}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          selectTextOnFocus={true}
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.cluesContainer}>
          <View style={styles.clueColumn}>
            <Text style={[styles.clueTitle, { color: colors.accent }]}>Horizontales</Text>
            {acrossClues.map(clue => {
              const isActive = directionAcross && activeRow !== null && activeCol !== null && isActiveWord(clue.row, clue.col);
              return (
                <TouchableOpacity key={`across-${clue.number}`} onPress={() => handleCluePress(clue)}>
                  <Text style={[styles.clueText, { color: isActive ? colors.accent : colors.text, fontWeight: isActive ? 'bold' : 'normal' }]}>
                    {clue.number}. {clue.clue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.clueColumn}>
            <Text style={[styles.clueTitle, { color: colors.accent }]}>Verticales</Text>
            {downClues.map(clue => {
              const isActive = !directionAcross && activeRow !== null && activeCol !== null && isActiveWord(clue.row, clue.col);
              return (
                <TouchableOpacity key={`down-${clue.number}`} onPress={() => handleCluePress(clue)}>
                  <Text style={[styles.clueText, { color: isActive ? colors.accent : colors.text, fontWeight: isActive ? 'bold' : 'normal' }]}>
                    {clue.number}. {clue.clue}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  activeClueBar: { marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  activeClueText: { fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  gridContainer: { alignSelf: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#ccc' },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
  cellNumber: { position: 'absolute', top: 2, left: 2, fontSize: 10, opacity: 0.7, zIndex: 1 },
  cellInput: { width: '100%', height: '100%', textAlign: 'center', fontWeight: 'bold' },
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
