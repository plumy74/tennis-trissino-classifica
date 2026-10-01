import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Trophy, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Search, 
  PlusCircle, 
  Info, 
  Flame, 
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  User,
  Calendar,
  X
} from 'lucide-react';
import { Player, PlayerCategory, RankingMatch } from '../types/tennis';
import { calculateAge, formatBirthDate, computePlayersStatsFromMatches } from '../utils/scoring';
import { ClubLogo } from './ClubLogo';

interface RankingLadderProps {
  players: Player[];
  rankingMatches: RankingMatch[];
  isAdmin: boolean;
  onOpenMatchModal: () => void;
  onSelectPlayer: (playerId: string) => void;
  onAddPlayer?: () => void;
  onOpenManagerArea?: () => void;
}

export const RankingLadder: React.FC<RankingLadderProps> = ({
  players,
  rankingMatches,
  isAdmin,
  onOpenMatchModal,
  onSelectPlayer,
  onAddPlayer,
  onOpenManagerArea
}) => {
  const [activeCategory, setActiveCategory] = useState<PlayerCategory>('maschile');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFitRating, setSelectedFitRating] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'all' | 'maschile' | 'femminile' | 'doppio'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [showFullLadder, setShowFullLadder] = useState(false);

  const filteredHistoryMatches = useMemo(() => {
    return rankingMatches.filter(m => {
      if (historyCategoryFilter !== 'all' && m.category !== historyCategoryFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const p1Match = m.player1Name.toLowerCase().includes(q);
        const p2Match = m.player2Name.toLowerCase().includes(q);
        if (!p1Match && !p2Match) return false;
      }
      if (historyDateFilter.trim()) {
        const matchDateStr = m.date.slice(0, 10);
        if (matchDateStr !== historyDateFilter) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rankingMatches, historyCategoryFilter, historySearch, historyDateFilter]);

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

  // Filtra i match per la stagione selezionata
  const seasonalMatches = useMemo(() => {
    if (selectedYear === 'all') return rankingMatches;
    return rankingMatches.filter(m => m.date && m.date.startsWith(selectedYear));
  }, [rankingMatches, selectedYear]);

  // Calcola i giocatori attivi con le statistiche allineate alla stagione
  const activePlayersWithStats = useMemo(() => {
    if (selectedYear === 'all') return players;
    return computePlayersStatsFromMatches(players, seasonalMatches);
  }, [players, seasonalMatches, selectedYear]);

  // Conteggi per categoria in base alla stagione attiva
  const maschileCount = activePlayersWithStats.filter(p => (p.category || 'maschile') === 'maschile').length;
  const femminileCount = activePlayersWithStats.filter(p => p.category === 'femminile').length;
  const doppioCount = activePlayersWithStats.filter(p => p.category === 'doppio').length;

  // Filtra per categoria selezionata
  const categoryPlayers = activePlayersWithStats.filter(p => (p.category || 'maschile') === activeCategory);

  // Filtra per ricerca e classifica FITP
  const filteredPlayers = categoryPlayers.filter(p => {
    const fullName = p.partnerName ? `${p.name} ${p.partnerName}` : p.name;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFitRating === 'all') return true;
    if (selectedFitRating === '3cat') return p.fitRating?.startsWith('3');
    if (selectedFitRating === '4cat') return p.fitRating?.startsWith('4.') && p.fitRating !== '4.NC';
    if (selectedFitRating === 'nc') return p.fitRating === '4.NC' || p.fitRating === 'NC';
    return true;
  });

  const displayedPlayers = showFullLadder ? filteredPlayers : filteredPlayers.slice(0, 5);

  const top3 = categoryPlayers.slice(0, 3);

  const getCategoryLabel = (cat: PlayerCategory) => {
    switch (cat) {
      case 'maschile': return 'Singolare Maschile';
      case 'femminile': return 'Singolare Femminile';
      case 'doppio': return 'Doppio';
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12); // Orange theme color
    doc.text("TENNIS COMUNALI TRISSINO", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text(`Classifica Ufficiale - Categoria: ${activeCategory.toUpperCase()} ${selectedYear !== 'all' ? `(Stagione ${selectedYear})` : ''}`, 14, 28);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data emissione: ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 14, 34);

    // Table Data
    const tableHeaders = ["Pos.", activeCategory === 'doppio' ? "Coppia di Doppio" : "Giocatore", "Class. FITP", "Punti", "Giocate", "V - P", "Win %"];
    const tableRows = filteredPlayers.map((player, idx) => {
      const winRate = player.matchesPlayed > 0 
        ? Math.round((player.matchesWon / player.matchesPlayed) * 100) 
        : 0;
      const name = player.partnerName ? `${player.name} / ${player.partnerName}` : player.name;
      return [
        `${idx + 1}°`,
        name,
        player.fitRating || 'NC',
        `${player.points} pt`,
        player.matchesPlayed,
        `${player.matchesWon} - ${player.matchesLost}`,
        `${winRate}%`
      ];
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 41, 59],
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Tennis Trissino • Pagina ${i} di ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`classifica_${activeCategory}_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Category Tabs: Maschile / Femminile / Doppio */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50 overflow-x-auto">
        <button
          onClick={() => {
            setActiveCategory('maschile');
            setSearchTerm('');
            setShowFullLadder(false);
          }}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeCategory === 'maschile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>🎾 Singolare Maschile</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeCategory === 'maschile' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {maschileCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('femminile');
            setSearchTerm('');
            setShowFullLadder(false);
          }}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeCategory === 'femminile'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>🎾 Singolare Femminile</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeCategory === 'femminile' ? 'bg-rose-700/60 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {femminileCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveCategory('doppio');
            setSearchTerm('');
            setShowFullLadder(false);
          }}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeCategory === 'doppio'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>👥 Classifica Doppio</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeCategory === 'doppio' ? 'bg-orange-800 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {doppioCount}
          </span>
        </button>
      </div>

      {/* Banner Regolamento & Header */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100/50 to-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm shadow-slate-100/80 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-44 h-44 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <ClubLogo size="md" className="hidden sm:inline-flex mt-1" />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase border ${
                  activeCategory === 'maschile' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : activeCategory === 'femminile'
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}>
                  Classifica Mobile • {getCategoryLabel(activeCategory)}
                </span>
                <span className="text-xs text-slate-500">
                  Tennis Comunali Trissino • Live
                </span>
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
                Classifica {getCategoryLabel(activeCategory)}
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Classifica sociale a sfide dirette del Circolo Tennis Comunali Trissino. Ogni vittoria assegna punti in base alla differenza di posizione tra i due atleti.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              title="Esporta classifica in PDF"
            >
              <span>📄</span>
              <span>Esporta PDF</span>
            </button>

            <button
              onClick={() => setShowRulesModal(!showRulesModal)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <span className="text-orange-500">ℹ️</span>
              <span>Regole Punteggio</span>
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              title="Storico completo partite con filtri"
            >
              <span>📜</span>
              <span>Storico Partite</span>
            </button>

            {/* Azioni riservate SOLO all'Area Gestore */}
            {isAdmin && onOpenManagerArea && (
              <button
                onClick={onOpenManagerArea}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/10 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                Gestisci Sfide & Atleti
              </button>
            )}
          </div>
        </div>

        {/* Regolamento Punteggio Full Pop-up Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900">
                    Regolamento Punteggio • Classifica Mobile
                  </h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
                <p className="font-medium text-slate-600">
                  Il nostro circolo adotta un sistema di punteggio <strong>asimmetrico e meritocratico</strong>. 
                  È studiato per incoraggiare le sfide tra i soci e tutelare chi si trova in posizioni inferiori, 
                  premiando il coraggio delle sfide e riducendo il rischio quando si affrontano i favoriti in classifica.
                </p>

                {/* Formati di Gioco Consentiti */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                  <h4 className="font-display font-extrabold text-emerald-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                    🎾 Formati di Gioco Consentiti (Accordo tra i Partecipanti)
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    I partecipanti, accordandosi tra loro prima di ogni sfida, possono scegliere di disputare la partita in una delle seguenti due modalità:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-base">1️⃣</span>
                      <div>
                        <strong>Partita Classica:</strong> 2 set disputati integralmente con eventuale super tie-break al 10 nel terzo set.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base">2️⃣</span>
                      <div>
                        <strong>A Tempo (Giochi in un'ora):</strong> Si gioca per la durata di un'ora (60 minuti) e vince l'atleta che si è aggiudicato il maggior numero di giochi allo scadere del tempo.
                      </div>
                    </li>
                  </ul>
                  <p className="text-[11px] text-emerald-700 font-semibold italic pt-1">
                    💡 Indipendentemente dal formato scelto (Classico o a Tempo), i punti assegnati in classifica restano invariati e basati sulla differenza di ranking.
                  </p>
                </div>

                {/* 3 Casi Regolamento */}
                <div className="space-y-5">
                  
                  {/* Caso 1 */}
                  <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-4 space-y-2">
                    <h4 className="font-display font-extrabold text-orange-700 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      🔥 Caso 1: Vince lo Sfidante (Upset / Chi è sotto)
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Se compi l'impresa e sconfiggi un atleta posizionato sopra di te in classifica, ottieni un premio considerevole mentre il favorito subisce una penalità proporzionata:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700 pl-2">
                      <li className="flex justify-between items-center py-1 border-b border-orange-100/50">
                        <span>🎾 <strong>Piccola Sorpresa</strong> (avversario 1-2 posizioni sopra)</span>
                        <span className="font-black text-orange-600">+20 pt / -8 pt</span>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-orange-100/50">
                        <span>🎾 <strong>Grande Sorpresa</strong> (avversario 3-5 posizioni sopra)</span>
                        <span className="font-black text-orange-600">+30 pt / -12 pt</span>
                      </li>
                      <li className="flex justify-between items-center py-1">
                        <span>🎾 <strong>Impresa Epica</strong> (avversario 6+ posizioni sopra)</span>
                        <span className="font-black text-orange-600">+40 pt / -15 pt</span>
                      </li>
                    </ul>
                  </div>

                  {/* Caso 2 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      🏆 Caso 2: Vince il Favorito (Vittoria Attesa)
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Se l'incontro rispetta il pronostico e il favorito (posizionato sopra) si riconferma vincitore:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700 pl-2">
                      <li className="flex justify-between items-center py-1 border-b border-slate-200">
                        <span>🎾 <strong>Distacco Minimo</strong> (differenza da 1 a 3 posizioni)</span>
                        <span className="font-black text-slate-800">+15 pt / -3 pt</span>
                      </li>
                      <li className="flex justify-between items-center py-1">
                        <span>🎾 <strong>Distacco Ampio</strong> (differenza di 4 o più posizioni)</span>
                        <span className="font-black text-slate-800">+10 pt / -0 pt</span>
                      </li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic">
                      💡 Nota di tutela: Chi è sotto ed ha un ampio distacco (4+ posizioni) non perde nessun punto contro un avversario nettamente più forte.
                    </p>
                  </div>

                  {/* Caso 3 */}
                  <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 space-y-2">
                    <h4 className="font-display font-extrabold text-blue-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      🤝 Caso 3: Scontro alla Pari
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Se si affrontano giocatori con lo stesso ranking o a pari merito in classifica:
                    </p>
                    <div className="flex justify-between items-center text-xs text-slate-700 pt-1">
                      <span>🎾 <strong>Vittoria in Pari Classifica</strong></span>
                      <span className="font-black text-blue-600">+10 pt / -5 pt</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
                >
                  Ho capito, Chiudi Regolamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Storico Partite Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900">
                    Storico Partite • Archivio Risultati ({filteredHistoryMatches.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Name */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca per nome atleta..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Category / Gender Filter */}
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 cursor-pointer font-semibold"
                >
                  <option value="all">Tutte le categorie</option>
                  <option value="maschile">Singolare Maschile</option>
                  <option value="femminile">Singolare Femminile</option>
                  <option value="doppio">Classifica Doppio</option>
                </select>

                {/* Date Filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 cursor-pointer"
                  />
                  {historyDateFilter && (
                    <button
                      onClick={() => setHistoryDateFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                      title="Annulla data"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Match List */}
              <div className="p-6 overflow-y-auto space-y-3 max-h-[60vh]">
                {filteredHistoryMatches.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <span className="text-3xl">🎾</span>
                    <p className="text-sm font-medium">Nessuna partita trovata con i filtri selezionati.</p>
                  </div>
                ) : (
                  filteredHistoryMatches.map(m => {
                    const isP1Winner = m.winnerId === m.player1Id;
                    const dateFormatted = new Date(m.date).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <span className="font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            {m.category === 'maschile' ? 'Sing. Maschile' : m.category === 'femminile' ? 'Sing. Femminile' : 'Doppio'} {m.matchType === 'timed' ? '• ⏱️ A Tempo (1h)' : '• 🎾 Classica'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>📅</span> {dateFormatted} {m.court ? `• ${m.court}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          {/* Player 1 */}
                          <div className={`flex-1 text-left ${isP1Winner ? 'font-black text-slate-900' : 'text-slate-600'}`}>
                            <div className="flex items-center gap-1.5">
                              {isP1Winner && <span className="text-amber-500">🏆</span>}
                              <span className="text-sm">{m.player1Name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">(#{m.player1RankAtMatch})</span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="px-3 py-1 bg-slate-100 rounded-xl font-mono font-bold text-slate-800 text-sm border border-slate-200">
                            {m.score}
                          </div>

                          {/* Player 2 */}
                          <div className={`flex-1 text-right ${!isP1Winner ? 'font-black text-slate-900' : 'text-slate-600'}`}>
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[11px] text-slate-400 font-normal">(#{m.player2RankAtMatch})</span>
                              <span className="text-sm">{m.player2Name}</span>
                              {!isP1Winner && <span className="text-amber-500">🏆</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <span>🎯 Regola: <strong>{m.ruleApplied}</strong></span>
                          <span className="text-emerald-600 font-bold">+{m.pointsAwardedWinner} pt vincitore</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Totale partite in archivio: <strong>{rankingMatches.length}</strong>
                </span>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  Chiudi Archivio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State per la Categoria */}
      {categoryPlayers.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <ClubLogo size="xl" className="mx-auto" />
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
              Nessun atleta in classifica per {getCategoryLabel(activeCategory)}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isAdmin 
                ? `Accedi all'Area Gestore per tesserare gli atleti per la categoria ${getCategoryLabel(activeCategory)} e registrare le prime partite.`
                : `La classifica ufficiale di Tennis Comunali Trissino per ${getCategoryLabel(activeCategory)} verrà aggiornata dalla direzione del circolo appena verranno disputate le prime sfide.`}
            </p>
          </div>
          {isAdmin && onOpenManagerArea && (
            <button
              onClick={onOpenManagerArea}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              Apri Area Gestore ({getCategoryLabel(activeCategory)})
            </button>
          )}
        </div>
      )}



      {/* Barra di ricerca e filtri */}
      {categoryPlayers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Cerca in ${getCategoryLabel(activeCategory)}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

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
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFitRating('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFitRating === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tutti ({categoryPlayers.length})
            </button>
            <button
              onClick={() => setSelectedFitRating('3cat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFitRating === '3cat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              3ª Categoria
            </button>
            <button
              onClick={() => setSelectedFitRating('4cat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFitRating === '4cat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              4ª Categoria
            </button>
            <button
              onClick={() => setSelectedFitRating('nc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFitRating === 'nc'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              NC (Non Classificati)
            </button>
          </div>
        </div>
      )}

      {/* Tabella Classifica Mobile per Categoria */}
      {categoryPlayers.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm shadow-slate-100/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-center w-16">Pos.</th>
                  <th scope="col" className="px-3 py-3.5 text-center w-14">Var.</th>
                  <th scope="col" className="px-4 py-3.5">
                    {activeCategory === 'doppio' ? 'Coppia di Doppio' : 'Giocatore'}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">Età / Sesso</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Class. FITP</th>
                  <th scope="col" className="px-4 py-3.5 text-right font-black text-orange-600">Punti</th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden md:table-cell">Partite</th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden md:table-cell">V - P</th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden sm:table-cell">Win %</th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden lg:table-cell">Striscia</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Dettagli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-slate-400">
                      Nessun giocatore trovato con questi filtri.
                    </td>
                  </tr>
                ) : (
                  displayedPlayers.map((player) => {
                    const prev = player.previousRank || player.rank;
                    const diff = prev - player.rank;
                    const winRate = player.matchesPlayed > 0 
                      ? Math.round((player.matchesWon / player.matchesPlayed) * 100) 
                      : 0;
                    const playerAge = calculateAge(player.birthDate);
                    const partnerAge = player.category === 'doppio' ? calculateAge(player.partnerBirthDate) : null;
                    const genderBadge = player.gender || (activeCategory === 'femminile' ? 'F' : 'M');

                    return (
                      <tr 
                        key={player.id}
                        onClick={() => onSelectPlayer(player.id)}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors group animate-fadeIn"
                      >
                        {/* Posizione nella Categoria */}
                        <td className="px-4 py-3.5 text-center font-display font-black text-base">
                          {player.rank === 1 && <span className="text-amber-500">1°</span>}
                          {player.rank === 2 && <span className="text-slate-400">2°</span>}
                          {player.rank === 3 && <span className="text-amber-700">3°</span>}
                          {player.rank > 3 && <span className="text-slate-500">{player.rank}°</span>}
                        </td>

                        {/* Variazione */}
                        <td className="px-3 py-3.5 text-center">
                          {diff > 0 && (
                            <span className="inline-flex items-center text-emerald-600 text-xs font-bold" title={`Salito di ${diff} posizioni`}>
                              <ArrowUp className="w-3.5 h-3.5 animate-pulse" />
                              +{diff}
                            </span>
                          )}
                          {diff < 0 && (
                            <span className="inline-flex items-center text-rose-600 text-xs font-bold" title={`Sceso di ${Math.abs(diff)} posizioni`}>
                              <ArrowDown className="w-3.5 h-3.5" />
                              {diff}
                            </span>
                          )}
                          {diff === 0 && (
                            <span className="inline-flex items-center text-slate-400 text-xs font-medium" title="Posizione stabile">
                              <Minus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        {/* Giocatore / Coppia */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${
                              activeCategory === 'femminile' 
                                ? 'bg-rose-500' 
                                : activeCategory === 'doppio' 
                                ? 'bg-orange-500' 
                                : (player.avatarColor || 'bg-blue-600')
                            } text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}>
                              {activeCategory === 'doppio' ? '👥' : player.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block">
                                {player.name}
                                {player.partnerName && (
                                  <span className="text-xs font-normal text-slate-500 ml-1">
                                    / {player.partnerName}
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-500 block sm:hidden">
                                {genderBadge} {playerAge !== null ? `• ${playerAge} anni` : ''} • FITP {player.fitRating || 'NC'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Età / Sesso */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                                genderBadge === 'F' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                              }`}>
                                {genderBadge}
                              </span>
                              {playerAge !== null ? (
                                <span className="font-bold text-xs text-slate-700 whitespace-nowrap">
                                  {playerAge} <span className="text-[10px] text-slate-500 font-normal">anni</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">-</span>
                              )}
                            </div>
                            {activeCategory === 'doppio' && player.partnerName && (
                              <div className="text-[10px] text-orange-600 flex items-center gap-1">
                                <span className="text-slate-500 text-[9px]">P:</span>
                                {player.partnerGender && (
                                  <span className={`px-1 rounded font-bold text-[9px] ${
                                    player.partnerGender === 'F' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                  }`}>
                                    {player.partnerGender}
                                  </span>
                                )}
                                <span>{partnerAge !== null ? `${partnerAge}a` : '-'}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Classifica FITP */}
                        <td className="px-3 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80">
                            {player.fitRating || 'NC'}
                          </span>
                        </td>

                        {/* Punti Classifica Mobile */}
                        <td className="px-4 py-3.5 text-right font-display font-extrabold text-base text-orange-600">
                          {player.points} <span className="text-xs font-medium text-slate-500">pt</span>
                        </td>

                        {/* Partite */}
                        <td className="px-3 py-3.5 text-center hidden md:table-cell text-slate-700 font-medium">
                          {player.matchesPlayed}
                        </td>

                        {/* Vinte - Perse */}
                        <td className="px-3 py-3.5 text-center hidden md:table-cell text-xs">
                          <span className="text-emerald-600 font-bold">{player.matchesWon}</span>
                          <span className="text-slate-400 mx-1">-</span>
                          <span className="text-rose-600 font-bold">{player.matchesLost}</span>
                        </td>

                        {/* Win % */}
                        <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden lg:block">
                              <div 
                                className={`h-full rounded-full ${winRate >= 60 ? 'bg-emerald-500' : winRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${winRate}%` }} 
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">
                              {winRate}%
                            </span>
                          </div>
                        </td>

                        {/* Striscia */}
                        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
                          {player.currentStreak > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <Flame className="w-3 h-3 text-amber-500 animate-pulse" />
                              {player.currentStreak}V
                            </span>
                          ) : player.currentStreak < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/60">
                              {Math.abs(player.currentStreak)}P
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Dettagli */}
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPlayer(player.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Visualizza scheda profilo"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!showFullLadder && filteredPlayers.length > 5 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <button
                onClick={() => setShowFullLadder(true)}
                className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-md shadow-orange-500/25 transition-all hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>Classifica Completa ({filteredPlayers.length} giocatori)</span>
              </button>
            </div>
          )}

          {showFullLadder && filteredPlayers.length > 5 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <button
                onClick={() => setShowFullLadder(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Mostra solo i primi 5
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
