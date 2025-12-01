// Helper to convert various grade systems to a unified numeric value for plotting and filtering.
// The "Value" roughly corresponds to the YDS number (e.g., 5.10a -> 10.0).
// Bouldering grades are mapped to a roughly equivalent physical difficulty on this scale 
// (e.g., V0 starts around 5.10a level = 10.0) to allow mixed visualization.
export const gradeToValue = (grade: string, type: string = ''): number => {
  const g = grade.trim().toUpperCase();
  const isBouldering = type.toLowerCase().includes('bouldering');

  // --- 1. V-Scale (e.g. V0, V10) ---
  if (g.startsWith('V')) {
    if (g === 'VB' || g.includes('EASY')) return 9; 
    const numPart = g.substring(1).replace(/[^\d.]/g, ''); 
    const num = parseFloat(numPart);
    if (isNaN(num)) return 0;
    // V0 ~= 5.10a (10.0). V10 ~= 5.13d/14a (20.0). 
    // This is a rough visual approximation: Value = V-grade + 10.
    return num + 10; 
  }

  // --- 2. YDS (e.g. 5.10a, 5.12c) ---
  if (g.startsWith('5.')) {
    const part = g.substring(2);
    // Regex to capture base number and modifier (letter or +/-)
    const match = part.match(/^(\d+)([ABCD]?)([+-]?)/);
    if (match) {
        const base = parseInt(match[1]);
        const letter = match[2];
        const plusMinus = match[3];
        let modifier = 0;
        
        if (letter === 'A') modifier = 0.0;
        else if (letter === 'B') modifier = 0.25;
        else if (letter === 'C') modifier = 0.5;
        else if (letter === 'D') modifier = 0.75;
        
        // Handle +/- if letter is missing (old school) or supplementary
        if (!letter && plusMinus === '+') modifier = 0.5;
        if (!letter && plusMinus === '-') modifier = -0.25;

        // 5.10a -> 10.0
        return base + modifier;
    }
  }

  // --- 3. French / Fontainebleau (e.g. 6a, 7B+) ---
  // Matches Number + Letter + Optional(+)
  const frenchMatch = g.match(/^(\d)([ABC])(\+?)$/);
  if (frenchMatch) {
      const num = parseInt(frenchMatch[1]);
      const letter = frenchMatch[2];
      const isPlus = frenchMatch[3] === '+';
      
      // Construct a normalized key e.g., "6A+"
      const key = `${num}${letter}${isPlus ? '+' : ''}`;

      if (isBouldering) {
          // -- FONT SCALE (Bouldering) --
          // Font grades are harder than sport grades of same name.
          // 5 -> V1 (11)
          // 6A -> V3 (13)
          // 7A -> V6 (16)
          // 8A -> V11 (21)
          const fontMap: {[key: string]: number} = {
              '4A': 9,  '4B': 9.5,  '4C': 10,
              '5A': 10.5, '5B': 11,   '5C': 11.5,
              '6A': 13,   '6A+': 13.5, '6B': 14,   '6B+': 14.5, '6C': 15,   '6C+': 15.5,
              '7A': 16,   '7A+': 17,   '7B': 18,   '7B+': 19,   '7C': 20,   '7C+': 21,
              '8A': 22,   '8A+': 23,   '8B': 24,   '8B+': 25,   '8C': 26,   '8C+': 27
          };
          // Heuristic fallback if map misses: 
          return fontMap[key] || (num * 2.5); 
      } else {
          // -- FRENCH SPORT SCALE --
          // 6a -> 5.10a (10)
          // 7a -> 5.11d (11.75)
          const sportMap: {[key: string]: number} = {
              '4A': 4, '4B': 5, '4C': 6,
              '5A': 7, '5B': 8, '5C': 9, // 5c is 5.9
              '6A': 10, '6A+': 10.25, '6B': 10.5, '6B+': 10.75, '6C': 11, '6C+': 11.25,
              '7A': 11.75, '7A+': 12, '7B': 12.25, '7B+': 12.5, '7C': 12.75, '7C+': 13,
              '8A': 13.25, '8A+': 13.5, '8B': 13.75, '8B+': 14, '8C': 14.25, '8C+': 14.5,
              '9A': 14.75, '9A+': 15, '9B': 15.25, '9B+': 15.5
          };
          return sportMap[key] || num + 4; // very rough fallback
      }
  }

  // --- 4. Ewbank (Australia/SA) e.g. 18, 22 ---
  // Checks if it is a pure number between 10 and 39 (typical range)
  if (/^\d+$/.test(g)) {
      const val = parseInt(g);
      if (val >= 10 && val < 40) {
        // Ewbank 18 is 5.9 (value 9)
        // Ewbank 24 is 5.11d (value 11.75)
        // Formula: (Ewbank - 9) / 2 + 4.5 approximates the 5.x scale
        return (val - 9) / 2 + 4.5;
      }
  }

  return 0;
};