import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import { AITutorService } from '../../api/ai_tutor';
import { generateGrid, CellData, ClueInfo } from '../../utils/crosswordGenerator';
import { VaultService } from '../../api/vault';

interface CrosswordGameProps {
  userId: string;
  level: number;
  exp: number;
  onNextLevel: (expGain: number) => void;
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
  
  const [activeClue, setActiveClue] = useState<ClueInfo | null>(null);
  const [trayLetters, setTrayLetters] = useState<{id: string, char: string, used: boolean}[]>([]);

  const [vaultEnWords, setVaultEnWords] = useState<string[]>([]);
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const setupActiveWord = useCallback((clue: ClueInfo) => {
    setActiveClue(clue);
    const letters = clue.word.split('');
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setTrayLetters(shuffled.map((char, index) => ({
      id: `${char}-${index}`,
      char,
      used: false
    })));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setShowSummary(false);
    try {
      const vaultWords = await VaultService.getWords(userId);
      const vaultEn = vaultWords.map((w: any) => w.word_en.toLowerCase());
      setVaultEnWords(vaultEn);
      
      const shuffledVault = [...vaultEn].sort(() => Math.random() - 0.5).slice(0, 5);
      
      const { items, gridSize: dynamicGridSize } = await AITutorService.generateCrosswordData(level, shuffledVault, recentWords);
      const { grid: newGrid, acrossClues: aClues, downClues: dClues } = generateGrid(items, dynamicGridSize);
      
      setGridSize(dynamicGridSize);
      setGrid(newGrid);
      setAcrossClues(aClues);
      setDownClues(dClues);
      
      // Initialize empty user grid
      setUserGrid(Array(dynamicGridSize).fill(null).map(() => Array(dynamicGridSize).fill('')));
      setValidationGrid(Array(dynamicGridSize).fill(null).map(() => Array(dynamicGridSize).fill('none')));

      // Auto-focus first valid cell
      let foundFocus = false;
      for (let r = 0; r < dynamicGridSize && !foundFocus; r++) {
        for (let c = 0; c < dynamicGridSize && !foundFocus; c++) {
          if (!newGrid[r][c].isBlack) {
            setActiveRow(r);
            setActiveCol(c);
            foundFocus = true;

            const across = aClues.find(cl => cl.row === r && c >= cl.col && c < cl.col + cl.word.length);
            const down = dClues.find(cl => cl.col === c && r >= cl.row && r < cl.row + cl.word.length);
            const clueToSet = across || down;
            if (clueToSet) {
              setDirectionAcross(clueToSet.direction === 'across');
              setupActiveWord(clueToSet);
            }
          }
        }
      }
      
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [level, userId, recentWords, setupActiveWord]);

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

  const handleTrayLetterPress = (trayItem: {id: string, char: string, used: boolean}, index: number) => {
    if (!activeClue || trayItem.used) return;

    // Buscar primera celda vacía de la palabra
    const isAcross = activeClue.direction === 'across';
    let targetR = -1;
    let targetC = -1;

    for (let i = 0; i < activeClue.word.length; i++) {
      const r = isAcross ? activeClue.row : activeClue.row + i;
      const c = isAcross ? activeClue.col + i : activeClue.col;
      
      // Si la celda está vacía, es nuestro objetivo
      if (!userGrid[r][c] || userGrid[r][c] === '') {
        targetR = r;
        targetC = c;
        break;
      }
    }

    if (targetR !== -1 && targetC !== -1) {
      // Escribir en tablero
      const newGrid = [...userGrid];
      newGrid[targetR] = [...newGrid[targetR]];
      newGrid[targetR][targetC] = trayItem.char;
      setUserGrid(newGrid);

      const newValGrid = [...validationGrid];
      newValGrid[targetR] = [...newValGrid[targetR]];
      newValGrid[targetR][targetC] = 'none';
      setValidationGrid(newValGrid);

      // Desactivar letra
      const newTray = [...trayLetters];
      newTray[index] = { ...trayItem, used: true };
      setTrayLetters(newTray);
      
      // Movemos el cursor activo por consistencia visual
      setActiveRow(targetR);
      setActiveCol(targetC);
    }
  };

  const handleBackspace = () => {
    if (!activeClue) return;

    const isAcross = activeClue.direction === 'across';
    let targetR = -1;
    let targetC = -1;
    let charToUndo = '';

    // Buscar la última celda llenada de la palabra
    for (let i = activeClue.word.length - 1; i >= 0; i--) {
      const r = isAcross ? activeClue.row : activeClue.row + i;
      const c = isAcross ? activeClue.col + i : activeClue.col;
      
      if (userGrid[r][c] && userGrid[r][c] !== '') {
        // NO borramos letras que sean de una intersección validada como correcta
        if (validationGrid[r][c] !== 'correct') {
          targetR = r;
          targetC = c;
          charToUndo = userGrid[r][c];
          break;
        }
      }
    }

    if (targetR !== -1 && targetC !== -1) {
      // Borrar del tablero
      const newGrid = [...userGrid];
      newGrid[targetR] = [...newGrid[targetR]];
      newGrid[targetR][targetC] = '';
      setUserGrid(newGrid);

      // Restaurar letra en la bandeja
      const trayIndex = trayLetters.findIndex(t => t.char === charToUndo && t.used);
      if (trayIndex !== -1) {
        const newTray = [...trayLetters];
        newTray[trayIndex] = { ...newTray[trayIndex], used: false };
        setTrayLetters(newTray);
      }
      
      // Movemos el cursor a la celda borrada
      setActiveRow(targetR);
      setActiveCol(targetC);
    }
  };

  const handleCellPress = (r: number, c: number) => {
    let newDirection = directionAcross;
    if (activeRow === r && activeCol === c) {
      newDirection = !directionAcross;
      setDirectionAcross(newDirection);
    } else {
      setActiveRow(r);
      setActiveCol(c);
    }

    const clueList = newDirection ? acrossClues : downClues;
    let clueToSet = clueList.find(cl => 
      newDirection 
        ? (cl.row === r && c >= cl.col && c < cl.col + cl.word.length)
        : (cl.col === c && r >= cl.row && r < cl.row + cl.word.length)
    );
    
    // Fallback si tocaste una letra de intersección pero no hay palabra en esa dirección
    if (!clueToSet) {
      const otherList = newDirection ? downClues : acrossClues;
      clueToSet = otherList.find(cl => 
        !newDirection 
          ? (cl.row === r && c >= cl.col && c < cl.col + cl.word.length)
          : (cl.col === c && r >= cl.row && r < cl.row + cl.word.length)
      );
      if (clueToSet) {
        setDirectionAcross(!newDirection);
      }
    }

    if (clueToSet && clueToSet.word !== activeClue?.word) {
      setupActiveWord(clueToSet);
    }
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
    if (clue.word !== activeClue?.word) {
      setupActiveWord(clue);
    }
  };

  const checkWin = () => {
    let allCorrect = true;
    const newValGrid = [...validationGrid];
    for (let r = 0; r < gridSize; r++) {
      newValGrid[r] = [...newValGrid[r]];
      for (let c = 0; c < gridSize; c++) {
        if (!grid[r][c].isBlack) {
          if (userGrid[r][c] === '') {
            newValGrid[r][c] = 'none';
            allCorrect = false;
          } else if (userGrid[r][c] === grid[r][c].letter) {
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

  const handleSaveToVault = async (clue: ClueInfo) => {
    setSavingId(clue.word);
    try {
      const newWord = {
        user_id: userId,
        word_en: clue.word.toLowerCase(),
        word_es: clue.clue,
        category: 'Crossword',
        status: 'learning' as const
      };
      await VaultService.addVaultItem(newWord);
      setSavedWords(prev => [...prev, clue.word]);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  if (showSummary) {
    const expGain = Math.max(10, 40 - (hintsUsed * 2));
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Text style={[styles.titleSuccess, isDarkMode && { color: '#2ed573' }]}>¡Crucigrama Completado! 🎉</Text>
        <View style={styles.expContainer}>
          <Text style={[styles.expText, { color: colors.text }]}>Nivel {level} • {exp % 100}/100 EXP</Text>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${exp % 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.expGainText}>+{expGain} EXP ganados</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>Has resuelto estas palabras. Guárdalas en tu baúl para no olvidarlas.</Text>
        
        <ScrollView style={{ width: '100%', marginTop: 10, paddingHorizontal: 16 }}>
          {[...acrossClues, ...downClues].map(w => {
            const wordLower = w.word.toLowerCase();
            const inVault = vaultEnWords.includes(wordLower);
            const isSaved = savedWords.includes(w.word);
            const isSavingThis = savingId === w.word;

            return (
              <View key={w.word} style={[styles.summaryRow, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryInfo}>
                  <Text style={[styles.summaryWordEs, { color: colors.text }]}>{w.clue}</Text>
                  <Text style={[styles.summaryWordEn, { color: colors.accent }]}>{w.word}</Text>
                </View>
                {inVault ? (
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

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, styles.cardShadow, { backgroundColor: colors.accent, flex: 1, marginRight: 8 }]} 
            onPress={() => {
              const played = [...acrossClues, ...downClues].map(c => c.word.toLowerCase());
              setRecentWords(prev => [...prev, ...played].slice(-30));
              onNextLevel(expGain);
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

        {activeClue && (
          <View style={[styles.activeClueBar, { backgroundColor: isDarkMode ? '#2c2c54' : '#eef2f5', borderColor: colors.border }]}>
            <Text style={[styles.activeClueText, { color: colors.text }]}>
              {activeClue.number}. {activeClue.clue}
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <View style={styles.gridContainer}>
            {grid.map((row, r) => (
              <View key={`row-${r}`} style={styles.row}>
                {row.map((cell, c) => {
                  const cellSize = Math.max(40, Math.floor((width - 40) / gridSize));
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
                        <TouchableOpacity 
                          style={styles.cellTouch} 
                          onPress={() => handleCellPress(r, c)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cellText, { color: textColor, fontSize: cellSize * 0.4 }]}>
                            {userGrid[r]?.[c] || ''}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          </View>
        </ScrollView>

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

        <View style={styles.trayContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
            {trayLetters.map((trayItem, index) => (
              <TouchableOpacity
                key={trayItem.id}
                style={[
                  styles.trayTile, 
                  { 
                    backgroundColor: trayItem.used ? 'transparent' : colors.accent,
                    borderColor: trayItem.used ? colors.border : colors.accent,
                    borderWidth: 2
                  }
                ]}
                onPress={() => handleTrayLetterPress(trayItem, index)}
                disabled={trayItem.used}
                activeOpacity={0.7}
              >
                {!trayItem.used && <Text style={styles.trayTileText}>{trayItem.char}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.trayUndoBtn, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]} onPress={handleBackspace}>
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          </TouchableOpacity>
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
  cellTouch: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  cellText: { fontWeight: 'bold' },
  cluesContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, justifyContent: 'space-between' },
  clueColumn: { flex: 1, paddingRight: 10 },
  clueTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  clueText: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  trayContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 30, marginBottom: 20 },
  trayScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  trayTile: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
  trayTileText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  trayUndoBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  
  // Summary Styles (Identical to WordMatcher)
  titleSuccess: { fontSize: 26, fontWeight: '900', color: '#05c46b', marginBottom: 8, marginTop: 40, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 20, textAlign: 'center', paddingHorizontal: 10 },
  expContainer: { width: '100%', alignItems: 'center', marginVertical: 15 },
  expText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  progressBarBg: { width: '80%', height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  expGainText: { fontSize: 12, fontWeight: '600', color: '#2ed573', marginTop: 5 },
  summaryRow: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F2F6', borderBottomWidth: 4 },
  summaryInfo: { flex: 1 },
  summaryWordEs: { fontSize: 18, fontWeight: '900', color: '#1e272e' },
  summaryWordEn: { fontSize: 15, color: '#575fcf', fontWeight: '700', marginTop: 2 },
  saveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8f9ff', alignItems: 'center', justifyContent: 'center' },
  savedBtn: { backgroundColor: '#05c46b' },
  inVaultBadge: { backgroundColor: 'rgba(5, 196, 107, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(5, 196, 107, 0.3)' },
  inVaultText: { color: '#05c46b', fontSize: 12, fontWeight: '800' },
  actionButtonsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20, marginBottom: 40, paddingHorizontal: 16 },
  primaryBtn: { backgroundColor: '#575fcf', paddingHorizontal: 24, paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  secondaryBtnText: { fontSize: 16, fontWeight: '800' },
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
});
