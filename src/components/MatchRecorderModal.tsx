import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Award, AlertCircle, ShieldAlert } from 'lucide-react';
import { Player, PlayerCategory, RankingMatch, SetScore } from '../types/tennis';
import { calculateRankingPoints, recalculateLadderRanks, calculateAge } from '../utils/scoring';
import confetti from 'canvas-confetti';
import { SearchableSelect } from './SearchableSelect';

interface MatchRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSaveMatch: (match: RankingMatch, updatedPlayers: Player[]) => Promise<void>;
}

export const MatchRecorderModal: React.FC<MatchRecorderModalProps> = ({
  isOpen,
  onClose,
  players,
  onSaveMatch
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PlayerCategory>('maschile');

  const categoryPlayers = useMemo(() => {
    return players.filter(p => (p.category || 'maschile') === selectedCategory);
  }, [players, selectedCategory]);

  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');

  // Sincronizza selezione giocatori quando cambia categoria
  useEffect(() => {
    if (categoryPlayers.length >= 2) {
      setPlayer1Id(categoryPlayers[0].id);
      setPlayer2Id(categoryPlayers[1].id);
    } else if (categoryPlayers.length === 1) {
      setPlayer1Id(categoryPlayers[0].id);
      setPlayer2Id('');
    } else {
      setPlayer1Id('');
      setPlayer2Id('');
    }
  }, [categoryPlayers]);
  
  // Set scores
  const [matchType, setMatchType] = useState<'classic' | 'timed'>('classic');
  const [set1P1, setSet1P1] = useState<number>(6);
  const [set1P2, setSet1P2] = useState<number>(4);
  const [set2P1, setSet2P1] = useState<number>(6);
  const [set2P2, setSet2P2] = useState<number>(3);
  const [hasSet3, setHasSet3] = useState<boolean>(false);
  const [set3P1, setSet3P1] = useState<number>(10);
  const [set3P2, setSet3P2] = useState<number>(8);
  const [timedGamesP1, setTimedGamesP1] = useState<number>(12);
  const [timedGamesP2, setTimedGamesP2] = useState<number>(9);

  // Helper per calcolare data-ora locale corrente in formato YYYY-MM-DDTHH:mm
  const getLocalDateTimeString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  };

  const [matchDateStr, setMatchDateStr] = useState<string>(getLocalDateTimeString());

  // Reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setMatchDateStr(getLocalDateTimeString());
      setSet1P1(6);
      setSet1P2(4);
      setSet2P1(6);
      setSet2P2(3);
      setHasSet3(false);
      setSet3P1(10);
      setSet3P2(8);
      setNotes('');
    }
  }, [isOpen]);

  const [court, setCourt] = useState<string>('Campo 1 (Terra Rossa)');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const p1 = players.find(p => p.id === player1Id);
  const p2 = players.find(p => p.id === player2Id);

  // Calcola vincitore in base al tipo di match
  const { winnerId, loserId, formattedScore, setsList } = useMemo(() => {
    const sets: SetScore[] = [];

    if (matchType === 'classic') {
      let p1SetsWon = 0;
      let p2SetsWon = 0;

      // Set 1
      sets.push({ p1: set1P1, p2: set1P2 });
      if (set1P1 > set1P2) p1SetsWon++;
      else if (set1P2 > set1P1) p2SetsWon++;

      // Set 2
      sets.push({ p1: set2P1, p2: set2P2 });
      if (set2P1 > set2P2) p1SetsWon++;
      else if (set2P2 > set2P1) p2SetsWon++;

      // Set 3 (se necessario)
      if (hasSet3) {
        sets.push({ p1: set3P1, p2: set3P2 });
        if (set3P1 > set3P2) p1SetsWon++;
        else if (set3P2 > set3P1) p2SetsWon++;
      }

      let wId: string | null = null;
      let lId: string | null = null;

      if (p1SetsWon > p2SetsWon) {
        wId = player1Id;
        lId = player2Id;
      } else if (p2SetsWon > p1SetsWon) {
        wId = player2Id;
        lId = player1Id;
      }

      const scoreParts = [`${set1P1}-${set1P2}`, `${set2P1}-${set2P2}`];
      if (hasSet3) scoreParts.push(`${set3P1}-${set3P2}`);

      return {
        winnerId: wId,
        loserId: lId,
        formattedScore: scoreParts.join(' '),
        setsList: sets
      };
    } else {
      // Chi vince più giochi in un'ora
      sets.push({ p1: timedGamesP1, p2: timedGamesP2 });

      let wId: string | null = null;
      let lId: string | null = null;

      if (timedGamesP1 > timedGamesP2) {
        wId = player1Id;
        lId = player2Id;
      } else if (timedGamesP2 > timedGamesP1) {
        wId = player2Id;
        lId = player1Id;
      }

      return {
        winnerId: wId,
        loserId: lId,
        formattedScore: `${timedGamesP1}-${timedGamesP2} (1h)`,
        setsList: sets
      };
    }
  }, [matchType, player1Id, player2Id, set1P1, set1P2, set2P1, set2P2, hasSet3, set3P1, set3P2, timedGamesP1, timedGamesP2]);

  // Calcolo punti in anteprima con la formula esatta
  const scoringPreview = useMemo(() => {
    if (!winnerId || !loserId || !p1 || !p2) return null;

    const winner = winnerId === p1.id ? p1 : p2;
    const loser = loserId === p1.id ? p1 : p2;

    const calc = calculateRankingPoints(winner.rank, loser.rank);
    return {
      winner,
      loser,
      ...calc
    };
  }, [winnerId, loserId, p1, p2]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1 || !p2 || !winnerId || !loserId || !scoringPreview) return;
    if (p1.id === p2.id) {
      alert('Seleziona due giocatori differenti.');
      return;
    }

    try {
      setIsSubmitting(true);

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newMatch: RankingMatch = {
        id: matchId,
        category: selectedCategory,
        matchType,
        date: new Date(matchDateStr).toISOString(),
        player1Id: p1.id,
        player1Name: p1.partnerName ? `${p1.name} / ${p1.partnerName}` : p1.name,
        player1RankAtMatch: p1.rank,
        player2Id: p2.id,
        player2Name: p2.partnerName ? `${p2.name} / ${p2.partnerName}` : p2.name,
        player2RankAtMatch: p2.rank,
        winnerId,
        loserId,
        score: formattedScore,
        sets: setsList,
        pointsAwardedWinner: scoringPreview.winnerPointsEarned,
        pointsDeductedLoser: scoringPreview.loserPointsLost,
        ruleApplied: scoringPreview.ruleDescription,
        court,
        notes,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      // Aggiorna statistiche e punti dei due giocatori
      const updatedPlayersList = players.map(player => {
        if (player.id === winnerId) {
          const setsWonInMatch = setsList.filter(s => (winnerId === p1.id ? s.p1 > s.p2 : s.p2 > s.p1)).length;
          const setsLostInMatch = setsList.filter(s => (winnerId === p1.id ? s.p2 > s.p1 : s.p1 > s.p2)).length;
          const gamesWonInMatch = setsList.reduce((acc, s) => acc + (winnerId === p1.id ? s.p1 : s.p2), 0);
          const gamesLostInMatch = setsList.reduce((acc, s) => acc + (winnerId === p1.id ? s.p2 : s.p1), 0);

          return {
            ...player,
            points: player.points + scoringPreview.winnerPointsEarned,
            matchesPlayed: player.matchesPlayed + 1,
            matchesWon: player.matchesWon + 1,
            setsWon: player.setsWon + setsWonInMatch,
            setsLost: player.setsLost + setsLostInMatch,
            gamesWon: player.gamesWon + gamesWonInMatch,
            gamesLost: player.gamesLost + gamesLostInMatch,
            currentStreak: player.currentStreak > 0 ? player.currentStreak + 1 : 1,
            bestStreak: Math.max(player.bestStreak, (player.currentStreak > 0 ? player.currentStreak + 1 : 1))
          };
        } else if (player.id === loserId) {
          const setsWonInMatch = setsList.filter(s => (loserId === p1.id ? s.p1 > s.p2 : s.p2 > s.p1)).length;
          const setsLostInMatch = setsList.filter(s => (loserId === p1.id ? s.p2 > s.p1 : s.p1 > s.p2)).length;
          const gamesWonInMatch = setsList.reduce((acc, s) => acc + (loserId === p1.id ? s.p1 : s.p2), 0);
          const gamesLostInMatch = setsList.reduce((acc, s) => acc + (loserId === p1.id ? s.p2 : s.p1), 0);

          return {
            ...player,
            points: Math.max(0, player.points - scoringPreview.loserPointsLost),
            matchesPlayed: player.matchesPlayed + 1,
            matchesLost: player.matchesLost + 1,
            setsWon: player.setsWon + setsWonInMatch,
            setsLost: player.setsLost + setsLostInMatch,
            gamesWon: player.gamesWon + gamesWonInMatch,
            gamesLost: player.gamesLost + gamesLostInMatch,
            currentStreak: player.currentStreak < 0 ? player.currentStreak - 1 : -1
          };
        }
        return player;
      });

      // Ricalcola i rank di tutti i giocatori in base ai nuovi punti
      const reRankedPlayers = recalculateLadderRanks(updatedPlayersList);

      await onSaveMatch(newMatch, reRankedPlayers);

      // Coriandoli celebrazione
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      onClose();
    } catch (err) {
      console.error('Errore durante salvataggio sfida:', err);
      alert('Si è verificato un errore durante il salvataggio. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              🎾
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                Registra Partita di Classifica Mobile
              </h2>
              <p className="text-xs text-slate-400">
                Calcolo automatico punti e riordino classifica in tempo reale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Selezione Categoria Sfida */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Categoria della Sfida
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('maschile')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategory === 'maschile'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Singolare Maschile
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('femminile')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategory === 'femminile'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Singolare Femminile
              </button>
            </div>
          </div>

          {/* Selezione Giocatori */}
          {categoryPlayers.length < 2 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-center">
              Per questa categoria sono registrati meno di 2 atleti/coppie. Aggiungi almeno 2 partecipanti per registrare una partita.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Giocatore 1 */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    {selectedCategory === 'doppio' ? 'Coppia 1' : 'Giocatore 1'}
                  </label>
                  <SearchableSelect
                    options={categoryPlayers.map(p => {
                      const age = calculateAge(p.birthDate);
                      const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                      return {
                        value: p.id,
                        label: `#${p.rank} ${p.name}${p.partnerName ? ` / ${p.partnerName}` : ''} ${age !== null ? `(${age}a, ${genderBadge})` : `(${genderBadge})`} (${p.points} pt)`
                      };
                    })}
                    value={player1Id}
                    onChange={setPlayer1Id}
                    placeholder="Seleziona giocatore 1..."
                    searchPlaceholder="Cerca atleta..."
                    className="w-full"
                  />
                  {p1 && (
                    <div className="text-xs text-slate-400 flex items-center justify-between px-1 mt-1">
                      <span>Posizione #{p1.rank} {calculateAge(p1.birthDate) ? `• ${calculateAge(p1.birthDate)} anni` : ''}</span>
                      <span className="text-emerald-400 font-semibold">{p1.points} pt</span>
                    </div>
                  )}
                </div>

                {/* Giocatore 2 */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    {selectedCategory === 'doppio' ? 'Coppia 2' : 'Giocatore 2'}
                  </label>
                  <SearchableSelect
                    options={categoryPlayers.map(p => {
                      const age = calculateAge(p.birthDate);
                      const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                      return {
                        value: p.id,
                        label: `#${p.rank} ${p.name}${p.partnerName ? ` / ${p.partnerName}` : ''} ${age !== null ? `(${age}a, ${genderBadge})` : `(${genderBadge})`} (${p.points} pt)`
                      };
                    })}
                    value={player2Id}
                    onChange={setPlayer2Id}
                    placeholder="Seleziona giocatore 2..."
                    searchPlaceholder="Cerca atleta..."
                    className="w-full"
                  />
                  {p2 && (
                    <div className="text-xs text-slate-400 flex items-center justify-between px-1 mt-1">
                      <span>Posizione #{p2.rank} {calculateAge(p2.birthDate) ? `• ${calculateAge(p2.birthDate)} anni` : ''}</span>
                      <span className="text-emerald-400 font-semibold">{p2.points} pt</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Confronto Età */}
              {p1 && p2 && p1.id !== p2.id && calculateAge(p1.birthDate) !== null && calculateAge(p2.birthDate) !== null && (
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Confronto Età Contendenti:</span>
                  <span className="font-bold text-white">
                    {calculateAge(p1.birthDate) === calculateAge(p2.birthDate) ? (
                      <span className="text-emerald-400">Coetanei ({calculateAge(p1.birthDate)} anni)</span>
                    ) : calculateAge(p1.birthDate)! > calculateAge(p2.birthDate)! ? (
                      <span>{p1.name} ha <strong className="text-amber-400">+{calculateAge(p1.birthDate)! - calculateAge(p2.birthDate)!} anni</strong> di differenza</span>
                    ) : (
                      <span>{p2.name} ha <strong className="text-amber-400">+{calculateAge(p2.birthDate)! - calculateAge(p1.birthDate)!} anni</strong> di differenza</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tipo di Partita */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Formato Partita
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMatchType('classic')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  matchType === 'classic'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>🎾</span>
                <span>Partita Classica (2 Set + TB)</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchType('timed')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  matchType === 'timed'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>⏱️</span>
                <span>Più giochi in un'ora</span>
              </button>
            </div>
          </div>

          {/* Timed Match Input */}
          {matchType === 'timed' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block text-center">
                Totale Giochi vinti in 1 Ora (60 min)
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px]" title={p1 ? p1.name : 'Giocatore 1'}>
                  {p1 ? p1.name.split(' ')[0] : 'Giocatore 1'}
                </span>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={timedGamesP1}
                    onChange={(e) => setTimedGamesP1(parseInt(e.target.value) || 0)}
                    className="w-16 text-center py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-lg"
                  />
                  <span className="text-slate-500 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={timedGamesP2}
                    onChange={(e) => setTimedGamesP2(parseInt(e.target.value) || 0)}
                    className="w-16 text-center py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-lg"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px] text-right" title={p2 ? p2.name : 'Giocatore 2'}>
                  {p2 ? p2.name.split(' ')[0] : 'Giocatore 2'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic text-center pt-1">
                ⏱️ Vince l'atleta che si è aggiudicato più giochi allo scadere dei 60 minuti.
              </p>
            </div>
          )}

          {/* Inserimento Punteggio Set (Classico) */}
          {matchType === 'classic' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Punteggio Incontro (Game per Set)
              </span>

            {/* Set 1 */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-400 w-16">1° Set</span>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={set1P1}
                  onChange={(e) => setSet1P1(parseInt(e.target.value) || 0)}
                  className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
                <span className="text-slate-500 font-bold">-</span>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={set1P2}
                  onChange={(e) => setSet1P2(parseInt(e.target.value) || 0)}
                  className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>
            </div>

            {/* Set 2 */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-400 w-16">2° Set</span>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={set2P1}
                  onChange={(e) => setSet2P1(parseInt(e.target.value) || 0)}
                  className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
                <span className="text-slate-500 font-bold">-</span>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={set2P2}
                  onChange={(e) => setSet2P2(parseInt(e.target.value) || 0)}
                  className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>
            </div>

            {/* Set 3 Toggle */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSet3}
                  onChange={(e) => setHasSet3(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                Incontro andato al 3° Set / Super Tie-break
              </label>
            </div>

            {/* Set 3 */}
            {hasSet3 && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs font-semibold text-slate-400 w-16">3° Set / TB</span>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={set3P1}
                    onChange={(e) => setSet3P1(parseInt(e.target.value) || 0)}
                    className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                  />
                  <span className="text-slate-500 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={set3P2}
                    onChange={(e) => setSet3P2(parseInt(e.target.value) || 0)}
                    className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Anteprima Calcolo Regolamentare dei Punti */}
          {scoringPreview && (
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Calcolo Punti Ufficiale
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Risultato: {formattedScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                {/* Vincitore */}
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-emerald-500/30">
                  <span className="text-slate-400 block mb-0.5">Vincitore ({scoringPreview.winner.name})</span>
                  <div className="text-emerald-400 font-extrabold text-lg">
                    +{scoringPreview.winnerPointsEarned} PUNTI
                  </div>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    Nuovo tot: {scoringPreview.winner.points + scoringPreview.winnerPointsEarned} pt
                  </span>
                </div>

                {/* Sconfitto */}
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-rose-500/30">
                  <span className="text-slate-400 block mb-0.5">Sconfitto ({scoringPreview.loser.name})</span>
                  <div className="text-rose-400 font-extrabold text-lg">
                    -{scoringPreview.loserPointsLost} PUNTI
                  </div>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    Nuovo tot: {Math.max(0, scoringPreview.loser.points - scoringPreview.loserPointsLost)} pt
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-300/90 italic pt-1">
                ℹ️ {scoringPreview.ruleDescription}
              </p>
            </div>
          )}

          {/* Campo & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Data e Ora Incontro</label>
              <input
                type="datetime-local"
                value={matchDateStr}
                onChange={(e) => setMatchDateStr(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Campo da gioco</label>
              <select
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
              >
                <option value="Campo 1 (Terra Rossa)">Campo 1 (Terra Rossa)</option>
                <option value="Campo 2 (Terra Rossa)">Campo 2 (Terra Rossa)</option>
                <option value="Campo 3 (Sintetico)">Campo 3 (Sintetico)</option>
                <option value="Campo 4 (Erba Sintetica)">Campo 4 (Erba Sintetica)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Note incontro (opzionale)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="es. Match point annullato..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !scoringPreview}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Salvataggio in corso...' : 'Salva e Aggiorna Classifica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
