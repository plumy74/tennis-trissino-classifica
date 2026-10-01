import { Tournament, TournamentMatch, TournamentParticipant, RoundRobinStanding } from '../types/tennis';

/**
 * Trova la potenza di 2 successiva (4, 8, 16, 32)
 */
function nextPowerOfTwo(n: number): number {
  let p = 4;
  while (p < n) {
    p *= 2;
  }
  return p;
}

function getRoundName(roundIndex: number, totalRounds: number): string {
  const diffFromFinal = totalRounds - roundIndex;
  if (diffFromFinal === 0) return 'Finale';
  if (diffFromFinal === 1) return 'Semifinale';
  if (diffFromFinal === 2) return 'Quarti di finale';
  if (diffFromFinal === 3) return 'Ottavi di finale';
  if (diffFromFinal === 4) return 'Sedicesimi di finale';
  return `Turno ${roundIndex + 1}`;
}

/**
 * Genera il tabellone ad eliminazione diretta con teste di serie e collegamenti automatici
 */
export function generateEliminationBracket(
  tournamentId: string,
  participants: TournamentParticipant[]
): TournamentMatch[] {
  const numPlayers = participants.length;
  if (numPlayers < 2) return [];

  const bracketSize = Math.max(4, nextPowerOfTwo(numPlayers));
  const totalRounds = Math.log2(bracketSize);

  // Ordina per seed se presente
  const seeded = [...participants].sort((a, b) => (a.seed || 999) - (b.seed || 999));

  // Inserimento con schema classico teste di serie per tabelloni tennistici
  // Per 8 giocatori: 1 vs 8, 4 vs 5, 3 vs 6, 2 vs 7
  const slots: (TournamentParticipant | null)[] = new Array(bracketSize).fill(null);
  
  if (bracketSize === 4) {
    // 1-4, 3-2
    const seedsOrder = [0, 3, 2, 1];
    seeded.forEach((p, idx) => {
      if (idx < seedsOrder.length) slots[seedsOrder[idx]] = p;
    });
  } else if (bracketSize === 8) {
    const seedsOrder = [0, 7, 3, 4, 2, 5, 1, 6];
    seeded.forEach((p, idx) => {
      if (idx < seedsOrder.length) slots[seedsOrder[idx]] = p;
    });
  } else if (bracketSize === 16) {
    const seedsOrder = [0, 15, 7, 8, 3, 12, 4, 11, 2, 13, 5, 10, 1, 14, 6, 9];
    seeded.forEach((p, idx) => {
      if (idx < seedsOrder.length) slots[seedsOrder[idx]] = p;
    });
  } else {
    // Generico
    seeded.forEach((p, idx) => {
      if (idx < bracketSize) slots[idx] = p;
    });
  }

  const matches: TournamentMatch[] = [];
  const matchesByRound: TournamentMatch[][] = [];

  // Creiamo i round partendo dalla Finale a ritroso fino al Turno 1 per collegare i nextMatchId
  let currentMatchesCount = 1;
  const roundsPlan: { roundIndex: number; matchesCount: number }[] = [];

  for (let r = totalRounds - 1; r >= 0; r--) {
    roundsPlan.unshift({ roundIndex: r, matchesCount: currentMatchesCount });
    currentMatchesCount *= 2;
  }

  // Creiamo prima tutti i match con ID deterministici
  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesCount = bracketSize / Math.pow(2, r + 1);
    const roundName = getRoundName(r, totalRounds - 1);
    const currentRoundList: TournamentMatch[] = [];

    for (let m = 0; m < roundMatchesCount; m++) {
      const matchId = `${tournamentId}_r${r}_m${m}`;
      let nextMatchId: string | null = null;
      let nextMatchSlot: 'p1' | 'p2' | undefined = undefined;

      if (r < totalRounds - 1) {
        const nextRoundMatchIndex = Math.floor(m / 2);
        nextMatchId = `${tournamentId}_r${r + 1}_m${nextRoundMatchIndex}`;
        nextMatchSlot = m % 2 === 0 ? 'p1' : 'p2';
      }

      let p1: TournamentParticipant | null = null;
      let p2: TournamentParticipant | null = null;

      // Se primo round, popoliamo dai partecipanti
      if (r === 0) {
        p1 = slots[m * 2] || null;
        p2 = slots[m * 2 + 1] || null;
      }

      const match: TournamentMatch = {
        id: matchId,
        tournamentId,
        tournamentType: 'elimination',
        round: r + 1,
        roundName,
        matchNumber: m + 1,
        player1Id: p1 ? p1.playerId : null,
        player1Name: p1 ? p1.name : (r === 0 ? 'BYE' : 'Da definire'),
        player1Seed: p1?.seed ?? null,
        player2Id: p2 ? p2.playerId : null,
        player2Name: p2 ? p2.name : (r === 0 ? 'BYE' : 'Da definire'),
        player2Seed: p2?.seed ?? null,
        winnerId: null,
        score: '',
        nextMatchId: nextMatchId ?? null,
        nextMatchSlot: nextMatchSlot ?? null,
        status: (r === 0 && (!p1 || !p2)) ? 'bye' : 'scheduled',
        updatedAt: new Date().toISOString()
      };

      // Gestione automatica del BYE se uno dei due giocatori non c'è nel primo turno
      if (r === 0) {
        if (p1 && !p2) {
          match.winnerId = p1.playerId;
          match.score = 'BYE (Avanza)';
          match.status = 'completed';
        } else if (!p1 && p2) {
          match.winnerId = p2.playerId;
          match.score = 'BYE (Avanza)';
          match.status = 'completed';
        }
      }

      currentRoundList.push(match);
      matches.push(match);
    }
    matchesByRound.push(currentRoundList);
  }

  // Propaghiamo i vincitori di bye al round 2
  if (totalRounds > 1) {
    const firstRound = matchesByRound[0];
    const secondRound = matchesByRound[1];

    firstRound.forEach(m => {
      if (m.status === 'completed' && m.winnerId && m.nextMatchId && m.nextMatchSlot) {
        const nextMatch = secondRound.find(nm => nm.id === m.nextMatchId);
        if (nextMatch) {
          const winnerName = m.winnerId === m.player1Id ? m.player1Name : m.player2Name;
          const winnerSeed = m.winnerId === m.player1Id ? m.player1Seed : m.player2Seed;
          if (m.nextMatchSlot === 'p1') {
            nextMatch.player1Id = m.winnerId;
            nextMatch.player1Name = winnerName;
            nextMatch.player1Seed = winnerSeed;
          } else {
            nextMatch.player2Id = m.winnerId;
            nextMatch.player2Name = winnerName;
            nextMatch.player2Seed = winnerSeed;
          }
        }
      }
    });
  }

  return matches;
}

