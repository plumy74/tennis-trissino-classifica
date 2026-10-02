import React from 'react';
import { 
  Tv, 
  Trophy, 
  Megaphone, 
  Calendar, 
  Download, 
  Award, 
  Sparkles,
  Swords,
  ChevronRight
} from 'lucide-react';
import { Player, RankingMatch, Tournament, ClubSettings } from '../types/tennis';
import { calculateAge } from '../utils/scoring';
import { ClubLogo } from './ClubLogo';

interface NoticeBoardViewProps {
  clubSettings: ClubSettings;
  players: Player[];
  rankingMatches: RankingMatch[];
  tournaments: Tournament[];
  onSelectPlayer: (id: string) => void;
  onSelectTournament: (id: string) => void;
  onViewHistory?: () => void;
}

export const NoticeBoardView: React.FC<NoticeBoardViewProps> = ({
  clubSettings,
  players,
  rankingMatches,
  tournaments,
  onSelectPlayer,
  onSelectTournament,
  onViewHistory
}) => {
  const topMaschile = players.filter(p => (p.category || 'maschile') === 'maschile').slice(0, 3);
  const topFemminile = players.filter(p => p.category === 'femminile').slice(0, 3);
  const topDoppio = players.filter(p => p.category === 'doppio').slice(0, 3);
  const recentMatches = rankingMatches.slice(0, 4);
  const activeTournaments = tournaments.filter(t => t.status !== 'completed');

  return (
    <div className="space-y-6">
      
      {/* Header Bacheca */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ClubLogo size="lg" customUrl={clubSettings.logoUrl} className="shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                Bacheca Ufficiale Digitale Circolo
              </span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
              {clubSettings.clubName}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {clubSettings.season} • Aggiornamento in tempo reale per soci e visitatori
            </p>
          </div>
        </div>
      </div>

      {/* Comunicato Ufficiale del Circolo */}
      {clubSettings.announcement && (
        <div className="bg-gradient-to-r from-amber-50/50 via-slate-50/20 to-slate-50/10 border-l-4 border-amber-500 rounded-r-2xl p-4 sm:p-5 shadow-sm shadow-slate-100 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">
              Comunicato dalla Direzione Tecnica
            </span>
            <p className="text-sm text-slate-700 leading-relaxed font-semibold">
              {clubSettings.announcement}
            </p>
          </div>
        </div>
      )}

      {/* Griglia a 2 colonne: Top 5 Classifica Mobile + Tornei in Corso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Leaders per Categoria (Maschile, Femminile, Doppio) */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shadow-slate-100 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-bold text-base text-slate-900">
                Leader Classifiche di Categoria
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Top 3 per Categoria
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* 1. Singolare Maschile */}
            <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                  🎾 Singolare Maschile
                </span>
                <span className="text-[11px] text-slate-500">
                  {topMaschile.length} atleti a podio
                </span>
              </div>
              {topMaschile.length === 0 ? (
                <p className="text-xs text-slate-500 py-1 italic">Nessun atleta registrato</p>
              ) : (
                <div className="space-y-1.5">
                  {topMaschile.map((p, idx) => (
                    <div 
                      key={`top_m_${p.id}_${idx}`}
                      onClick={() => onSelectPlayer(p.id)}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${
                          p.rank === 1 ? 'bg-amber-500 text-slate-950' : p.rank === 2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-amber-200'
                        }`}>
                          {p.rank}°
                        </span>
                        <span className="font-bold text-slate-800">{p.name}</span>
                        {calculateAge(p.birthDate) !== null && (
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded">
                            {calculateAge(p.birthDate)} anni
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">FITP {p.fitRating || 'NC'}</span>
                      </div>
                      <span className="font-black text-orange-600">{p.points} pt</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Singolare Femminile */}
            <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-rose-600 tracking-wider">
                  🎾 Singolare Femminile
                </span>
                <span className="text-[11px] text-slate-500">
                  {topFemminile.length} atlete a podio
                </span>
              </div>
              {topFemminile.length === 0 ? (
                <p className="text-xs text-slate-500 py-1 italic">Nessuna atleta registrata</p>
              ) : (
                <div className="space-y-1.5">
                  {topFemminile.map((p, idx) => (
                    <div 
                      key={`top_f_${p.id}_${idx}`}
                      onClick={() => onSelectPlayer(p.id)}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-rose-100/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${
                          p.rank === 1 ? 'bg-amber-500 text-slate-950' : p.rank === 2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-amber-200'
                        }`}>
                          {p.rank}°
                        </span>
                        <span className="font-bold text-slate-800">{p.name}</span>
                        {calculateAge(p.birthDate) !== null && (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                            {calculateAge(p.birthDate)} anni
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">FITP {p.fitRating || 'NC'}</span>
                      </div>
                      <span className="font-black text-rose-600">{p.points} pt</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sospensione temporanea del doppio su richiesta */}
          </div>
        </div>

        {/* Tornei Sociali Attivi */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-orange-500" />
              <h3 className="font-display font-bold text-base text-slate-900">
                Tornei Sociali in Svolgimento
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Tabelloni bacheca
            </span>
          </div>

          <div className="p-4 space-y-3">
            {activeTournaments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Nessun torneo sociale attivo al momento.
              </p>
            ) : (
              activeTournaments.map(t => (
                <div
                  key={t.id}
                  onClick={() => onSelectTournament(t.id)}
                  className="bg-slate-50 border border-slate-200 hover:border-orange-500 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                      {t.type === 'round_robin' ? 'Round Robin' : 'Eliminazione Diretta'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t.startDate} - {t.endDate}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors">
                    {t.name}
                  </h4>

                  <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                    <span>{t.category} • Superficie: {t.surface}</span>
                    <span className="font-semibold text-orange-600 flex items-center gap-1">
                      Visualizza tabellone <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Ultimi Risultati Registrati */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-display font-bold text-base text-slate-900">
              Ultimi Incontri Registrati nel Circolo
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Risultati ufficiali convalidati
            </span>
            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-500/15 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>📜</span>
                <span>Vedi Tutto lo Storico ({rankingMatches.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {recentMatches.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-slate-500">
              Nessun incontro registrato finora. Registra una sfida di classifica per vedere i risultati in bacheca.
            </div>
          ) : (
            recentMatches.map((m, idx) => (
              <div key={`recent_${m.id}_${idx}`} className="p-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {new Date(m.date).toLocaleDateString('it-IT')} • {m.court || 'Campo 1'}
                </span>

                <div className="text-sm">
                  <div className={`font-bold ${m.winnerId === m.player1Id ? 'text-orange-600 font-extrabold' : 'text-slate-500'}`}>
                    {m.player1Name} {m.winnerId === m.player1Id && '🏆'}
                  </div>
                  <div className={`font-bold ${m.winnerId === m.player2Id ? 'text-orange-600 font-extrabold' : 'text-slate-500'}`}>
                    {m.player2Name} {m.winnerId === m.player2Id && '🏆'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {m.score}
                  </span>
                  <span className="text-xs font-bold text-orange-600">
                    +{m.pointsAwardedWinner} pt
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
