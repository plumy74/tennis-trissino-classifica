import React, { useState, useMemo } from 'react';
import { 
  User, 
  Trophy, 
  TrendingUp, 
  Flame, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Swords, 
  Search, 
  Award, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Sparkles
} from 'lucide-react';
import { Player, RankingMatch, TournamentMatch, Tournament } from '../types/tennis';
import { calculateAge, formatBirthDate } from '../utils/scoring';
import { SearchableSelect } from './SearchableSelect';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PlayerDashboardProps {
  players: Player[];
  rankingMatches: RankingMatch[];
  tournamentMatches: TournamentMatch[];
  tournaments: Tournament[];
  selectedPlayerId: string;
  onSelectPlayer: (id: string) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  players,
  rankingMatches,
  tournamentMatches,
  tournaments,
  selectedPlayerId,
  onSelectPlayer
}) => {
  const [h2hOpponentId, setH2hOpponentId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Calcola dinamicamente gli anni disponibili dai match reali, escludendo 2024 e 2025
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    rankingMatches.forEach(m => {
      if (m.date) {
        const y = m.date.slice(0, 4);
        if (y && !isNaN(Number(y)) && y !== '2024' && y !== '2025') {
          years.add(y);
        }
      }
    });
    years.add('2026');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [rankingMatches]);

  const currentPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

  // Filtra tutte le partite del giocatore (sfide classifica + tornei)
  const playerMatchesHistory = useMemo(() => {
    if (!currentPlayer) return [];

    const history: Array<{
      id: string;
      date: string;
      type: 'ranking' | 'tournament';
      title: string;
      opponentName: string;
      opponentId: string;
      score: string;
      isWinner: boolean;
      pointsDelta?: number;
      ruleApplied?: string;
      court?: string;
      isP1: boolean;
    }> = [];

    // Sfide classifica
    rankingMatches.forEach(m => {
      if (m.player1Id === currentPlayer.id || m.player2Id === currentPlayer.id) {
        const isP1 = m.player1Id === currentPlayer.id;
        const opponentName = isP1 ? m.player2Name : m.player1Name;
        const opponentId = isP1 ? m.player2Id : m.player1Id;
        const isWinner = m.winnerId === currentPlayer.id;
        const pointsDelta = isWinner ? m.pointsAwardedWinner : -m.pointsDeductedLoser;

        history.push({
          id: m.id,
          date: m.date,
          type: 'ranking',
          title: 'Sfida Classifica Mobile',
          opponentName,
          opponentId,
          score: m.score,
          isWinner,
          pointsDelta,
          ruleApplied: m.ruleApplied,
          court: m.court,
          isP1
        });
      }
    });

    // Partite tornei
    tournamentMatches.forEach(m => {
      if (m.status === 'bye') {
        return;
      }
      if (m.status === 'completed' && (m.player1Id === currentPlayer.id || m.player2Id === currentPlayer.id)) {
        const isP1 = m.player1Id === currentPlayer.id;
        const opponentName = isP1 ? m.player2Name : m.player1Name;

        // Skip matches against BYEs or unassigned / Da definire opponents
        if (
          !opponentName || 
          opponentName.toLowerCase().includes('bye') || 
          opponentName.toLowerCase().includes('da definire')
        ) {
          return;
        }

        const opponentId = isP1 ? (m.player2Id || '') : (m.player1Id || '');
        const isWinner = m.winnerId === currentPlayer.id;
        const tourn = tournaments.find(t => t.id === m.tournamentId);

        history.push({
          id: m.id,
          date: m.updatedAt,
          type: 'tournament',
          title: `${tourn?.name || 'Torneo Sociale'} - ${m.roundName}`,
          opponentName,
          opponentId,
          score: m.score || 'Completata',
          isWinner,
          court: m.court,
          isP1
        });
      }
    });

    // Deduplica per ID per prevenire chiavi duplicate
    const uniqueMap = new Map<string, typeof history[0]>();
    history.forEach(item => {
      uniqueMap.set(item.id, item);
    });

    // Ordina per data decrescente
    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [currentPlayer, rankingMatches, tournamentMatches, tournaments]);

  // Filtra la cronologia delle partite per la stagione selezionata
  const filteredHistory = useMemo(() => {
    if (selectedYear === 'all') return playerMatchesHistory;
    return playerMatchesHistory.filter(h => h.date && h.date.startsWith(selectedYear));
  }, [playerMatchesHistory, selectedYear]);

  // Calcola i punti accumulati specificamente nella stagione selezionata
  const seasonalPoints = useMemo(() => {
    if (selectedYear === 'all') return currentPlayer?.points || 0;
    const rankingMatchesForPlayer = filteredHistory.filter(m => m.type === 'ranking');
    let pts = 0;
    rankingMatchesForPlayer.forEach(m => {
      pts += m.pointsDelta || 0;
    });
    return Math.max(0, pts);
  }, [currentPlayer, filteredHistory, selectedYear]);

  // Head to Head calculation
  const headToHead = useMemo(() => {
    if (!currentPlayer || !h2hOpponentId) return null;
    const opponent = players.find(p => p.id === h2hOpponentId);
    if (!opponent) return null;

    const matchesBetween = filteredHistory.filter(m => m.opponentId === opponent.id);
    const wins = matchesBetween.filter(m => m.isWinner).length;
    const losses = matchesBetween.length - wins;

    return {
      opponent,
      total: matchesBetween.length,
      wins,
      losses,
      matches: matchesBetween
    };
  }, [currentPlayer, h2hOpponentId, filteredHistory, players]);

  const statsSeparated = useMemo(() => {
    if (!currentPlayer) return null;

    const rankingMatchesForPlayer = filteredHistory.filter(m => m.type === 'ranking');
    const rankingTotal = rankingMatchesForPlayer.length;
    const rankingWins = rankingMatchesForPlayer.filter(m => m.isWinner).length;
    const rankingLosses = rankingTotal - rankingWins;
    const rankingWinRate = rankingTotal > 0 ? Math.round((rankingWins / rankingTotal) * 100) : 0;

    const tournamentMatchesForPlayer = filteredHistory.filter(m => m.type === 'tournament');
    const tournamentTotal = tournamentMatchesForPlayer.length;
    const tournamentWins = tournamentMatchesForPlayer.filter(m => m.isWinner).length;
    const tournamentLosses = tournamentTotal - tournamentWins;
    const tournamentWinRate = tournamentTotal > 0 ? Math.round((tournamentWins / tournamentTotal) * 100) : 0;

    return {
      ranking: {
        total: rankingTotal,
        wins: rankingWins,
        losses: rankingLosses,
        winRate: rankingWinRate
      },
      tournament: {
        total: tournamentTotal,
        wins: tournamentWins,
        losses: tournamentLosses,
        winRate: tournamentWinRate
      }
    };
  }, [currentPlayer, filteredHistory]);

  const globalStats = useMemo(() => {
    if (!currentPlayer || !filteredHistory) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0
      };
    }

    let setsWon = 0;
    let setsLost = 0;
    let gamesWon = 0;
    let gamesLost = 0;

    filteredHistory.forEach(m => {
      const sets = m.score ? m.score.split(' ') : [];
      let matchSetsWon = 0;
      let matchSetsLost = 0;

      const isP1 = m.isP1;

      sets.forEach(setStr => {
        const parts = setStr.split('-');
        if (parts.length === 2) {
          const g1 = parseInt(parts[0]);
          const g2 = parseInt(parts[1]);
          if (!isNaN(g1) && !isNaN(g2)) {
            const playerGames = isP1 ? g1 : g2;
            const opponentGames = isP1 ? g2 : g1;
            gamesWon += playerGames;
            gamesLost += opponentGames;

            if (playerGames > opponentGames) {
              matchSetsWon++;
            } else if (opponentGames > playerGames) {
              matchSetsLost++;
            }
          }
        }
      });

      if (matchSetsWon === 0 && matchSetsLost === 0) {
        if (m.isWinner) {
          matchSetsWon = 2;
          matchSetsLost = 0;
        } else {
          matchSetsWon = 0;
          matchSetsLost = 2;
        }
      }

      setsWon += matchSetsWon;
      setsLost += matchSetsLost;
    });

    const totalMatches = filteredHistory.length;
    const wins = filteredHistory.filter(m => m.isWinner).length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return {
      totalMatches,
      wins,
      losses,
      winRate,
      setsWon,
      setsLost,
      gamesWon,
      gamesLost
    };
  }, [currentPlayer, filteredHistory]);

  const pointsProgressionData = useMemo(() => {
    if (!currentPlayer) return [];

    const playerRankingMatches = rankingMatches
      .filter(m => m.player1Id === currentPlayer.id || m.player2Id === currentPlayer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (playerRankingMatches.length === 0) {
      return [{ dateStr: 'Attuale', points: currentPlayer.points, matchInfo: 'Punti Attuali' }];
    }

    let totalDeltaAll = 0;
    playerRankingMatches.forEach(m => {
      const isWinner = m.winnerId === currentPlayer.id;
      const delta = isWinner ? m.pointsAwardedWinner : -m.pointsDeductedLoser;
      totalDeltaAll += delta;
    });

    let currentBase = Math.max(0, currentPlayer.points - totalDeltaAll);
    const data: Array<{ dateStr: string; points: number; matchInfo: string }> = [];

    data.push({
      dateStr: 'Inizio',
      points: currentBase,
      matchInfo: 'Punti Iniziali'
    });

    playerRankingMatches.forEach((m) => {
      const isWinner = m.winnerId === currentPlayer.id;
      const delta = isWinner ? m.pointsAwardedWinner : -m.pointsDeductedLoser;
      currentBase += delta;
      const dateFormatted = new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const opponentName = m.player1Id === currentPlayer.id ? m.player2Name : m.player1Name;
      data.push({
        dateStr: dateFormatted,
        points: Math.max(0, currentBase),
        matchInfo: `${isWinner ? 'Vittoria' : 'Sconfitta'} vs ${opponentName} (${m.score})`
      });
    });

    return data;
  }, [currentPlayer, rankingMatches]);

  if (!currentPlayer || players.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm shadow-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center text-3xl mx-auto">
          👤
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="font-display font-bold text-xl text-slate-900">
            Nessun giocatore registrato
          </h2>
          <p className="text-sm text-slate-500">
            Aggiungi i tuoi primi atleti per visualizzare statistiche personali, percentuali di vittoria, confronti testa a testa e storico delle partite.
          </p>
        </div>
      </div>
    );
  }

  const winRate = globalStats.winRate;

  const prev = currentPlayer.previousRank || currentPlayer.rank;
  const diffRank = prev - currentPlayer.rank;

  return (
    <div className="space-y-6">
      
      {/* Top Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm shadow-slate-100">
        <div className="space-y-1">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block">
            Dashboard Iscritti & Statistiche
          </span>
          <h2 className="font-display font-extrabold text-xl text-slate-900">
            Scheda Atleta & Storico Incontri
          </h2>
        </div>

        {/* Dropdown per cambiare giocatore con campo ricerca integrato e filtro temporale */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Filtro Temporale (Stagione) */}
          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 shadow-sm">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs text-slate-500 font-bold uppercase shrink-0 hidden sm:inline">Stagione:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer w-full sm:w-auto"
            >
              <option value="all" className="bg-white">Tutte le Stagioni</option>
              {availableYears.map(year => (
                <option key={year} value={year} className="bg-white">Stagione {year}</option>
              ))}
            </select>
          </div>

          <SearchableSelect
            options={players.map(p => ({
              value: p.id,
              label: `[${p.category?.toUpperCase() || 'MASCHILE'}] #${p.rank} ${p.name}${p.partnerName ? ` / ${p.partnerName}` : ''} (${p.points} pt)`
            }))}
            value={currentPlayer.id}
            onChange={onSelectPlayer}
            placeholder="Seleziona giocatore..."
            searchPlaceholder="Cerca atleta..."
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {/* Profilo Hero Card */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar & Dati Base */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${
              currentPlayer.category === 'femminile' ? 'bg-rose-500' : currentPlayer.category === 'doppio' ? 'bg-orange-500' : 'bg-blue-600'
            } text-white font-black text-2xl flex items-center justify-center shadow-md ring-4 ring-white`}>
              {currentPlayer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900">
                  {currentPlayer.name}
                  {currentPlayer.partnerName && (
                    <span className="text-lg font-normal text-orange-600 block sm:inline sm:ml-2">
                      / {currentPlayer.partnerName}
                    </span>
                  )}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  currentPlayer.category === 'maschile' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : currentPlayer.category === 'femminile'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {currentPlayer.category === 'maschile' ? 'Singolare Maschile' : currentPlayer.category === 'femminile' ? 'Singolare Femminile' : 'Doppio'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  FITP {currentPlayer.fitRating || 'NC'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                <span className={`px-2 py-0.5 rounded font-black text-xs ${
                  currentPlayer.gender === 'F' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {currentPlayer.gender === 'F' ? '♀ Sesso: Femminile' : '♂ Sesso: Maschile'}
                </span>
                {calculateAge(currentPlayer.birthDate) !== null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-black border border-orange-200">
                    🎂 Età: {calculateAge(currentPlayer.birthDate)} anni
                  </span>
                )}
                {currentPlayer.birthDate && (
                  <span className="text-slate-500">
                    (Nato/a il {formatBirthDate(currentPlayer.birthDate)})
                  </span>
                )}
                {currentPlayer.category === 'doppio' && currentPlayer.partnerName && (
                  <span className="text-orange-700 pl-2 border-l border-slate-200">
                    Partner: {currentPlayer.partnerName} {currentPlayer.partnerGender ? `(${currentPlayer.partnerGender})` : ''} {calculateAge(currentPlayer.partnerBirthDate) !== null ? `• ${calculateAge(currentPlayer.partnerBirthDate)} anni` : ''}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-3 pt-1">
                <span>{currentPlayer.email || 'socio@tenniscomunalitrissino.it'}</span>
                <span>•</span>
                <span>{currentPlayer.phone || '+39 320 8080670'}</span>
              </p>
            </div>
          </div>

          {/* Rank & Punti Badge */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center min-w-[100px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Rank {currentPlayer.category}
              </span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="font-display font-black text-2xl text-slate-900">
                  #{currentPlayer.rank}
                </span>
                {diffRank > 0 && (
                  <span className="text-blue-600 text-xs font-bold flex items-center">
                    <ArrowUp className="w-3.5 h-3.5" />+{diffRank}
                  </span>
                )}
                {diffRank < 0 && (
                  <span className="text-rose-600 text-xs font-bold flex items-center">
                    <ArrowDown className="w-3.5 h-3.5" />{diffRank}
                  </span>
                )}
                {diffRank === 0 && (
                  <span className="text-slate-400 text-xs">
                    <Minus className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-center min-w-[120px]">
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider block">
                {selectedYear === 'all' ? 'Punti Circolo' : `Punti Stagione ${selectedYear}`}
              </span>
              <div className="font-display font-black text-2xl text-orange-600 mt-0.5">
                {seasonalPoints} <span className="text-xs font-semibold text-slate-500">pt</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Grafico Andamento Punti nel Tempo (Recharts) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Andamento Punti nel Tempo
            </h3>
            <p className="text-xs text-slate-500">
              Evoluzione della classifica e dei punti accumulati match dopo match
            </p>
          </div>
          <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-black">
            Totale: {currentPlayer.points} pt
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pointsProgressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="dateStr" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                stroke="#cbd5e1" 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                stroke="#cbd5e1" 
                domain={['auto', 'auto']}
              />
              <Tooltip 
                shared={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-white text-xs space-y-1">
                        <div className="font-bold text-orange-400">{data.dateStr}</div>
                        <div className="font-display font-black text-sm">{data.points} punti</div>
                        <div className="text-slate-300 text-[11px]">{data.matchInfo}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="points" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPoints)" 
                dot={{ stroke: '#f97316', strokeWidth: 2, r: 4, fill: '#ffffff' }}
                activeDot={{ r: 6, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistiche Differenziate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box Classifica Mobile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-display font-black text-sm text-orange-600 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Classifica Mobile (Sfide)
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Sfide Dirette
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Partite (V - P)</span>
              <div className="font-display font-black text-2xl text-slate-900">
                <span className="text-emerald-600">{statsSeparated?.ranking.wins}</span>
                <span className="text-slate-400 mx-1.5">/</span>
                <span className="text-rose-600">{statsSeparated?.ranking.losses}</span>
              </div>
              <p className="text-[11px] text-slate-500">{statsSeparated?.ranking.total} sfide disputate</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Percentuale Vittorie</span>
              <div className="font-display font-black text-2xl text-slate-900">
                {statsSeparated?.ranking.winRate}%
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full rounded-full bg-orange-500" 
                  style={{ width: `${statsSeparated?.ranking.winRate}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Box Tornei Sociali */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-display font-black text-sm text-blue-600 flex items-center gap-2 uppercase tracking-wider">
              <Trophy className="w-5 h-5 text-blue-600" />
              Tornei Sociali (Tabelloni)
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Eliminazione / Gironi
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Partite (V - P)</span>
              <div className="font-display font-black text-2xl text-slate-900">
                <span className="text-emerald-600">{statsSeparated?.tournament.wins}</span>
                <span className="text-slate-400 mx-1.5">/</span>
                <span className="text-rose-600">{statsSeparated?.tournament.losses}</span>
              </div>
              <p className="text-[11px] text-slate-500">{statsSeparated?.tournament.total} incontri disputati</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Percentuale Vittorie</span>
              <div className="font-display font-black text-2xl text-slate-900">
                {statsSeparated?.tournament.winRate}%
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full rounded-full bg-blue-500" 
                  style={{ width: `${statsSeparated?.tournament.winRate}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Griglia KPI Generali */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Set Vinti / Persi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shadow-slate-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
            <span>Set Totali (V - P)</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-display font-black text-xl text-slate-900">
            <span className="text-emerald-600">{globalStats.setsWon}</span>
            <span className="text-slate-400 mx-1.5">-</span>
            <span className="text-rose-600">{globalStats.setsLost}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {globalStats.gamesWon} game vinti ({globalStats.gamesLost} persi)
          </p>
        </div>

        {/* Striscia Attuale */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shadow-slate-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
            <span>Striscia Attuale</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display font-black text-xl text-slate-900">
            {currentPlayer.currentStreak > 0 ? (
              <span className="text-amber-600">+{currentPlayer.currentStreak} V</span>
            ) : currentPlayer.currentStreak < 0 ? (
              <span className="text-rose-600">{currentPlayer.currentStreak} P</span>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Record personale: {currentPlayer.bestStreak} vittorie
          </p>
        </div>

        {/* Win Rate Globale */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shadow-slate-100 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
            <span>Win Rate Globale</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-display font-black text-xl text-emerald-600">
            {winRate}%
          </div>
          <p className="text-[11px] text-slate-500">
            Su {globalStats.totalMatches} partite complessive
          </p>
        </div>
      </div>

      {/* Sezione Head-to-Head (Scontri Diretti) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm shadow-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <Swords className="w-5 h-5 text-orange-500" />
              Confronto Diretto (Head-to-Head)
            </h3>
            <p className="text-xs text-slate-500">
              Verifica lo storico dei precedenti con qualsiasi altro socio del circolo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchableSelect
              options={players
                .filter(p => p.id !== currentPlayer.id && (p.category || 'maschile') === (currentPlayer.category || 'maschile'))
                .map(p => {
                  const oppAge = calculateAge(p.birthDate);
                  const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                  return {
                    value: p.id,
                    label: `#${p.rank} ${p.name}${p.partnerName ? ` / ${p.partnerName}` : ''} ${oppAge !== null ? `(${oppAge} anni, ${genderBadge})` : `(${genderBadge})`} - FITP ${p.fitRating || 'NC'}`
                  };
                })
              }
              value={h2hOpponentId}
              onChange={setH2hOpponentId}
              placeholder="Seleziona un avversario..."
              searchPlaceholder="Filtra avversario..."
              className="w-full sm:w-64"
            />
          </div>
        </div>

        {headToHead ? (
          <div className="space-y-3">
            {/* Scheda Anagrafica & Età dell'Avversario */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Scheda Avversario:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-black text-lg text-slate-900">
                      {headToHead.opponent.name}
                      {headToHead.opponent.partnerName && (
                        <span className="text-sm font-normal text-orange-600 ml-1">
                          / {headToHead.opponent.partnerName}
                        </span>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      FITP {headToHead.opponent.fitRating || 'NC'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200">
                      Pos. #{headToHead.opponent.rank} ({headToHead.opponent.points} pt)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                    headToHead.opponent.gender === 'F' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {headToHead.opponent.gender === 'F' ? '♀ Femmina' : '♂ Maschio'}
                  </span>

                  {calculateAge(headToHead.opponent.birthDate) !== null ? (
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1.5 shadow-sm">
                      <span>🎂 Età Avversario:</span>
                      <strong>{calculateAge(headToHead.opponent.birthDate)} anni</strong>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      Età avversario non inserita
                    </span>
                  )}
                </div>
              </div>

              {/* Dettagli Nascita e Differenziale di Età */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-0.5">
                <div className="text-slate-500">
                  {headToHead.opponent.birthDate ? (
                    <span>Data di nascita: <strong className="text-slate-800">{formatBirthDate(headToHead.opponent.birthDate)}</strong></span>
                  ) : (
                    <span className="text-slate-500">Data di nascita non indicata</span>
                  )}
                </div>

                {/* Confronto Età Diretto con il Giocatore Corrente */}
                {calculateAge(currentPlayer.birthDate) !== null && calculateAge(headToHead.opponent.birthDate) !== null && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    {calculateAge(currentPlayer.birthDate) === calculateAge(headToHead.opponent.birthDate) ? (
                      <span className="text-blue-600 font-bold">✨ Siete coetanei (stessa età: {calculateAge(currentPlayer.birthDate)} anni)</span>
                    ) : calculateAge(headToHead.opponent.birthDate)! > calculateAge(currentPlayer.birthDate)! ? (
                      <span className="text-amber-700">
                        L'avversario ha <strong className="text-amber-800">+{calculateAge(headToHead.opponent.birthDate)! - calculateAge(currentPlayer.birthDate)!} anni in più</strong> rispetto a te ({calculateAge(currentPlayer.birthDate)} vs {calculateAge(headToHead.opponent.birthDate)})
                      </span>
                    ) : (
                      <span className="text-cyan-700">
                        L'avversario ha <strong className="text-cyan-800">-{calculateAge(currentPlayer.birthDate)! - calculateAge(headToHead.opponent.birthDate)!} anni in meno</strong> rispetto a te ({calculateAge(currentPlayer.birthDate)} vs {calculateAge(headToHead.opponent.birthDate)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bilancio Scontri Diretti */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-around text-center py-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">{currentPlayer.name}</span>
                  <span className="font-display font-black text-3xl text-blue-600">{headToHead.wins}</span>
                  <span className="text-[11px] text-slate-500 block">vittorie</span>
                </div>

                <div className="text-center px-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Bilancio</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {headToHead.total} {headToHead.total === 1 ? 'incontro' : 'incontri'} disputati
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">{headToHead.opponent.name}</span>
                  <span className="font-display font-black text-3xl text-rose-600">{headToHead.losses}</span>
                  <span className="text-[11px] text-slate-500 block">vittorie</span>
                </div>
              </div>

              {headToHead.matches.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Precedenti:</span>
                  {headToHead.matches.map((m, idx) => (
                    <div key={`h2h_${m.id}_${idx}`} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500">{new Date(m.date).toLocaleDateString('it-IT')}</span>
                      <span className="text-slate-700 font-medium">{m.title}</span>
                      <span className="font-bold text-slate-900">{m.score}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        m.isWinner 
                          ? 'bg-emerald-550/20 text-emerald-600 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        {m.isWinner ? 'Vittoria' : 'Sconfitta'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            Seleziona un avversario dal menu a tendina sopra per consultare i precedenti testa a testa.
          </div>
        )}
      </div>

      {/* Storico Completo Partite (Match History) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-display font-bold text-base text-slate-900">
              Storico Completo Incontri Disputati ({filteredHistory.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Include sfide della classifica mobile e tabelloni dei tornei
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nessuna partita registrata finora per questo atleta.
            </div>
          ) : (
            filteredHistory.map((m, idx) => (
              <div key={`hist_${m.id}_${idx}`} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    m.isWinner 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {m.isWinner ? 'V' : 'P'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {m.isWinner ? 'Vittoria contro' : 'Sconfitta contro'} {m.opponentName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
                        {m.score}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{new Date(m.date).toLocaleDateString('it-IT')}</span>
                      <span>•</span>
                      <span>{m.title}</span>
                      {m.court && (
                        <>
                          <span>•</span>
                          <span>{m.court}</span>
                        </>
                      )}
                    </div>

                    {m.ruleApplied && (
                      <p className="text-[11px] text-blue-700 mt-1 italic">
                        {m.ruleApplied}
                      </p>
                    )}
                  </div>
                </div>

                {/* Points impact */}
                {m.pointsDelta !== undefined && (
                  <div className="text-right shrink-0">
                    <span className={`font-display font-extrabold text-base ${
                      m.pointsDelta > 0 ? 'text-orange-600' : 'text-rose-600'
                    }`}>
                      {m.pointsDelta > 0 ? `+${m.pointsDelta}` : m.pointsDelta} pt
                    </span>
                    <span className="text-[10px] text-slate-500 block">Classifica mobile</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
