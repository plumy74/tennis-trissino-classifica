import { Player, PlayerCategory, RankingMatch } from '../types/tennis';

export interface ScoreCalculationResult {
  winnerPointsEarned: number;
  loserPointsLost: number;
  ruleDescription: string;
  rankDiff: number; // Positive means opponent was higher ranked
  isHigherRank: boolean;
  isSameRank: boolean;
  isLowerRank: boolean;
}

/**
 * Calcola i punti classifica mobile secondo il regolamento del circolo:
 * - Se vinci con avversario di pari classifica: +20 punti
 * - Se vinci con avversario di 1 o 2 classifiche superiori: +40 punti
 * - Se vinci con avversario da 4 classifiche superiori (e 3+): +40 punti
 * - Se vieni sconfitto: -10 punti
 * - Se vinci con avversario di classifica inferiore: +15 punti (vittoria standard)
 * 
 * Nota sulle posizioni: in classifica, la posizione 1 è superiore alla posizione 4.
 * Quindi se il Vincitore è al n. 5 e lo Sconfitto è al n. 3, la differenza è (5 - 3) = +2 posizioni superiori.
 */
export function calculateRankingPoints(
  winnerRank: number,
  loserRank: number
): ScoreCalculationResult {
  // Posizione inferiore numericamente = classifica migliore/superiore (es. Rank 1 > Rank 4)
  // rankDiff > 0 significa che il Vincitore era SOTTO in classifica (es. Rank 5 contro Rank 3)
  const rankDiff = winnerRank - loserRank;

  let winnerPoints = 15;
  let loserPoints = 5;
  let ruleDescription = '';
  let isHigherRank = false;
  let isSameRank = false;
  let isLowerRank = false;

  if (rankDiff === 0) {
    // Pari classifica
    winnerPoints = 10;
    loserPoints = 5;
    ruleDescription = 'Scontro alla pari: Vittoria con avversario di pari classifica (+10 pt / -5 pt)';
    isSameRank = true;
  } else if (rankDiff > 0) {
    // Il vincitore era SOTTO in classifica (upset/sfidante) -> Guadagna molti più punti, e chi era sopra perde di più
    isLowerRank = true;
    const diff = rankDiff;
    if (diff <= 2) {
      winnerPoints = 20;
      loserPoints = 8;
      ruleDescription = `Piccola Sorpresa! Vittoria contro giocatore sopra di ${diff} posizion${diff === 1 ? 'e' : 'i'} (+20 pt / -8 pt)`;
    } else if (diff <= 5) {
      winnerPoints = 30;
      loserPoints = 12;
      ruleDescription = `Grande Sorpresa! Vittoria contro giocatore sopra di ${diff} posizioni (+30 pt / -12 pt)`;
    } else {
      winnerPoints = 40;
      loserPoints = 15;
      ruleDescription = `Impresa Straordinaria! Vittoria contro giocatore sopra di ${diff} posizioni (+40 pt / -15 pt)`;
    }
  } else {
    // Il vincitore era SOPRA in classifica (vittoria favorita) -> Punti al favorito (+15 o +10), pochissimi punti persi per chi era sotto
    isHigherRank = true;
    const diff = Math.abs(rankDiff);
    
    // Chi era sotto perde pochissimo (o 0) se viene sconfitto da un giocatore molto più forte
    if (diff <= 3) {
      winnerPoints = 15;
      loserPoints = 3;
      ruleDescription = `Vittoria attesa: Favorito batte avversario sotto di ${diff} posizion${diff === 1 ? 'e' : 'i'} (+15 pt / -3 pt)`;
    } else {
      winnerPoints = 10;
      loserPoints = 0;
      ruleDescription = `Nessun danno: Favorito batte avversario molto sotto di ${diff} posizioni (+10 pt / -0 pt)`;
    }
  }

  return {
    winnerPointsEarned: winnerPoints,
    loserPointsLost: loserPoints,
    ruleDescription,
    rankDiff,
    isHigherRank,
    isSameRank,
    isLowerRank
  };
}

/**
 * Ricalcola la classifica del circolo separatamente per ciascuna categoria
 * (Maschile, Femminile, Doppio) ordinando per punti decrescenti
 */
