import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Trophy, 
  Swords, 
  Share2, 
  Download, 
  Mail, 
  MessageCircle, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
  Award,
  X
} from 'lucide-react';
import { Tournament, TournamentMatch, TournamentParticipant, RoundRobinStanding } from '../types/tennis';
import { calculateRoundRobinStandings } from '../utils/tournamentGenerator';
import { 
  exportTournamentToPDF, 
  shareTournamentViaWhatsApp, 
  shareTournamentViaEmail 
} from '../utils/pdfExport';
import confetti from 'canvas-confetti';

interface TournamentViewProps {
  tournaments: Tournament[];
  matches: TournamentMatch[];
  selectedTournamentId: string | null;
  onSelectTournament: (id: string) => void;
  onOpenNewTournamentModal: () => void;
  isAdmin: boolean;
  clubName: string;
  onUpdateMatchScore: (
    matchId: string, 
    score: string, 
    winnerId: string, 
    winnerName: string,
    nextMatchId?: string | null,
    nextMatchSlot?: 'p1' | 'p2' | null
  ) => Promise<void>;
  onUpdateTournament?: (tournament: Tournament) => Promise<void>;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  tournaments,
  matches,
  selectedTournamentId,
  onSelectTournament,
  onOpenNewTournamentModal,
  isAdmin,
  clubName,
  onUpdateMatchScore,
  onUpdateTournament
}) => {
  const currentTournament = tournaments.find(t => t.id === selectedTournamentId) || tournaments[0];
  const tournamentMatches = useMemo(() => {
    if (!currentTournament) return [];
    return matches.filter(m => m.tournamentId === currentTournament.id);
  }, [matches, currentTournament]);

  // Seleziona un match da aggiornare nel modal
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('6-3 6-4');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Stati per il punteggio dei set nel pop-up (come MatchRecorderModal)
  const [set1P1, setSet1P1] = useState<number>(6);
  const [set1P2, setSet1P2] = useState<number>(4);
  const [set2P1, setSet2P1] = useState<number>(6);
  const [set2P2, setSet2P2] = useState<number>(3);
  const [hasSet3, setHasSet3] = useState<boolean>(false);
  const [set3P1, setSet3P1] = useState<number>(10);
  const [set3P2, setSet3P2] = useState<number>(8);

  // Sincronizza vincitore e punteggio formattato quando cambiano i set
  useEffect(() => {
    if (!editingMatch) return;
    
    let p1SetsWon = 0;
    let p2SetsWon = 0;

    if (set1P1 > set1P2) p1SetsWon++;
    else if (set1P2 > set1P1) p2SetsWon++;

    if (set2P1 > set2P2) p1SetsWon++;
    else if (set2P2 > set2P1) p2SetsWon++;

    if (hasSet3) {
      if (set3P1 > set3P2) p1SetsWon++;
      else if (set3P2 > set3P1) p2SetsWon++;
    }

    if (p1SetsWon > p2SetsWon) {
      setSelectedWinnerId(editingMatch.player1Id || '');
    } else if (p2SetsWon > p1SetsWon) {
      setSelectedWinnerId(editingMatch.player2Id || '');
    }

    const scoreParts = [`${set1P1}-${set1P2}`, `${set2P1}-${set2P2}`];
    if (hasSet3) {
      scoreParts.push(`${set3P1}-${set3P2}`);
    }
    setScoreInput(scoreParts.join(' '));
  }, [set1P1, set1P2, set2P1, set2P2, hasSet3, set3P1, set3P2, editingMatch]);

  const [editingDeadlineRound, setEditingDeadlineRound] = useState<string | null>(null);
  const [deadlineDateInput, setDeadlineDateInput] = useState<string>('');

  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const [bracketPaths, setBracketPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!bracketContainerRef.current || currentTournament?.type !== 'elimination') return;
    const container = bracketContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const paths: string[] = [];

    tournamentMatches.forEach(m => {
      if (m.nextMatchId) {
        const elFrom = container.querySelector(`[data-match-id="${m.id}"]`);
        const elTo = container.querySelector(`[data-match-id="${m.nextMatchId}"]`);
        if (elFrom && elTo) {
          const rectFrom = elFrom.getBoundingClientRect();
          const rectTo = elTo.getBoundingClientRect();

          const x1 = rectFrom.right - containerRect.left;
          const y1 = rectFrom.top + rectFrom.height / 2 - containerRect.top;
          const x2 = rectTo.left - containerRect.left;
          const y2 = rectTo.top + rectTo.height / 2 - containerRect.top;

          const midX = x1 + (x2 - x1) / 2;
          paths.push(`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
        }
      }
    });

    setBracketPaths(paths);
  }, [tournamentMatches, currentTournament]);

  const handleSaveRoundDeadline = async (roundName: string) => {
    if (!currentTournament || !onUpdateTournament) return;
    try {
      const updatedDeadlines = {
        ...(currentTournament.roundDeadlines || {}),
        [roundName]: deadlineDateInput
      };
      await onUpdateTournament({
        ...currentTournament,
        roundDeadlines: updatedDeadlines
      });
      setEditingDeadlineRound(null);
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio della data limite.');
    }
  };

  // Calcola classifica Round Robin se applicabile
  const roundRobinStandings: RoundRobinStanding[] = useMemo(() => {
    if (!currentTournament || currentTournament.type !== 'round_robin') return [];
    return calculateRoundRobinStandings(currentTournament.participants, tournamentMatches);
  }, [currentTournament, tournamentMatches]);

  // Raggruppa i match ad eliminazione diretta per Round
  const eliminationRounds = useMemo(() => {
    if (!currentTournament || currentTournament.type !== 'elimination') return [];
    const map = new Map<number, { roundNumber: number; roundName: string; matches: TournamentMatch[] }>();
    
    tournamentMatches.forEach(m => {
      if (!map.has(m.round)) {
        map.set(m.round, {
          roundNumber: m.round,
          roundName: m.roundName,
          matches: []
        });
      }
      map.get(m.round)!.matches.push(m);
    });

    return Array.from(map.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  }, [currentTournament, tournamentMatches]);

  // Raggruppa i match Round Robin per Giornata
  const roundRobinRounds = useMemo(() => {
    if (!currentTournament || currentTournament.type !== 'round_robin') return [];
    const map = new Map<string, TournamentMatch[]>();
    
    tournamentMatches.forEach(m => {
      const key = m.roundName || `Giornata ${m.round}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(m);
    });

    return Array.from(map.entries()).map(([roundName, matchList]) => ({
      roundName,
      matches: matchList
    }));
  }, [currentTournament, tournamentMatches]);

  if (!currentTournament) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-sm shadow-slate-100/50">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/40 text-orange-500 flex items-center justify-center text-3xl mx-auto shadow-sm">
          🏆
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
            Nessun torneo sociale attivo
          </h2>
          <p className="text-sm text-slate-600">
            {isAdmin 
              ? 'Accedi al pannello per creare il primo torneo ad eliminazione diretta o girone round-robin con i tuoi iscritti.'
              : 'I tabelloni ufficiali dei tornei sociali e i calendari di gara verranno pubblicati dalla segreteria del circolo.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onOpenNewTournamentModal}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            Crea Torneo Sociale
          </button>
        )}
      </div>
    );
  }

  const handleOpenEdit = (match: TournamentMatch) => {
    if (!isAdmin) return;
    if (match.status === 'bye') return;
    if (!match.player1Id || !match.player2Id) return;

    let s1_1 = 6, s1_2 = 4;
    let s2_1 = 6, s2_2 = 3;
    let s3_1 = 10, s3_2 = 8;
    let has3 = false;

    if (match.score) {
      const parts = match.score.trim().split(/\s+/);
      if (parts[0]) {
        const s1 = parts[0].split('-');
        if (s1[0] && s1[1]) {
          s1_1 = parseInt(s1[0]) || 0;
          s1_2 = parseInt(s1[1]) || 0;
        }
      }
      if (parts[1]) {
        const s2 = parts[1].split('-');
        if (s2[0] && s2[1]) {
          s2_1 = parseInt(s2[0]) || 0;
          s2_2 = parseInt(s2[1]) || 0;
        }
      }
      if (parts[2]) {
        const s3 = parts[2].split('-');
        if (s3[0] && s3[1]) {
          s3_1 = parseInt(s3[0]) || 0;
          s3_2 = parseInt(s3[1]) || 0;
          has3 = true;
        }
      }
    }

    setSet1P1(s1_1);
    setSet1P2(s1_2);
    setSet2P1(s2_1);
    setSet2P2(s2_2);
    setHasSet3(has3);
    setSet3P1(s3_1);
    setSet3P2(s3_2);

    setEditingMatch(match);
    setScoreInput(match.score || '6-4 6-3');
    setSelectedWinnerId(match.winnerId || match.player1Id || '');
  };

  const handleSaveMatchScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch || !selectedWinnerId) return;

    try {
      setIsUpdating(true);
      const winnerName = selectedWinnerId === editingMatch.player1Id ? editingMatch.player1Name : editingMatch.player2Name;

      await onUpdateMatchScore(
        editingMatch.id,
        scoreInput,
        selectedWinnerId,
        winnerName,
        editingMatch.nextMatchId,
        editingMatch.nextMatchSlot
      );

      // Effetto coriandoli se era la finale
      if (editingMatch.roundName.toLowerCase().includes('finale') && !editingMatch.roundName.toLowerCase().includes('semi')) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      setEditingMatch(null);
    } catch (err) {
      console.error('Errore aggiornamento score:', err);
      alert('Errore durante l\'aggiornamento del risultato.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Selector & Actions Bar */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100/50 to-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm shadow-slate-100/80 space-y-4">
        
        {/* Selector & Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
              <span className="text-blue-600 font-bold">
                {currentTournament.type === 'round_robin' ? 'Girone all\'Italiana' : 'Eliminazione Diretta'}
              </span>
              <span>·</span>
              <span className="capitalize">{currentTournament.category}</span>
              <span>·</span>
              <span className="capitalize">{currentTournament.surface}</span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <select
                value={currentTournament.id}
                onChange={(e) => onSelectTournament(e.target.value)}
                className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-orange-500 max-w-full cursor-pointer shadow-sm"
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            
            <p className="text-xs text-slate-500 flex items-center gap-2 pt-0.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTournament.startDate} - {currentTournament.endDate}</span>
              <span>•</span>
              <span>{currentTournament.participants.length} iscritti</span>
            </p>
          </div>

          {/* Action Buttons: PDF, WhatsApp, Print, Email */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Esporta PDF */}
            <button
              onClick={() => exportTournamentToPDF(currentTournament, tournamentMatches, clubName, roundRobinStandings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
              title="Scarica tabellone in formato PDF per la bacheca del circolo"
            >
              <Download className="w-4 h-4 text-orange-500" />
              <span>Esporta PDF</span>
            </button>

            {/* Condividi su WhatsApp */}
            <button
              onClick={() => shareTournamentViaWhatsApp(currentTournament, tournamentMatches, clubName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
              title="Condividi tabellone aggiornato su WhatsApp con i giocatori"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {/* Condividi via Email */}
            <button
              onClick={() => shareTournamentViaEmail(currentTournament, tournamentMatches, clubName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Invia aggiornamento via email ai soci"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Email</span>
            </button>

            {/* Nuovo Torneo (Admin) */}
            {isAdmin && (
              <button
                onClick={onOpenNewTournamentModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all ml-1 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Nuovo Torneo</span>
              </button>
            )}
          </div>
        </div>

        {/* Winner Banner if Tournament is Complete */}
        {currentTournament.winnerName && (
          <div className="bg-gradient-to-r from-amber-50 to-transparent border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/20">
                👑
              </div>
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  Vincitore Ufficiale Torneo
                </span>
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  {currentTournament.winnerName}
                </h3>
              </div>
            </div>
            <Award className="w-8 h-8 text-amber-500 shrink-0" />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: TABELLONE AD ELIMINAZIONE DIRETTA               */}
      {/* ======================================================== */}
      {currentTournament.type === 'elimination' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-extrabold text-lg text-slate-900">
                Tabellone Incontri ad Eliminazione Diretta
              </h2>
              {isAdmin && (
                <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  💡 Clicca su una partita per registrare il risultato
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Avanzamento automatico al turno successivo
            </span>
          </div>

          {/* Griglia a Colonne (Bracket View con linee di dipendenza gerarchica) */}
          <div className="overflow-x-auto pb-4">
            <div ref={bracketContainerRef} className="flex items-stretch gap-6 min-w-[760px] py-2 relative">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {bracketPaths.map((d, i) => (
                  <path key={i} d={d} stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.8" />
                ))}
              </svg>
              {eliminationRounds.map((col, colIdx) => (
                <div key={col.roundNumber} className="flex-1 flex flex-col relative z-10">
                  {/* Round Header */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 text-center space-y-1 shadow-sm">
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-orange-600 block">
                      {col.roundName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {col.matches.length} {col.matches.length === 1 ? 'partita' : 'partite'}
                    </span>
                    {currentTournament.roundDeadlines?.[col.roundName] ? (
                      <span className="text-[11px] text-amber-800 font-bold block">
                        📅 Entro il {new Date(currentTournament.roundDeadlines[col.roundName]).toLocaleDateString('it-IT')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block">Nessuna scadenza turno</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingDeadlineRound(col.roundName);
                          setDeadlineDateInput(currentTournament.roundDeadlines?.[col.roundName] || '');
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer pt-0.5 block mx-auto"
                      >
                        {currentTournament.roundDeadlines?.[col.roundName] ? 'Modifica scadenza' : '+ Imposta scadenza'}
                      </button>
                    )}
                  </div>

                  {/* Matches Column */}
                  <div className="flex flex-col justify-around flex-1 gap-4">
                    {col.matches.map((m) => {
                      const isClickable = isAdmin && m.status !== 'bye' && m.player1Id && m.player2Id;
                      const isCompleted = m.status === 'completed';
                      const isP1Winner = isCompleted && m.winnerId === m.player1Id;
                      const isP2Winner = isCompleted && m.winnerId === m.player2Id;

                      return (
                        <div
                          key={m.id}
                          data-match-id={m.id}
                          onClick={() => isClickable && handleOpenEdit(m)}
                          className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm relative z-10 ${
                            isCompleted
                              ? 'border-slate-200 hover:border-slate-300'
                              : m.status === 'bye'
                              ? 'border-slate-200/60 opacity-60'
                              : 'border-slate-200 hover:border-orange-400'
                          } ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                        >
                          {/* Match Header Tag */}
                          <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>Partita #{m.matchNumber}</span>
                            {isCompleted ? (
                              <span className="text-orange-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Concluso
                              </span>
                            ) : m.status === 'bye' ? (
                              <span className="text-slate-400 font-medium">BYE (Avanza)</span>
                            ) : (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Da giocare
                              </span>
                            )}
                          </div>

                          {/* Player 1 Slot */}
                          <div className={`px-3 py-2 flex items-center justify-between border-b border-slate-100 ${
                            isP1Winner ? 'bg-blue-50/30' : ''
                          }`}>
                            <div className="flex items-center gap-2 truncate">
                              {m.player1Seed && (
                                <span className="w-4 h-4 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                  {m.player1Seed}
                                </span>
                              )}
                              <span className={`text-xs font-semibold truncate ${
                                isP1Winner ? 'text-blue-600 font-bold' : m.player1Id ? 'text-slate-900' : 'text-slate-400 italic'
                              }`}>
                                {m.player1Name}
                              </span>
                            </div>
                            {isP1Winner && (
                              <span className="text-orange-500 font-bold text-xs ml-2">✓</span>
                            )}
                          </div>

                          {/* Player 2 Slot */}
                          <div className={`px-3 py-2 flex items-center justify-between ${
                            isP2Winner ? 'bg-blue-50/30' : ''
                          }`}>
                            <div className="flex items-center gap-2 truncate">
                              {m.player2Seed && (
                                <span className="w-4 h-4 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                  {m.player2Seed}
                                </span>
                              )}
                              <span className={`text-xs font-semibold truncate ${
                                isP2Winner ? 'text-blue-600 font-bold' : m.player2Id ? 'text-slate-900' : 'text-slate-400 italic'
                              }`}>
                                {m.player2Name}
                              </span>
                            </div>
                            {isP2Winner && (
                              <span className="text-orange-500 font-bold text-xs ml-2">✓</span>
                            )}
                          </div>

                          {/* Risultato / Score Badge */}
                          {m.score && (
                            <div className="px-3 py-1 bg-slate-50 text-center text-xs font-bold text-orange-600 border-t border-slate-100 tracking-wide">
                              {m.score}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: ROUND ROBIN (GIRONE ALL'ITALIANA)               */}
      {/* ======================================================== */}
      {currentTournament.type === 'round_robin' && (
        <div className="space-y-6">
          
          {/* Classifica Girone */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Classifica Ufficiale Girone Round Robin
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Formula: 2 pt a vittoria • Differenza Set • Differenza Game
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-center w-14">Pos.</th>
                    <th scope="col" className="px-4 py-3">Giocatore</th>
                    <th scope="col" className="px-3 py-3 text-center">Partite</th>
                    <th scope="col" className="px-3 py-3 text-center">Vinte</th>
                    <th scope="col" className="px-3 py-3 text-center">Perse</th>
                    <th scope="col" className="px-3 py-3 text-center">Set V-P</th>
                    <th scope="col" className="px-3 py-3 text-center">Diff. Game</th>
                    <th scope="col" className="px-4 py-3 text-right font-black text-orange-600">Punti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roundRobinStandings.map((s, idx) => (
                    <tr key={s.player.playerId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center font-display font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-500">1°</span>
                        ) : idx === 1 ? (
                          <span className="text-slate-400">2°</span>
                        ) : (
                          <span className="text-slate-500">{idx + 1}°</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {s.player.name}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 font-medium">{s.played}</td>
                      <td className="px-3 py-3 text-center text-blue-600 font-bold">{s.won}</td>
                      <td className="px-3 py-3 text-center text-rose-500 font-semibold">{s.lost}</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-600 font-semibold">
                        {s.setsWon} - {s.setsLost}
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-bold">
                        <span className={s.gamesWon - s.gamesLost >= 0 ? 'text-blue-600' : 'text-rose-600'}>
                          {s.gamesWon - s.gamesLost > 0 ? `+${s.gamesWon - s.gamesLost}` : s.gamesWon - s.gamesLost}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-display font-black text-base text-orange-600">
                        {s.points} pt
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calendario e Risultati Giornate */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display font-extrabold text-lg text-slate-900">
                Calendario Incontri & Risultati
              </h3>
              {isAdmin && (
                <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  💡 Clicca su una partita per registrare o modificare il punteggio
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roundRobinRounds.map((roundGroup) => (
                <div key={roundGroup.roundName} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shadow-slate-100/50 space-y-3">
                  <div className="border-b border-slate-100 pb-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-orange-600">
                        {roundGroup.roundName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {roundGroup.matches.filter(m => m.status === 'completed').length}/{roundGroup.matches.length} finiti
                      </span>
                    </div>
                    {currentTournament.roundDeadlines?.[roundGroup.roundName] ? (
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-amber-800 font-bold">
                          📅 Entro il {new Date(currentTournament.roundDeadlines[roundGroup.roundName]).toLocaleDateString('it-IT')}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingDeadlineRound(roundGroup.roundName);
                              setDeadlineDateInput(currentTournament.roundDeadlines?.[roundGroup.roundName] || '');
                            }}
                            className="text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer shrink-0"
                          >
                            Modifica
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="text-right">
                        <button
                          onClick={() => {
                            setEditingDeadlineRound(roundGroup.roundName);
                            setDeadlineDateInput('');
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer"
                        >
                          + Imposta data limite giornata
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    {roundGroup.matches.map((m) => {
                      const isCompleted = m.status === 'completed';
                      const isClickable = isAdmin;

                      return (
                        <div
                          key={m.id}
                          onClick={() => isClickable && handleOpenEdit(m)}
                          className={`p-3 rounded-xl border transition-all ${
                            isCompleted
                              ? 'bg-slate-50 border-slate-100'
                              : 'bg-white border-slate-200 hover:border-orange-400 shadow-sm'
                          } ${isClickable ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={`font-semibold ${m.winnerId === m.player1Id ? 'text-orange-600 font-bold' : 'text-slate-800'}`}>
                              {m.player1Name}
                            </span>
                            <span className="text-slate-400 font-bold">vs</span>
                            <span className={`font-semibold ${m.winnerId === m.player2Id ? 'text-orange-600 font-bold' : 'text-slate-800'}`}>
                              {m.player2Name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                            {isCompleted ? (
                              <>
                                <span className="text-orange-600 font-extrabold text-sm">{m.score}</span>
                                <span className="text-slate-500 font-medium text-[11px]">
                                  Vince: {m.winnerId === m.player1Id ? m.player1Name : m.player2Name}
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-600 font-semibold text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Da disputare
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL AGGIORNAMENTO RISULTATO PARTITA TORNEO            */}
      {/* ======================================================== */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-display font-bold text-base text-slate-900">
                Aggiorna Risultato: {editingMatch.roundName}
              </h3>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatchScore} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="text-sm font-bold text-slate-800">
                  {editingMatch.player1Name} <span className="text-slate-400 font-normal">vs</span> {editingMatch.player2Name}
                </div>
              </div>

              {/* Seleziona Vincitore */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Vincitore Incontro
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWinnerId(editingMatch.player1Id || '')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      selectedWinnerId === editingMatch.player1Id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {editingMatch.player1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedWinnerId(editingMatch.player2Id || '')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      selectedWinnerId === editingMatch.player2Id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {editingMatch.player2Name}
                  </button>
                </div>
              </div>

              {/* Inserimento Punteggio Set */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Punteggio Incontro (Game per Set)
                </span>

                {/* Set 1 */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-16">1° Set</span>
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={set1P1}
                      onChange={(e) => setSet1P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={set1P2}
                      onChange={(e) => setSet1P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Set 2 */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-16">2° Set</span>
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={set2P1}
                      onChange={(e) => setSet2P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={set2P2}
                      onChange={(e) => setSet2P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Set 3 Toggle */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSet3}
                      onChange={(e) => setHasSet3(e.target.checked)}
                      className="rounded text-orange-500 focus:ring-orange-500 bg-white border-slate-300"
                    />
                    Incontro andato al 3° Set / Super Tie-break
                  </label>
                </div>

                {/* Set 3 */}
                {hasSet3 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs font-semibold text-slate-600 w-16">3° Set / TB</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={set3P1}
                        onChange={(e) => setSet3P1(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={set3P2}
                        onChange={(e) => setSet3P2(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Risultato Finale Formattato */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Risultato Formattato (Generato Automaticamente)
                </span>
                <div className="px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-center font-display font-extrabold text-base text-orange-600">
                  {scoreInput}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !selectedWinnerId}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Salvataggio...' : 'Conferma e Salva Risultato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifica Scadenza Turno / Giornata */}
      {editingDeadlineRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              Data Limite: {editingDeadlineRound}
            </h3>
            <p className="text-xs text-slate-500">
              Imposta la data massima entro cui disputare le partite di questo turno o giornata. Oltre tale data, i giocatori senza accordo rischiano la perdita a tavolino.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Data Limite</label>
              <input
                type="date"
                value={deadlineDateInput}
                onChange={(e) => setDeadlineDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDeadlineRound(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => handleSaveRoundDeadline(editingDeadlineRound)}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Salva Data Limite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
