import React, { useState, useMemo } from 'react';
import { X, Trophy, Swords, Calendar, Users, Check } from 'lucide-react';
import { Player, Tournament, TournamentType, TournamentParticipant, TournamentMatch } from '../types/tennis';
import { generateEliminationBracket, generateRoundRobinMatches } from '../utils/tournamentGenerator';
import { calculateAge } from '../utils/scoring';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onCreateTournament: (tournament: Tournament, matches: TournamentMatch[]) => Promise<void>;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  players,
  onCreateTournament
}) => {
  const [name, setName] = useState<string>('Torneo Sociale del Circolo');
  const [type, setType] = useState<TournamentType>('elimination');
  const [category, setCategory] = useState<string>('Singolare Maschile');
  const [surface, setSurface] = useState<string>('Terra Rossa');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Eligible players filtered by tournament category
  const eligiblePlayers = useMemo(() => {
    if (category.toLowerCase().includes('maschile') && !category.toLowerCase().includes('doppio')) {
      return players.filter((p: Player) => (p.category || 'maschile') === 'maschile');
    }
    if (category.toLowerCase().includes('femminile')) {
      return players.filter((p: Player) => p.category === 'femminile');
    }
    if (category.toLowerCase().includes('doppio')) {
      return players.filter((p: Player) => p.category === 'doppio');
    }
    return players;
  }, [players, category]);

  // Selected players IDs
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Update selection when eligible players change
  React.useEffect(() => {
    setSelectedPlayerIds(eligiblePlayers.slice(0, 8).map((p: Player) => p.id));
  }, [eligiblePlayers]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTogglePlayer = (id: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectCount = (count: number) => {
    setSelectedPlayerIds(eligiblePlayers.slice(0, count).map((p: Player) => p.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (selectedPlayerIds.length < 2) {
      setFormError('Seleziona almeno 2 atleti per generare il torneo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const tournamentId = `tourn_${Date.now()}`;

      // Crea lista partecipanti con teste di serie in base alla posizione di classifica
      const participants: TournamentParticipant[] = selectedPlayerIds
        .map(id => {
          const p = players.find(player => player.id === id);
          if (!p) return null;
          const participantName = p.partnerName ? `${p.name} / ${p.partnerName}` : p.name;
          const participant: TournamentParticipant = {
            playerId: p.id,
            name: participantName,
            fitRating: p.fitRating,
            seed: p.rank
          };
          return participant;
        })
        .filter((p): p is TournamentParticipant => p !== null)
        .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
        .map((p, index) => ({
          ...p,
          seed: index + 1
        }));

      const newTournament: Tournament = {
        id: tournamentId,
        name,
        type,
        category,
        surface,
        startDate,
        endDate,
        status: 'ongoing',
        participants,
        settings: {
          setsToWin: 2,
          tiebreakRule: 'Super Tie-break al 3° set (10 pt)'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Genera incontri
      let matches: TournamentMatch[] = [];
      if (type === 'elimination') {
        matches = generateEliminationBracket(tournamentId, participants);
      } else {
        matches = generateRoundRobinMatches(tournamentId, participants, 'Girone Unico');
      }

      await onCreateTournament(newTournament, matches);
      onClose();
    } catch (err) {
      console.error('Errore creazione torneo:', err);
      alert('Si è verificato un errore durante la creazione del torneo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              🏆
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                Crea Nuovo Torneo Sociale
              </h2>
              <p className="text-xs text-slate-400">
                Genera automaticamente tabelloni e calendario partite
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-medium">
              {formError}
            </div>
          )}
          
          {/* Nome Torneo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Nome del Torneo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-500"
              placeholder="es. Torneo d'Autunno 2026"
            />
          </div>

          {/* Formula di Gioco: Eliminazione vs Round Robin */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Formula di Gioco
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('elimination')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  type === 'elimination'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Swords className={`w-5 h-5 mt-0.5 ${type === 'elimination' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <span className="font-bold text-xs block text-white">Eliminazione Diretta</span>
                  <span className="text-[11px] text-slate-400">Tabellone classico con teste di serie</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('round_robin')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  type === 'round_robin'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Trophy className={`w-5 h-5 mt-0.5 ${type === 'round_robin' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <span className="font-bold text-xs block text-white">Round Robin</span>
                  <span className="text-[11px] text-slate-400">Girone tutti contro tutti con classifica</span>
                </div>
              </button>
            </div>
          </div>

          {/* Categoria & Superficie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="Singolare Maschile">Singolare Maschile</option>
                <option value="Singolare Femminile">Singolare Femminile</option>
                <option value="Singolare Open">Singolare Open</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Superficie</label>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="Terra Rossa">Terra Rossa</option>
                <option value="Sintetico">Sintetico</option>
                <option value="Erba Sintetica">Erba Sintetica</option>
                <option value="Cemento">Cemento</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Data Inizio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Data Fine / Finale</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Selezione Partecipanti */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Atleti Iscritti ({selectedPlayerIds.length} di {eligiblePlayers.length} selezionati)
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectCount(4)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300"
                >
                  Top 4
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCount(8)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300"
                >
                  Top 8
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerIds(eligiblePlayers.map((p: Player) => p.id))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300"
                >
                  Tutti
                </button>
              </div>
            </div>

            {eligiblePlayers.length === 0 ? (
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <p className="text-white font-medium">Nessun atleta registrato per la categoria {category}.</p>
                <p className="text-amber-400 text-[11px]">Aggiungi prima almeno 2 giocatori nell'Area Gestore.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 divide-y divide-slate-800/60">
                {eligiblePlayers.map((p: Player) => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  const pAge = calculateAge(p.birthDate);
                  const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleTogglePlayer(p.id)}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-900 cursor-pointer rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs font-semibold text-white">
                          #{p.rank} {p.name} {p.partnerName ? `/ ${p.partnerName}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 rounded text-[10px] font-bold ${
                          genderBadge === 'F' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {genderBadge}
                        </span>
                        {pAge !== null && (
                          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {pAge} anni
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          FITP {p.fitRating || 'NC'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedPlayerIds.length < 2}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Creazione in corso...' : 'Genera Tabellone e Calendario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