export function recalculateLadderRanks(players: Player[]): Player[] {
  const categories: PlayerCategory[] = ['maschile', 'femminile', 'doppio'];
  const result: Player[] = [];

  for (const cat of categories) {
    const catPlayers = players.filter(p => (p.category || 'maschile') === cat);
    catPlayers.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const rateA = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
      const rateB = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
      if (rateB !== rateA) return rateB - rateA;
      return b.matchesWon - a.matchesWon;
    });

    let currentRank = 1;
    catPlayers.forEach((player, index) => {
      if (index > 0) {
        const prev = catPlayers[index - 1];
        if (prev.points !== player.points || 
            (prev.matchesPlayed > 0 ? prev.matchesWon / prev.matchesPlayed : 0) !== (player.matchesPlayed > 0 ? player.matchesWon / player.matchesPlayed : 0) ||
            prev.matchesWon !== player.matchesWon) {
          currentRank = index + 1;
        }
      }

      result.push({
        ...player,
        category: player.category || cat,
        previousRank: player.rank || currentRank,
        rank: currentRank,
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Eventuali giocatori con categoria non ancora specificata
  const otherPlayers = players.filter(p => !categories.includes((p.category || '') as any));
  let otherRank = 1;
  otherPlayers.forEach((player, index) => {
    if (index > 0) {
      const prev = otherPlayers[index - 1];
      if (prev.points !== player.points || prev.matchesWon !== player.matchesWon) {
        otherRank = index + 1;
      }
    }
    result.push({
      ...player,
      category: 'maschile',
      previousRank: player.rank || otherRank,
      rank: otherRank,
      updatedAt: new Date().toISOString()
    });
  });

  return result;
}

/**
 * Calcola l'età anagrafica a partire dalla data di nascita (YYYY-MM-DD)
 */
export function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : null;
}

/**
 * Formatta la data di nascita in formato italiano (DD/MM/YYYY)
 */
export function formatBirthDate(birthDate?: string | null): string {
  if (!birthDate) return '';
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return birthDate;
  return date.toLocaleDateString('it-IT');
}

/**
 * Ricalcola da zero i punteggi e le statistiche di tutti i giocatori in base ad un elenco filtrato di partite
 */
export function computePlayersStatsFromMatches(
  players: Player[],
  rankingMatches: RankingMatch[]
): Player[] {
  const initialPointsValue = 0;
  
  // Crea mappa locale dei giocatori azzerando i punti e le statistiche
  const playerMap = new Map<string, Player>();
  players.forEach(p => playerMap.set(p.id, {
    ...p,
    points: initialPointsValue,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: p.rank || 999,
    previousRank: p.previousRank || 999
  }));

  // Ordina i match in ordine cronologico (dal meno recente al più recente)
  const chronologicalMatches = [...rankingMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  chronologicalMatches.forEach(match => {
    const p1 = playerMap.get(match.player1Id);
    const p2 = playerMap.get(match.player2Id);
    
    if (!p1 || !p2) return;

    const wId = match.winnerId;
    const lId = match.loserId;

    let p1SetsWon = 0;
    let p2SetsWon = 0;
    let p1GamesWon = 0;
    let p2GamesWon = 0;

    if (match.sets && Array.isArray(match.sets)) {
      match.sets.forEach(set => {
        p1GamesWon += set.p1 || 0;
        p2GamesWon += set.p2 || 0;
        if (set.p1 > set.p2) {
          p1SetsWon++;
        } else if (set.p2 > set.p1) {
          p2SetsWon++;
        }
      });
    }

    const winner = playerMap.get(wId);
    if (winner) {
      const isWinnerP1 = wId === match.player1Id;
      const setsWonInMatch = isWinnerP1 ? p1SetsWon : p2SetsWon;
      const setsLostInMatch = isWinnerP1 ? p2SetsWon : p1SetsWon;
      const gamesWonInMatch = isWinnerP1 ? p1GamesWon : p2GamesWon;
      const gamesLostInMatch = isWinnerP1 ? p2GamesWon : p1GamesWon;

      winner.points += match.pointsAwardedWinner;
      winner.matchesPlayed += 1;
      winner.matchesWon += 1;
      winner.setsWon += setsWonInMatch;
      winner.setsLost += setsLostInMatch;
      winner.gamesWon += gamesWonInMatch;
      winner.gamesLost += gamesLostInMatch;
      winner.currentStreak = winner.currentStreak > 0 ? winner.currentStreak + 1 : 1;
      winner.bestStreak = Math.max(winner.bestStreak, winner.currentStreak);
    }

    const loser = playerMap.get(lId);
    if (loser) {
      const isLoserP1 = lId === match.player1Id;
      const setsWonInMatch = isLoserP1 ? p1SetsWon : p2SetsWon;
      const setsLostInMatch = isLoserP1 ? p2SetsWon : p1SetsWon;
      const gamesWonInMatch = isLoserP1 ? p1GamesWon : p2GamesWon;
      const gamesLostInMatch = isLoserP1 ? p2GamesWon : p1GamesWon;

      loser.points = Math.max(0, loser.points - match.pointsDeductedLoser);
      loser.matchesPlayed += 1;
      loser.matchesLost += 1;
      loser.setsWon += setsWonInMatch;
      loser.setsLost += setsLostInMatch;
      loser.gamesWon += gamesWonInMatch;
      loser.gamesLost += gamesLostInMatch;
      loser.currentStreak = loser.currentStreak < 0 ? loser.currentStreak - 1 : -1;
    }
  });

  return recalculateLadderRanks(Array.from(playerMap.values()));
}
