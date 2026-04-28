import { CrosswordItem } from '../api/ai_tutor';

export interface CellData {
  letter: string;
  isBlack: boolean;
  number?: number;
  currentInput?: string;
}

export interface ClueInfo {
  number: number;
  word: string;
  clue: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
}

export function generateGrid(items: CrosswordItem[], gridSize: number = 8) {
  const grid: CellData[][] = Array(gridSize).fill(null).map(() =>
    Array(gridSize).fill(null).map(() => ({ letter: '', isBlack: true }))
  );

  const acrossClues: ClueInfo[] = [];
  const downClues: ClueInfo[] = [];
  
  // Ordenar palabras de mayor a menor longitud
  const sortedItems = [...items].sort((a, b) => b.word.length - a.word.length);
  let clueNumber = 1;

  const canPlaceWord = (word: string, r: number, c: number, dr: number, dc: number) => {
    // Verificar si cabe en la cuadrícula
    if (r < 0 || c < 0 || r + dr * word.length > gridSize || c + dc * word.length > gridSize) {
      return false;
    }

    for (let i = 0; i < word.length; i++) {
      const cr = r + dr * i;
      const cc = c + dc * i;
      
      // Si la celda no es negra, la letra debe coincidir
      if (!grid[cr][cc].isBlack && grid[cr][cc].letter !== word[i]) {
        return false;
      }

      // Evitar que dos palabras corran paralelas pegadas
      // Revisar vecinos ortogonales a la dirección de la palabra
      if (grid[cr][cc].isBlack) {
        const perp1_r = cr + dc;
        const perp1_c = cc + dr;
        const perp2_r = cr - dc;
        const perp2_c = cc - dr;

        if (perp1_r >= 0 && perp1_r < gridSize && perp1_c >= 0 && perp1_c < gridSize) {
          if (!grid[perp1_r][perp1_c].isBlack) return false;
        }
        if (perp2_r >= 0 && perp2_r < gridSize && perp2_c >= 0 && perp2_c < gridSize) {
          if (!grid[perp2_r][perp2_c].isBlack) return false;
        }
      }
    }

    // Verificar las celdas justo antes y después de la palabra entera para evitar uniones continuas
    const before_r = r - dr;
    const before_c = c - dc;
    if (before_r >= 0 && before_r < gridSize && before_c >= 0 && before_c < gridSize) {
      if (!grid[before_r][before_c].isBlack) return false;
    }

    const after_r = r + dr * word.length;
    const after_c = c + dc * word.length;
    if (after_r >= 0 && after_r < gridSize && after_c >= 0 && after_c < gridSize) {
      if (!grid[after_r][after_c].isBlack) return false;
    }

    return true;
  };

  const placeWord = (item: CrosswordItem, r: number, c: number, dr: number, dc: number) => {
    const word = item.word;
    for (let i = 0; i < word.length; i++) {
      const cr = r + dr * i;
      const cc = c + dc * i;
      grid[cr][cc] = { ...grid[cr][cc], isBlack: false, letter: word[i] };
    }
    
    // Si la celda inicial ya tiene número, lo reutilizamos. Si no, le asignamos uno nuevo.
    let currentNumber = grid[r][c].number;
    if (!currentNumber) {
      currentNumber = clueNumber++;
      grid[r][c].number = currentNumber;
    }

    const clueInfo: ClueInfo = {
      number: currentNumber,
      word: item.word,
      clue: item.clue,
      direction: dr === 0 ? 'across' : 'down',
      row: r,
      col: c
    };

    if (dr === 0) {
      acrossClues.push(clueInfo);
    } else {
      downClues.push(clueInfo);
    }
  };

  // 1. Colocar la primera palabra horizontalmente en el centro
  if (sortedItems.length > 0) {
    const firstItem = sortedItems[0];
    const firstWord = firstItem.word;
    const startRow = Math.floor(gridSize / 2);
    const startCol = Math.floor((gridSize - firstWord.length) / 2);
    
    if (startCol >= 0) {
      placeWord(firstItem, startRow, startCol, 0, 1);
    }
  }

  // 2. Colocar el resto buscando intersecciones
  for (let i = 1; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const word = item.word;
    let placed = false;

    // Buscar cada letra de la palabra a colocar
    for (let charIdx = 0; charIdx < word.length && !placed; charIdx++) {
      const char = word[charIdx];

      // Buscar si esa letra existe en el grid
      for (let r = 0; r < gridSize && !placed; r++) {
        for (let c = 0; c < gridSize && !placed; c++) {
          if (!grid[r][c].isBlack && grid[r][c].letter === char) {
            // Comprobar si cruza verticalmente (si estaba horizontal) o al revés.
            // Para simplificar, probamos en ambas direcciones.
            
            // Intentar horizontal
            let dr = 0, dc = 1;
            let startRow = r - dr * charIdx;
            let startCol = c - dc * charIdx;
            if (canPlaceWord(word, startRow, startCol, dr, dc)) {
              placeWord(item, startRow, startCol, dr, dc);
              placed = true;
              break;
            }

            // Intentar vertical
            dr = 1; dc = 0;
            startRow = r - dr * charIdx;
            startCol = c - dc * charIdx;
            if (canPlaceWord(word, startRow, startCol, dr, dc)) {
              placeWord(item, startRow, startCol, dr, dc);
              placed = true;
              break;
            }
          }
        }
      }
    }
  }

  return { grid, acrossClues, downClues };
}
