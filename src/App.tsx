import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  getDocs 
} from 'firebase/firestore';
import { 
  db, 
  testConnection, 
  seedInitialDataIfEmpty, 
  clearAllSampleData,
  handleFirestoreError, 
  sanitizeForFirestore,
  OperationType,
  INITIAL_CLUB_SETTINGS,
  INITIAL_PLAYERS,
  INITIAL_RANKING_MATCHES
} from './lib/firebase';
import { 
  Player, 
  RankingMatch, 
  Tournament, 
  TournamentMatch, 
  ClubSettings 
} from './types/tennis';
import { recalculateLadderRanks } from './utils/scoring';

// Components
import { Navbar, AppTab } from './components/Navbar';
import { RankingLadder } from './components/RankingLadder';
import { TournamentView } from './components/TournamentView';
import { PlayerDashboard } from './components/PlayerDashboard';
import { NoticeBoardView } from './components/NoticeBoardView';
import { AdminManagerView } from './components/AdminManagerView';
import { MatchRecorderModal } from './components/MatchRecorderModal';
import { TournamentModal } from './components/TournamentModal';
import { AdminPinModal } from './components/AdminPinModal';
import { ClubSettingsModal } from './components/ClubSettingsModal';
import { Settings, ShieldCheck, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';

import { ClubLogo } from './components/ClubLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('noticeboard');
  
  // Data States from Firestore
  const [clubSettings, setClubSettings] = useState<ClubSettings>(INITIAL_CLUB_SETTINGS);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [rankingMatches, setRankingMatches] = useState<RankingMatch[]>(INITIAL_RANKING_MATCHES);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  
  // Selected IDs
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Admin and UI states
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Modals
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState<boolean>(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // 1. Initial Connection & check for old sample data
  useEffect(() => {
    async function init() {
      setIsSyncing(true);
      try {
        await testConnection();
        // Check if there are mock data (e.g. p1, tourn-elim-1) and clear
        const playersSnap = await getDocs(collection(db, 'players'));
        let hasMockData = false;
        playersSnap.forEach(d => {
          if (d.id === 'p1' || d.id === 'p2' || d.id === 'p3') {
            hasMockData = true;
          }
        });
        if (hasMockData) {
          console.log('Rilevati vecchi dati di esempio: cancellazione automatica in corso...');
          await clearAllSampleData();
        }
      } catch (err) {
        console.warn('Inizializzazione completata:', err);
      } finally {
        setIsSyncing(false);
      }
    }
    init();
  }, []);

  // 2. Real-Time Listeners from Firestore
  useEffect(() => {
    // A. Club Settings listener
    const unsubSettings = onSnapshot(
      doc(db, 'clubSettings', 'main'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ClubSettings;
          if (!data.clubName || data.clubName === 'Circolo Tennis') {
            const upgraded: ClubSettings = {
              ...data,
              clubName: 'Tennis Comunali Trissino',
              city: data.city || 'Trissino (VI)',
              address: data.address || 'Via Palladio, 24 - 36070 Trissino (VI)',
              phone: data.phone || '+39 320 8080670',
              logoUrl: data.logoUrl || '/logo.svg'
            };
            setDoc(doc(db, 'clubSettings', 'main'), sanitizeForFirestore(upgraded)).catch(console.error);
            setClubSettings(upgraded);
          } else {
            setClubSettings(data);
          }
        } else {
          setDoc(doc(db, 'clubSettings', 'main'), sanitizeForFirestore(INITIAL_CLUB_SETTINGS)).catch(console.error);
          setClubSettings(INITIAL_CLUB_SETTINGS);
        }
      },
      (error) => {
        console.error('Settings snapshot error:', error);
      }
    );

    // B. Players listener
    const unsubPlayers = onSnapshot(
      collection(db, 'players'),
      (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, Player>();
          snapshot.forEach((docSnap) => {
            const player = docSnap.data() as Player;
            map.set(player.id, player);
          });
          const list = Array.from(map.values());
          const sorted = recalculateLadderRanks(list);
          setPlayers(sorted);
          if (sorted.length > 0) {
            setSelectedPlayerId(prev => prev || sorted[0].id);
          }
        } else {
          setPlayers([]);
          setSelectedPlayerId('');
        }
      },
      (error) => {
        console.error('Players snapshot error:', error);
      }
    );

    // C. Ranking Matches listener
    const unsubRankingMatches = onSnapshot(
      collection(db, 'rankingMatches'),
      (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, RankingMatch>();
          snapshot.forEach((docSnap) => {
            const match = docSnap.data() as RankingMatch;
            map.set(match.id, match);
          });
          const list = Array.from(map.values());
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRankingMatches(list);
        } else {
          setRankingMatches([]);
        }
      },
      (error) => {
        console.error('Ranking matches snapshot error:', error);
      }
    );

    // D. Tournaments listener
    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, Tournament>();
          snapshot.forEach((docSnap) => {
            const t = docSnap.data() as Tournament;
            map.set(t.id, t);
          });
          const list = Array.from(map.values());
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTournaments(list);
          if (list.length > 0 && !selectedTournamentId) {
            setSelectedTournamentId(list[0].id);
          }
        } else {
          setTournaments([]);
          setSelectedTournamentId(null);
        }
      },
      (error) => {
        console.error('Tournaments snapshot error:', error);
      }
    );

    // E. Tournament Matches listener
    const unsubTournamentMatches = onSnapshot(
      collection(db, 'tournamentMatches'),
      (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, TournamentMatch>();
          snapshot.forEach((docSnap) => {
            const m = docSnap.data() as TournamentMatch;
            map.set(m.id, m);
          });
          const list = Array.from(map.values());
          setTournamentMatches(list);
        } else {
          setTournamentMatches([]);
        }
      },
      (error) => {
        console.error('Tournament matches snapshot error:', error);
      }
    );

    return () => {
      unsubSettings();
      unsubPlayers();
      unsubRankingMatches();
      unsubTournaments();
      unsubTournamentMatches();
    };
  }, [selectedTournamentId]);

  // Fully automated alignment and healing when players or matches are modified (including deletions)
  useEffect(() => {
    if (players.length === 0 || isSyncing) return;

    const initialPointsValue = 0;
    
    // Create a local map of players
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

    // Sort existing matches chronologically (oldest first)
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

    const reRanked = recalculateLadderRanks(Array.from(playerMap.values()));

    // Check if there's any discrepancy
    let hasDiscrepancy = false;
    for (const p of reRanked) {
      const orig = players.find(x => x.id === p.id);
      if (!orig) continue;
      if (
        orig.points !== p.points || 
        orig.matchesPlayed !== p.matchesPlayed ||
        orig.matchesWon !== p.matchesWon ||
        orig.matchesLost !== p.matchesLost ||
        orig.setsWon !== p.setsWon ||
        orig.setsLost !== p.setsLost ||
        orig.gamesWon !== p.gamesWon ||
        orig.gamesLost !== p.gamesLost ||
        orig.currentStreak !== p.currentStreak ||
        orig.bestStreak !== p.bestStreak ||
        orig.rank !== p.rank ||
        orig.previousRank !== p.previousRank
      ) {
        hasDiscrepancy = true;
        break;
      }
    }

    if (hasDiscrepancy) {
      console.log('Automated alignment: Discrepancy detected in player stats, repairing...');
      const batch = writeBatch(db);
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });
      batch.commit().then(() => {
        console.log('Automated alignment: Database successfully healed!');
        setPlayers(reRanked);
      }).catch(console.error);
    }
  }, [players, rankingMatches, isSyncing]);

  // Handler: Add New Player
  const handleAddPlayer = async (newPlayer: Player) => {
    try {
      const allPlayers = [...players, newPlayer];
      const reRanked = recalculateLadderRanks(allPlayers);
      
      const batch = writeBatch(db);
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });
      await batch.commit();
      
      setPlayers(reRanked);
      setSelectedPlayerId(newPlayer.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'players');
    }
  };

  // Handler: Update Existing Player
  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      const otherPlayers = players.filter(p => p.id !== updatedPlayer.id);
      const reRanked = recalculateLadderRanks([...otherPlayers, updatedPlayer]);

      const batch = writeBatch(db);
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });
      await batch.commit();

      setPlayers(reRanked);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `players/${updatedPlayer.id}`);
    }
  };

  // Handler: Delete Player
  const handleDeletePlayer = async (playerId: string) => {
    try {
      const remaining = players.filter(p => p.id !== playerId);
      const reRanked = recalculateLadderRanks(remaining);

      const batch = writeBatch(db);
      batch.delete(doc(db, 'players', playerId));
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });
      await batch.commit();

      setPlayers(reRanked);
      if (selectedPlayerId === playerId) {
        setSelectedPlayerId(reRanked[0]?.id || '');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}`);
    }
  };

  // Utility: Recalculate ALL players' stats chronologically from scratch based on remaining ranking matches
  const getRecalculatedPlayers = (currentPlayers: Player[], currentMatches: RankingMatch[]): Player[] => {
    const initialPointsValue = 0;
    
    const resetPlayers = currentPlayers.map(p => ({
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

    const playerMap = new Map<string, typeof resetPlayers[0]>();
    resetPlayers.forEach(p => playerMap.set(p.id, p));

    // Sort existing matches chronologically (oldest first)
    const chronologicalMatches = [...currentMatches].sort(
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
  };

  // Handler: Save Ranking Match & update players in Firestore
  const handleSaveRankingMatch = async (newMatch: RankingMatch, updatedPlayers: Player[]) => {
    try {
      const batch = writeBatch(db);

      // Salva match
      batch.set(doc(db, 'rankingMatches', newMatch.id), sanitizeForFirestore(newMatch));

      // Calcola l'array locale dei rankingMatches in tempo reale con il nuovo incontro
      const updatedMatchesMap = new Map<string, RankingMatch>();
      rankingMatches.forEach(m => updatedMatchesMap.set(m.id, m));
      updatedMatchesMap.set(newMatch.id, newMatch);
      const updatedMatches = Array.from(updatedMatchesMap.values());

      // Ricalcola da zero tutte le statistiche di tutti i giocatori in modo perfettamente allineato e cronologico
      const reRanked = getRecalculatedPlayers(players, updatedMatches);

      // Salva tutti i giocatori aggiornati in batch
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });

      await batch.commit();

      setRankingMatches(updatedMatches.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setPlayers(reRanked);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rankingMatches');
    }
  };

  // Handler: Delete Ranking Match
  const handleDeleteRankingMatch = async (matchId: string) => {
    try {
      const batch = writeBatch(db);

      // Cancella l'incontro da Firestore
      batch.delete(doc(db, 'rankingMatches', matchId));

      // Filtra l'incontro eliminato dalla lista
      const updatedMatches = rankingMatches.filter(m => m.id !== matchId);

      // Ricalcola da zero tutte le statistiche di tutti i giocatori basandosi solo sui match rimasti
      const reRanked = getRecalculatedPlayers(players, updatedMatches);

      // Salva tutti i giocatori aggiornati in batch
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });

      await batch.commit();

      setRankingMatches(updatedMatches);
      setPlayers(reRanked);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rankingMatches/${matchId}`);
    }
  };

  // Handler: Save New Tournament in Firestore
  const handleCreateTournament = async (newTourn: Tournament, matches: TournamentMatch[]) => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'tournaments', newTourn.id), sanitizeForFirestore(newTourn));

      matches.forEach(m => {
        batch.set(doc(db, 'tournamentMatches', m.id), sanitizeForFirestore(m));
      });

      await batch.commit();
      setSelectedTournamentId(newTourn.id);
      setActiveTab('tournaments');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournaments');
    }
  };

  // Handler: Update Tournament Match Score and advance winner
  const handleUpdateTournamentMatchScore = async (
    matchId: string, 
    score: string, 
    winnerId: string, 
    winnerName: string,
    nextMatchId?: string | null,
    nextMatchSlot?: 'p1' | 'p2' | null
  ) => {
    try {
      const batch = writeBatch(db);
      
      const currentMatch = tournamentMatches.find(m => m.id === matchId);
      if (!currentMatch) return;

      const updatedCurrentMatch: Partial<TournamentMatch> = {
        score,
        winnerId,
        status: 'completed',
        updatedAt: new Date().toISOString()
      };

      batch.update(doc(db, 'tournamentMatches', matchId), sanitizeForFirestore(updatedCurrentMatch));

      // Se c'è un round successivo nel tabellone ad eliminazione, avanza il giocatore
      if (nextMatchId && nextMatchSlot) {
        const nextMatchRef = doc(db, 'tournamentMatches', nextMatchId);
        if (nextMatchSlot === 'p1') {
          batch.update(nextMatchRef, sanitizeForFirestore({
            player1Id: winnerId,
            player1Name: winnerName,
            status: 'scheduled'
          }));
        } else {
          batch.update(nextMatchRef, sanitizeForFirestore({
            player2Id: winnerId,
            player2Name: winnerName,
            status: 'scheduled'
          }));
        }
      }

      // Se era la finale, aggiorna anche il torneo con il vincitore
      if (currentMatch.roundName.toLowerCase().includes('finale') && !currentMatch.roundName.toLowerCase().includes('semi')) {
        const tournRef = doc(db, 'tournaments', currentMatch.tournamentId);
        batch.update(tournRef, sanitizeForFirestore({
          winnerId,
          winnerName,
          status: 'completed',
          updatedAt: new Date().toISOString()
        }));
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournamentMatches/${matchId}`);
    }
  };

  // Handler: Update Tournament
  const handleUpdateTournament = async (updatedTourn: Tournament) => {
    try {
      await updateDoc(doc(db, 'tournaments', updatedTourn.id), sanitizeForFirestore({
        ...updatedTourn,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${updatedTourn.id}`);
    }
  };

  // Handler: Delete Tournament
  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'tournaments', tournamentId));
      
      const relatedMatches = tournamentMatches.filter(m => m.tournamentId === tournamentId);
      relatedMatches.forEach(m => {
        batch.delete(doc(db, 'tournamentMatches', m.id));
      });
      await batch.commit();

      const remainingTourns = tournaments.filter(t => t.id !== tournamentId);
      setTournaments(remainingTourns);
      setTournamentMatches(prev => prev.filter(m => m.tournamentId !== tournamentId));
      if (selectedTournamentId === tournamentId) {
        setSelectedTournamentId(remainingTourns[0]?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${tournamentId}`);
    }
  };

  // Handler: Save Club Settings
  const handleSaveClubSettings = async (newSettings: ClubSettings) => {
    try {
      await setDoc(doc(db, 'clubSettings', 'main'), sanitizeForFirestore(newSettings));
      setClubSettings(newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clubSettings/main');
    }
  };

  // Handler: Recalculate all players' stats from scratch based on remaining ranking matches
  const handleRecalculateAllPlayerStats = async () => {
    try {
      const initialPointsValue = 0;
      
      const resetPlayers = players.map(p => ({
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

      const playerMap = new Map<string, typeof resetPlayers[0]>();
      resetPlayers.forEach(p => playerMap.set(p.id, p));

      // Sort existing matches chronologically (oldest first)
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

      const reRanked = recalculateLadderRanks(Array.from(playerMap.values()));

      const batch = writeBatch(db);
      reRanked.forEach(p => {
        batch.set(doc(db, 'players', p.id), sanitizeForFirestore(p));
      });

      await batch.commit();
      setPlayers(reRanked);
      alert('Sincronizzazione e ricalcolo completati con successo! Tutti i punti e le statistiche dei soci in classifica sono stati ricalcolati da zero e riallineati con le partite reali.');
    } catch (error) {
      console.error('Error in recalculating player stats:', error);
      alert('Errore durante il ricalcolo delle statistiche.');
    }
  };

  // Handler: Clear All Data from database
  const handleClearAllData = async () => {
    await clearAllSampleData();
    setPlayers([]);
    setRankingMatches([]);
    setTournaments([]);
    setTournamentMatches([]);
    setSelectedTournamentId(null);
    setSelectedPlayerId('');
  };

  const handleSelectPlayerFromAnywhere = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActiveTab('player');
  };

  const handleSelectTournamentFromAnywhere = (tournId: string) => {
    setSelectedTournamentId(tournId);
    setActiveTab('tournaments');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onToggleAdmin={() => {
          if (isAdmin) {
            setIsAdmin(false);
            if (activeTab === 'manager') setActiveTab('noticeboard');
          } else {
            setIsAdminPinModalOpen(true);
          }
        }}
        onNewMatch={() => {
          if (isAdmin) setIsMatchModalOpen(true);
        }}
        onNewTournament={() => {
          if (isAdmin) setIsTournamentModalOpen(true);
        }}
        clubName={clubSettings.clubName}
        logoUrl={clubSettings.logoUrl}
        isSyncing={isSyncing}
      />

      {/* Admin Mode Status Banner */}
      {isAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 no-print">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="font-bold">Area Gestore Circolo Attiva</span>
              <span className="hidden sm:inline text-slate-400">
                • Puoi inserire e modificare atleti, registrare sfide e gestire i tornei
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'manager' ? (
                <button
                  onClick={() => setActiveTab('manager')}
                  className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg font-black text-xs hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Pannello Gestore</span>
                  <Settings className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('noticeboard')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Vai a Vista Pubblica</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsAdmin(false);
                  if (activeTab === 'manager') setActiveTab('noticeboard');
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* TAB 0: Area Privata Gestore (riservata) */}
        {activeTab === 'manager' && isAdmin && (
          <AdminManagerView
            players={players}
            rankingMatches={rankingMatches}
            tournaments={tournaments}
            tournamentMatches={tournamentMatches}
            clubSettings={clubSettings}
            onSaveClubSettings={handleSaveClubSettings}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onSaveRankingMatch={handleSaveRankingMatch}
            onDeleteRankingMatch={handleDeleteRankingMatch}
            onOpenNewTournamentModal={() => setIsTournamentModalOpen(true)}
            onDeleteTournament={handleDeleteTournament}
            onUpdateTournamentMatchScore={handleUpdateTournamentMatchScore}
            onClearAllData={handleClearAllData}
            onExitAdmin={() => {
              setIsAdmin(false);
              setActiveTab('noticeboard');
            }}
            onViewPublicTab={(tab) => setActiveTab(tab)}
            onRecalculateAllPlayerStats={handleRecalculateAllPlayerStats}
          />
        )}

        {/* TAB 1: Classifiche (Maschile, Femminile, Doppio) */}
        {activeTab === 'ladder' && (
          <RankingLadder
            players={players}
            rankingMatches={rankingMatches}
            isAdmin={isAdmin}
            onOpenMatchModal={() => setIsMatchModalOpen(true)}
            onSelectPlayer={handleSelectPlayerFromAnywhere}
            onAddPlayer={() => setIsSettingsModalOpen(true)}
            onOpenManagerArea={() => {
              if (isAdmin) {
                setActiveTab('manager');
              } else {
                setIsAdminPinModalOpen(true);
              }
            }}
          />
        )}

        {/* TAB 2: Tornei Sociali */}
        {activeTab === 'tournaments' && (
          <TournamentView
            tournaments={tournaments}
            matches={tournamentMatches}
            selectedTournamentId={selectedTournamentId}
            onSelectTournament={setSelectedTournamentId}
            onOpenNewTournamentModal={() => setIsTournamentModalOpen(true)}
            isAdmin={isAdmin}
            clubName={clubSettings.clubName}
            onUpdateMatchScore={handleUpdateTournamentMatchScore}
            onUpdateTournament={handleUpdateTournament}
          />
        )}

        {/* TAB 3: Dashboard / Profilo Giocatore */}
        {activeTab === 'player' && (
          <PlayerDashboard
            players={players}
            rankingMatches={rankingMatches}
            tournamentMatches={tournamentMatches}
            tournaments={tournaments}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}

        {/* TAB 4: Bacheca Live del Circolo */}
        {activeTab === 'noticeboard' && (
          <NoticeBoardView
            clubSettings={clubSettings}
            players={players}
            rankingMatches={rankingMatches}
            tournaments={tournaments}
            onSelectPlayer={handleSelectPlayerFromAnywhere}
            onSelectTournament={handleSelectTournamentFromAnywhere}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <ClubLogo size="xs" customUrl={clubSettings.logoUrl} />
            <span className="font-semibold text-slate-700">
              {clubSettings.clubName} • Via Palladio, 24 - 36070 Trissino (VI)
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-1.5 text-orange-600 font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>v1.0 • Creata da Alfredo Plumitallo</span>
          </div>
        </div>
      </footer>

      {/* Modals for Quick Actions if needed */}
      <MatchRecorderModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        players={players}
        onSaveMatch={handleSaveRankingMatch}
      />

      <TournamentModal
        isOpen={isTournamentModalOpen}
        onClose={() => setIsTournamentModalOpen(false)}
        players={players}
        onCreateTournament={handleCreateTournament}
      />

      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        correctPin={clubSettings.adminPin || '1234'}
        onSuccess={() => {
          setIsAdmin(true);
          setActiveTab('manager');
        }}
      />

      <ClubSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={clubSettings}
        onSaveSettings={handleSaveClubSettings}
        onAddPlayer={handleAddPlayer}
        onClearDatabase={handleClearAllData}
      />

    </div>
  );
}