/**
 * Genera il calendario Round Robin (gironi all'italiana) con algoritmo Berger
 */
export function generateRoundRobinMatches(
  tournamentId: string,
  participants: TournamentParticipant[],
  groupName: string = 'Girone Unico'
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const list = [...participants];

  // Se dispari, aggiungi 'Riposo' virtuale
  const isOdd = list.length % 2 !== 0;
  if (isOdd) {
    list.push({ playerId: 'BYE', name: 'Riposo' });
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  let teamIndexes = list.map((_, i) => i);

  for (let r = 0; r < numRounds; r++) {
    for (let m = 0; m < half; m++) {
      const idx1 = teamIndexes[m];
      const idx2 = teamIndexes[numTeams - 1 - m];

      const p1 = list[idx1];
      const p2 = list[idx2];

      if (p1.playerId !== 'BYE' && p2.playerId !== 'BYE') {
        matches.push({
          id: `${tournamentId}_${groupName.replace(/\s+/g, '_')}_r${r + 1}_m${m + 1}`,
          tournamentId,
          tournamentType: 'round_robin',
          round: r + 1,
          roundName: `${groupName} - Giornata ${r + 1}`,
          group: groupName,
          matchNumber: matches.length + 1,
          player1Id: p1.playerId,
          player1Name: p1.name,
          player1Seed: p1.seed ?? null,
          player2Id: p2.playerId,
          player2Name: p2.name,
          player2Seed: p2.seed ?? null,
          winnerId: null,
          score: '',
          status: 'scheduled',
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Rotazione algoritmo Berger: mantieni fisso il primo elemento e ruota gli altri
    teamIndexes = [
      teamIndexes[0],
      teamIndexes[numTeams - 1],
      ...teamIndexes.slice(1, numTeams - 1)
    ];
  }

  return matches;
}

/**
 * Calcola la classifica del girone Round Robin
 */
export function calculateRoundRobinStandings(
  participants: TournamentParticipant[],
  matches: TournamentMatch[]
): RoundRobinStanding[] {
  const standingsMap = new Map<string, RoundRobinStanding>();

  participants.forEach(p => {
    standingsMap.set(p.playerId, {
      player: p,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0
    });
  });

  matches.forEach(m => {
    if (m.status !== 'completed' || !m.winnerId || !m.player1Id || !m.player2Id) return;

    const s1 = standingsMap.get(m.player1Id);
    const s2 = standingsMap.get(m.player2Id);
    if (!s1 || !s2) return;

    s1.played += 1;
    s2.played += 1;

    if (m.winnerId === m.player1Id) {
      s1.won += 1;
      s1.points += 2; // 2 punti a vittoria nel girone sociale
      s2.lost += 1;
    } else {
      s2.won += 1;
      s2.points += 2;
      s1.lost += 1;
    }

    // Analisi punteggio set es: "6-3 6-4" o "6-4 3-6 10-8"
    if (m.score) {
      const setStrings = m.score.trim().split(/\s+/);
      setStrings.forEach(setStr => {
        const parts = setStr.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          s1.gamesWon += parts[0];
          s1.gamesLost += parts[1];
          s2.gamesWon += parts[1];
          s2.gamesLost += parts[0];

          if (parts[0] > parts[1]) {
            s1.setsWon += 1;
            s2.setsLost += 1;
          } else if (parts[1] > parts[0]) {
            s2.setsWon += 1;
            s1.setsLost += 1;
          }
        }
      });
    }
  });

  const standings = Array.from(standingsMap.values());
  // Ordina per punti, poi differenza set, poi differenza game
  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    const gameDiffA = a.gamesWon - a.gamesLost;
    const gameDiffB = b.gamesWon - b.gamesLost;
    return gameDiffB - gameDiffA;
  });
}
