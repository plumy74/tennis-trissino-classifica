import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Swords, 
  Trophy, 
  Settings, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle, 
  Save, 
  ArrowRight, 
  Eye, 
  Award,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Player, PlayerCategory, Gender, RankingMatch, Tournament, TournamentMatch, ClubSettings, SetScore } from '../types/tennis';
import { calculateRankingPoints, calculateAge, formatBirthDate } from '../utils/scoring';
import confetti from 'canvas-confetti';
import { ClubLogo } from './ClubLogo';
import { SearchableSelect } from './SearchableSelect';

interface AdminManagerViewProps {
  players: Player[];
  rankingMatches: RankingMatch[];
  tournaments: Tournament[];
  tournamentMatches: TournamentMatch[];
  clubSettings: ClubSettings;
  onSaveClubSettings: (settings: ClubSettings) => Promise<void>;
  onAddPlayer: (player: Player) => Promise<void>;
  onUpdatePlayer: (player: Player) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onSaveRankingMatch: (match: RankingMatch, updatedPlayers: Player[]) => Promise<void>;
  onDeleteRankingMatch: (matchId: string) => Promise<void>;
  onOpenNewTournamentModal: () => void;
  onDeleteTournament: (tournamentId: string) => Promise<void>;
  onUpdateTournament?: (tournament: Tournament) => Promise<void>;
  onUpdateTournamentMatchScore: (
    matchId: string, 
    score: string, 
    winnerId: string, 
    winnerName: string,
    nextMatchId?: string | null,
    nextMatchSlot?: 'p1' | 'p2' | null
  ) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onExitAdmin: () => void;
  onViewPublicTab: (tab: 'ladder' | 'tournaments' | 'player' | 'noticeboard') => void;
  onRecalculateAllPlayerStats?: () => Promise<void>;
}

const FITP_RATINGS = [
  '4.NC', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1',
  '3.5', '3.4', '3.3', '3.2', '3.1',
  '2.8', '2.7', '2.6', '2.5', '2.4', '2.3', '2.2', '2.1', '1.0'
];

export const AdminManagerView: React.FC<AdminManagerViewProps> = ({
  players,
  rankingMatches,
  tournaments,
  tournamentMatches,
  clubSettings,
  onSaveClubSettings,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onSaveRankingMatch,
  onDeleteRankingMatch,
  onOpenNewTournamentModal,
  onDeleteTournament,
  onUpdateTournament,
  onUpdateTournamentMatchScore,
  onClearAllData,
  onExitAdmin,
  onViewPublicTab,
  onRecalculateAllPlayerStats
}) => {
  const [activeSection, setActiveSection] = useState<'players' | 'matches' | 'tournaments' | 'settings'>('players');

  // Counts per category
  const maschileCount = players.filter(p => (p.category || 'maschile') === 'maschile').length;
  const femminileCount = players.filter(p => p.category === 'femminile').length;
  const doppioCount = players.filter(p => p.category === 'doppio').length;

  // ==========================================
  // SECTION 1: PLAYER MANAGEMENT STATE
  // ==========================================
  const [playerCategoryFilter, setPlayerCategoryFilter] = useState<'all' | PlayerCategory>('all');
  const [newCategory, setNewCategory] = useState<PlayerCategory>('maschile');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('M');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newPartnerFirstName, setNewPartnerFirstName] = useState('');
  const [newPartnerLastName, setNewPartnerLastName] = useState('');
  const [newPartnerGender, setNewPartnerGender] = useState<Gender>('M');
  const [newPartnerBirthDate, setNewPartnerBirthDate] = useState('');
  const [newFitRating, setNewFitRating] = useState('4.NC');
  const [newInitialPoints, setNewInitialPoints] = useState(0);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [playerFormError, setPlayerFormError] = useState<string | null>(null);
  const [playerSuccessMsg, setPlayerSuccessMsg] = useState<string | null>(null);
  const [isNewPlayerModalOpen, setIsNewPlayerModalOpen] = useState(false);
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [matchListCategoryFilter, setMatchListCategoryFilter] = useState<'all' | 'maschile' | 'femminile' | 'doppio'>('all');
  const matchMaschileCount = rankingMatches.filter(m => m.category === 'maschile').length;
  const matchFemminileCount = rankingMatches.filter(m => m.category === 'femminile').length;
  const matchDoppioCount = rankingMatches.filter(m => m.category === 'doppio').length;
  const filteredRankingMatches = rankingMatches.filter(m => {
    if (matchListCategoryFilter === 'all') return true;
    return m.category === matchListCategoryFilter;
  });

  // ==========================================
  // SECTION 2: MATCH RECORDER STATE
  // ==========================================
  const [matchCategory, setMatchCategory] = useState<PlayerCategory>('maschile');
  const categoryAvailablePlayers = useMemo(() => {
    return players.filter(p => (p.category || 'maschile') === matchCategory);
  }, [players, matchCategory]);

  const [mPlayer1Id, setMPlayer1Id] = useState<string>('');
  const [mPlayer2Id, setMPlayer2Id] = useState<string>('');
  const [mSet1P1, setMSet1P1] = useState<number>(6);
  const [mSet1P2, setMSet1P2] = useState<number>(4);
  const [mSet2P1, setMSet2P1] = useState<number>(6);
  const [mSet2P2, setMSet2P2] = useState<number>(3);
  const [mHasSet3, setMHasSet3] = useState<boolean>(false);
  const [mIsDrawChecked, setMIsDrawChecked] = useState<boolean>(false);
  const [mSet3P1, setMSet3P1] = useState<number>(10);
  const [mSet3P2, setMSet3P2] = useState<number>(8);
  const [mMatchType, setMMatchType] = useState<'classic' | 'timed'>('classic');
  const [mTimedGamesP1, setMTimedGamesP1] = useState<number>(12);
  const [mTimedGamesP2, setMTimedGamesP2] = useState<number>(9);
  const [mCourt, setMCourt] = useState<string>('Campo 1 (Terra Rossa)');
  const [mNotes, setMNotes] = useState<string>('');
  const [matchSubmitting, setMatchSubmitting] = useState<boolean>(false);
  const [matchSuccessMsg, setMatchSuccessMsg] = useState<string | null>(null);
  const [matchErrorMsg, setMatchErrorMsg] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<RankingMatch | null>(null);

  // Sync selected players when matchCategory changes
  React.useEffect(() => {
    if (categoryAvailablePlayers.length >= 2) {
      setMPlayer1Id(categoryAvailablePlayers[0].id);
      setMPlayer2Id(categoryAvailablePlayers[1].id);
    } else if (categoryAvailablePlayers.length === 1) {
      setMPlayer1Id(categoryAvailablePlayers[0].id);
      setMPlayer2Id('');
    } else {
      setMPlayer1Id('');
      setMPlayer2Id('');
    }
  }, [categoryAvailablePlayers]);

  const p1 = players.find(p => p.id === mPlayer1Id);
  const p2 = players.find(p => p.id === mPlayer2Id);

  // Match score calculation
  const matchCalculation = useMemo(() => {
    let p1SetsWon = 0;
    let p2SetsWon = 0;

    const sets: SetScore[] = [];
    let formattedScore = '';
    let winnerId: string | null = null;
    let loserId: string | null = null;
    const isDrawMatch = (mMatchType === 'timed' && mTimedGamesP1 === mTimedGamesP2) || (mMatchType === 'classic' && mIsDrawChecked);

    if (mMatchType === 'classic') {
      sets.push({ p1: mSet1P1, p2: mSet1P2 });
      if (mSet1P1 > mSet1P2) p1SetsWon++;
      else if (mSet1P2 > mSet1P1) p2SetsWon++;

      sets.push({ p1: mSet2P1, p2: mSet2P2 });
      if (mSet2P1 > mSet2P2) p1SetsWon++;
      else if (mSet2P2 > mSet2P1) p2SetsWon++;

      if (mHasSet3) {
        sets.push({ p1: mSet3P1, p2: mSet3P2 });
        if (mSet3P1 > mSet3P2) p1SetsWon++;
        else if (mSet3P2 > mSet3P1) p2SetsWon++;
      }

      if (isDrawMatch) {
        winnerId = 'draw';
        loserId = 'draw';
      } else if (p1SetsWon > p2SetsWon) {
        winnerId = mPlayer1Id;
        loserId = mPlayer2Id;
      } else if (p2SetsWon > p1SetsWon) {
        winnerId = mPlayer2Id;
        loserId = mPlayer1Id;
      }

      const scoreParts = [`${mSet1P1}-${mSet1P2}`, `${mSet2P1}-${mSet2P2}`];
      if (mHasSet3) scoreParts.push(`${mSet3P1}-${mSet3P2}`);
      formattedScore = scoreParts.join(' ') + (isDrawMatch ? ' (Incomp./Par.)' : '');
    } else {
      sets.push({ p1: mTimedGamesP1, p2: mTimedGamesP2 });
      if (isDrawMatch) {
        winnerId = 'draw';
        loserId = 'draw';
      } else if (mTimedGamesP1 > mTimedGamesP2) {
        winnerId = mPlayer1Id;
        loserId = mPlayer2Id;
        p1SetsWon = 1;
      } else if (mTimedGamesP2 > mTimedGamesP1) {
        winnerId = mPlayer2Id;
        loserId = mPlayer1Id;
        p2SetsWon = 1;
      }
      formattedScore = `${mTimedGamesP1}-${mTimedGamesP2} (1h)` + (isDrawMatch ? ' (Par.)' : '');
    }

    let ruleInfo = null;
    if (isDrawMatch) {
      ruleInfo = {
        winnerPointsEarned: 5,
        loserPointsLost: 0,
        ruleDescription: 'Incontro terminato in Pareggio / Incompleto (+5 pt ciascuno)',
        rankDiff: 0,
        isHigherRank: false,
        isSameRank: true,
        isLowerRank: false
      };
    } else if (winnerId && loserId && p1 && p2) {
      const winner = winnerId === p1.id ? p1 : p2;
      const loser = loserId === p1.id ? p1 : p2;
      ruleInfo = calculateRankingPoints(winner.rank, loser.rank);
    }

    return {
      p1SetsWon,
      p2SetsWon,
      winnerId,
      loserId,
      formattedScore,
      setsList: sets,
      ruleInfo,
      isDraw: isDrawMatch
    };
  }, [mMatchType, mPlayer1Id, mPlayer2Id, mSet1P1, mSet1P2, mSet2P1, mSet2P2, mHasSet3, mSet3P1, mSet3P2, mTimedGamesP1, mTimedGamesP2, p1, p2, mIsDrawChecked]);

  // ==========================================
  // SECTION 3: TOURNAMENT MANAGEMENT STATE
  // ==========================================
  const [selectedTournId, setSelectedTournId] = useState<string>(tournaments[0]?.id || '');
  const activeTourn = tournaments.find(t => t.id === selectedTournId) || tournaments[0];
  const activeTournMatches = tournamentMatches.filter(m => m.tournamentId === activeTourn?.id);
  const [tournToDelete, setTournToDelete] = useState<Tournament | null>(null);
  
  // Score editing modal for tournament match
  const [editingTournMatch, setEditingTournMatch] = useState<TournamentMatch | null>(null);
  const [tournScoreInput, setTournScoreInput] = useState('6-3 6-4');
  const [tournWinnerId, setTournWinnerId] = useState('');

  // Stati per il punteggio dei set nel pop-up (come MatchRecorderModal)
  const [tSet1P1, setTSet1P1] = useState<number>(6);
  const [tSet1P2, setTSet1P2] = useState<number>(4);
  const [tSet2P1, setTSet2P1] = useState<number>(6);
  const [tSet2P2, setTSet2P2] = useState<number>(3);
  const [tHasSet3, setTHasSet3] = useState<boolean>(false);
  const [tSet3P1, setTSet3P1] = useState<number>(10);
  const [tSet3P2, setTSet3P2] = useState<number>(8);

  // Sincronizza vincitore e punteggio formattato quando cambiano i set
  useEffect(() => {
    if (!editingTournMatch) return;
    
    let p1SetsWon = 0;
    let p2SetsWon = 0;

    if (tSet1P1 > tSet1P2) p1SetsWon++;
    else if (tSet1P2 > tSet1P1) p2SetsWon++;

    if (tSet2P1 > tSet2P2) p1SetsWon++;
    else if (tSet2P2 > tSet2P1) p2SetsWon++;

    if (tHasSet3) {
      if (tSet3P1 > tSet3P2) p1SetsWon++;
      else if (tSet3P2 > tSet3P1) p2SetsWon++;
    }

    if (p1SetsWon > p2SetsWon) {
      setTournWinnerId(editingTournMatch.player1Id || '');
    } else if (p2SetsWon > p1SetsWon) {
      setTournWinnerId(editingTournMatch.player2Id || '');
    }

    const scoreParts = [`${tSet1P1}-${tSet1P2}`, `${tSet2P1}-${tSet2P2}`];
    if (tHasSet3) {
      scoreParts.push(`${tSet3P1}-${tSet3P2}`);
    }
    setTournScoreInput(scoreParts.join(' '));
  }, [tSet1P1, tSet1P2, tSet2P1, tSet2P2, tHasSet3, tSet3P1, tSet3P2, editingTournMatch]);

  // Edit modal states for Ranking Match
  const [editingRankingMatch, setEditingRankingMatch] = useState<RankingMatch | null>(null);
  const [isSavingEditedMatch, setIsSavingEditedMatch] = useState<boolean>(false);
  const [rMatchType, setRMatchType] = useState<'classic' | 'timed'>('classic');
  const [rSet1P1, setRSet1P1] = useState<number>(6);
  const [rSet1P2, setRSet1P2] = useState<number>(4);
  const [rSet2P1, setRSet2P1] = useState<number>(6);
  const [rSet2P2, setRSet2P2] = useState<number>(3);
  const [rHasSet3, setRHasSet3] = useState<boolean>(false);
  const [rSet3P1, setRSet3P1] = useState<number>(10);
  const [rSet3P2, setRSet3P2] = useState<number>(8);
  const [rTimedGamesP1, setRTimedGamesP1] = useState<number>(12);
  const [rTimedGamesP2, setRTimedGamesP2] = useState<number>(9);
  const [rCourt, setRCourt] = useState<string>('Campo 1 (Terra Rossa)');
  const [rNotes, setRNotes] = useState<string>('');
  const [rDateStr, setRDateStr] = useState<string>('');
  const [rWinnerId, setRWinnerId] = useState<string>('');
  const [rScore, setRScore] = useState<string>('');

  // Sincronizza vincitore e punteggio formattato della sfida
  useEffect(() => {
    if (!editingRankingMatch) return;
    
    if (rMatchType === 'classic') {
      let p1SetsWon = 0;
      let p2SetsWon = 0;

      if (rSet1P1 > rSet1P2) p1SetsWon++;
      else if (rSet1P2 > rSet1P1) p2SetsWon++;

      if (rSet2P1 > rSet2P2) p1SetsWon++;
      else if (rSet2P2 > rSet2P1) p2SetsWon++;

      if (rHasSet3) {
        if (rSet3P1 > rSet3P2) p1SetsWon++;
        else if (rSet3P2 > rSet3P1) p2SetsWon++;
      }

      if (p1SetsWon > p2SetsWon) {
        setRWinnerId(editingRankingMatch.player1Id);
      } else if (p2SetsWon > p1SetsWon) {
        setRWinnerId(editingRankingMatch.player2Id);
      }

      const scoreParts = [`${rSet1P1}-${rSet1P2}`, `${rSet2P1}-${rSet2P2}`];
      if (rHasSet3) {
        scoreParts.push(`${rSet3P1}-${rSet3P2}`);
      }
      setRScore(scoreParts.join(' '));
    } else {
      if (rTimedGamesP1 > rTimedGamesP2) {
        setRWinnerId(editingRankingMatch.player1Id);
      } else if (rTimedGamesP2 > rTimedGamesP1) {
        setRWinnerId(editingRankingMatch.player2Id);
      }
      setRScore(`${rTimedGamesP1}-${rTimedGamesP2} (1h)`);
    }
  }, [rMatchType, rSet1P1, rSet1P2, rSet2P1, rSet2P2, rHasSet3, rSet3P1, rSet3P2, rTimedGamesP1, rTimedGamesP2, editingRankingMatch]);

  // ==========================================
  // SECTION 4: CLUB SETTINGS STATE
  // ==========================================
  const [clubNameInput, setClubNameInput] = useState(clubSettings.clubName);
  const [seasonInput, setSeasonInput] = useState(clubSettings.season);
  const [announcementInput, setAnnouncementInput] = useState(clubSettings.announcement);
  const [adminPinInput, setAdminPinInput] = useState(clubSettings.adminPin);
  const [adminPin2Input, setAdminPin2Input] = useState(clubSettings.adminPin2 || '');
  const [logoUrlInput, setLogoUrlInput] = useState(clubSettings.logoUrl || '/logo.svg');
  const [cityInput, setCityInput] = useState(clubSettings.city || 'Trissino (VI)');
  const [addressInput, setAddressInput] = useState(clubSettings.address || 'Via Palladio, 24 - 36070 Trissino (VI)');
  const [phoneInput, setPhoneInput] = useState(clubSettings.phone || '+39 320 8080670');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [confirmClearText, setConfirmClearText] = useState('');

  // ==========================================
  // HANDLERS: PLAYERS
  // ==========================================
  const handleAddPlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerFormError(null);
    setPlayerSuccessMsg(null);

    if (!newFirstName.trim() || !newLastName.trim()) {
      setPlayerFormError('Inserisci sia il nome che il cognome del giocatore.');
      return;
    }

    if (newCategory === 'doppio' && (!newPartnerFirstName.trim() || !newPartnerLastName.trim())) {
      setPlayerFormError('Per la categoria Doppio è necessario inserire sia il nome che il cognome del compagno/partner.');
      return;
    }

    try {
      const fullName = `${newFirstName.trim()} ${newLastName.trim()}`;
      const partnerFullName = newCategory === 'doppio' 
        ? `${newPartnerFirstName.trim()} ${newPartnerLastName.trim()}`
        : undefined;

      const newPlayer: Player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: fullName,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        gender: newGender,
        birthDate: newBirthDate || undefined,
        category: newCategory,
        partnerName: partnerFullName,
        partnerFirstName: newCategory === 'doppio' ? newPartnerFirstName.trim() : undefined,
        partnerLastName: newCategory === 'doppio' ? newPartnerLastName.trim() : undefined,
        partnerGender: newCategory === 'doppio' ? newPartnerGender : undefined,
        partnerBirthDate: newCategory === 'doppio' ? (newPartnerBirthDate || undefined) : undefined,
        fitRating: newFitRating,
        points: Number(newInitialPoints) || 100,
        rank: 999, // will be auto-calculated
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        currentStreak: 0,
        bestStreak: 0,
        createdAt: new Date().toISOString()
      };

      await onAddPlayer(newPlayer);
      setIsNewPlayerModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewBirthDate('');
      setNewPartnerFirstName('');
      setNewPartnerLastName('');
      setNewPartnerBirthDate('');
      setNewPhone('');
      setNewEmail('');
      setPlayerSuccessMsg(`Atleta ${newPlayer.name} aggiunto con successo alla categoria ${newCategory.toUpperCase()}!`);
      setTimeout(() => setPlayerSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setPlayerFormError('Errore durante l\'aggiunta del giocatore. Riprova.');
    }
  };

  const handleStartEditPlayer = (player: Player) => {
    const parts = player.name.split(' ');
    const firstName = player.firstName || parts[0] || '';
    const lastName = player.lastName || parts.slice(1).join(' ') || '';
    
    let partnerFirstName = player.partnerFirstName || '';
    let partnerLastName = player.partnerLastName || '';
    if (player.category === 'doppio' && player.partnerName && (!partnerFirstName || !partnerLastName)) {
      const pParts = player.partnerName.split(' ');
      partnerFirstName = partnerFirstName || pParts[0] || '';
      partnerLastName = partnerLastName || pParts.slice(1).join(' ') || '';
    }

    setEditingPlayer({
      ...player,
      firstName,
      lastName,
      gender: player.gender || (player.category === 'femminile' ? 'F' : 'M'),
      birthDate: player.birthDate || '',
      partnerFirstName,
      partnerLastName,
      partnerGender: player.partnerGender || 'M',
      partnerBirthDate: player.partnerBirthDate || ''
    });
  };

  const handleUpdatePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    const fName = (editingPlayer.firstName || '').trim();
    const lName = (editingPlayer.lastName || '').trim();
    if (!fName || !lName) {
      setPlayerFormError('Inserisci sia il nome che il cognome del giocatore.');
      return;
    }

    const fullName = `${fName} ${lName}`;
    let partnerFullName = editingPlayer.partnerName;
    if (editingPlayer.category === 'doppio') {
      const pfName = (editingPlayer.partnerFirstName || '').trim();
      const plName = (editingPlayer.partnerLastName || '').trim();
      if (pfName && plName) {
        partnerFullName = `${pfName} ${plName}`;
      }
    }

    const updated: Player = {
      ...editingPlayer,
      name: fullName,
      firstName: fName,
      lastName: lName,
      partnerName: partnerFullName,
      partnerFirstName: editingPlayer.partnerFirstName?.trim(),
      partnerLastName: editingPlayer.partnerLastName?.trim(),
      gender: editingPlayer.gender || 'M',
      birthDate: editingPlayer.birthDate || undefined,
      partnerGender: editingPlayer.category === 'doppio' ? (editingPlayer.partnerGender || 'M') : undefined,
      partnerBirthDate: editingPlayer.category === 'doppio' ? (editingPlayer.partnerBirthDate || undefined) : undefined,
      updatedAt: new Date().toISOString()
    };

    try {
      await onUpdatePlayer(updated);
      setEditingPlayer(null);
      setPlayerSuccessMsg(`Dati di ${fullName} aggiornati con successo.`);
      setTimeout(() => setPlayerSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setPlayerFormError('Errore durante l\'aggiornamento del giocatore.');
    }
  };

  const handleDeletePlayerConfirm = async () => {
    if (!playerToDelete) return;
    try {
      await onDeletePlayer(playerToDelete.id);
      setPlayerToDelete(null);
      setPlayerSuccessMsg('Giocatore eliminato e classifica ricalcolata.');
      setTimeout(() => setPlayerSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setPlayerFormError('Errore durante l\'eliminazione.');
    }
  };

  // ==========================================
  // HANDLERS: MATCH RECORDING
  // ==========================
  const handleSaveMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchErrorMsg(null);
    setMatchSuccessMsg(null);

    if (!p1 || !p2) {
      setMatchErrorMsg('Seleziona entrambi i contendenti.');
      return;
    }

    if (p1.id === p2.id) {
      setMatchErrorMsg('Seleziona due giocatori differenti.');
      return;
    }

    const isDraw = matchCalculation.isDraw;

    if (!isDraw && (!matchCalculation.winnerId || !matchCalculation.loserId || !matchCalculation.ruleInfo)) {
      setMatchErrorMsg('Il punteggio inserito non determina un vincitore univoco.');
      return;
    }

    try {
      setMatchSubmitting(true);
      const winnerId = isDraw ? 'draw' : matchCalculation.winnerId;
      const loserId = isDraw ? 'draw' : matchCalculation.loserId;
      const calc = matchCalculation.ruleInfo;

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newMatch: RankingMatch = {
        id: matchId,
        category: matchCategory,
        matchType: mMatchType,
        date: new Date().toISOString(),
        player1Id: p1.id,
        player1Name: p1.partnerName ? `${p1.name} / ${p1.partnerName}` : p1.name,
        player1RankAtMatch: p1.rank,
        player2Id: p2.id,
        player2Name: p2.partnerName ? `${p2.name} / ${p2.partnerName}` : p2.name,
        player2RankAtMatch: p2.rank,
        winnerId: winnerId as string,
        loserId: loserId as string,
        score: matchCalculation.formattedScore,
        sets: matchCalculation.setsList,
        pointsAwardedWinner: calc ? calc.winnerPointsEarned : 5,
        pointsDeductedLoser: calc ? calc.loserPointsLost : 0,
        ruleApplied: calc ? calc.ruleDescription : 'Incontro terminato in Pareggio (+5 pt ciascuno)',
        court: mCourt,
        notes: mNotes,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      // Aggiorna statistiche e punti dei due giocatori
      const p1SetsWon = matchCalculation.p1SetsWon;
      const p1SetsLost = matchCalculation.p2SetsWon;
      const p2SetsWon = matchCalculation.p2SetsWon;
      const p2SetsLost = matchCalculation.p1SetsWon;

      let p1GamesWon = 0;
      let p1GamesLost = 0;
      let p2GamesWon = 0;
      let p2GamesLost = 0;
      matchCalculation.setsList.forEach(s => {
        p1GamesWon += s.p1;
        p1GamesLost += s.p2;
        p2GamesWon += s.p2;
        p2GamesLost += s.p1;
      });

      let updatedP1: Player;
      let updatedP2: Player;

      if (isDraw) {
        updatedP1 = {
          ...p1,
          points: p1.points + 5,
          matchesPlayed: p1.matchesPlayed + 1,
          setsWon: p1.setsWon + p1SetsWon,
          setsLost: p1.setsLost + p1SetsLost,
          gamesWon: p1.gamesWon + p1GamesWon,
          gamesLost: p1.gamesLost + p1GamesLost,
          currentStreak: 0,
          updatedAt: new Date().toISOString()
        };

        updatedP2 = {
          ...p2,
          points: p2.points + 5,
          matchesPlayed: p2.matchesPlayed + 1,
          setsWon: p2.setsWon + p2SetsWon,
          setsLost: p2.setsLost + p2SetsLost,
          gamesWon: p2.gamesWon + p2GamesWon,
          gamesLost: p2.gamesLost + p2GamesLost,
          currentStreak: 0,
          updatedAt: new Date().toISOString()
        };
      } else {
        const isP1Winner = winnerId === p1.id;
        updatedP1 = {
          ...p1,
          points: isP1Winner ? p1.points + (calc ? calc.winnerPointsEarned : 15) : Math.max(0, p1.points - (calc ? calc.loserPointsLost : 5)),
          matchesPlayed: p1.matchesPlayed + 1,
          matchesWon: isP1Winner ? p1.matchesWon + 1 : p1.matchesWon,
          matchesLost: !isP1Winner ? p1.matchesLost + 1 : p1.matchesLost,
          setsWon: p1.setsWon + p1SetsWon,
          setsLost: p1.setsLost + p1SetsLost,
          gamesWon: p1.gamesWon + p1GamesWon,
          gamesLost: p1.gamesLost + p1GamesLost,
          currentStreak: isP1Winner ? (p1.currentStreak > 0 ? p1.currentStreak + 1 : 1) : (p1.currentStreak < 0 ? p1.currentStreak - 1 : -1),
          bestStreak: isP1Winner && p1.currentStreak + 1 > p1.bestStreak ? p1.currentStreak + 1 : p1.bestStreak,
          updatedAt: new Date().toISOString()
        };

        updatedP2 = {
          ...p2,
          points: !isP1Winner ? p2.points + (calc ? calc.winnerPointsEarned : 15) : Math.max(0, p2.points - (calc ? calc.loserPointsLost : 5)),
          matchesPlayed: p2.matchesPlayed + 1,
          matchesWon: !isP1Winner ? p2.matchesWon + 1 : p2.matchesWon,
          matchesLost: isP1Winner ? p2.matchesLost + 1 : p2.matchesLost,
          setsWon: p2.setsWon + p2SetsWon,
          setsLost: p2.setsLost + p2SetsLost,
          gamesWon: p2.gamesWon + p2GamesWon,
          gamesLost: p2.gamesLost + p2GamesLost,
          currentStreak: !isP1Winner ? (p2.currentStreak > 0 ? p2.currentStreak + 1 : 1) : (p2.currentStreak < 0 ? p2.currentStreak - 1 : -1),
          bestStreak: !isP1Winner && p2.currentStreak + 1 > p2.bestStreak ? p2.currentStreak + 1 : p2.bestStreak,
          updatedAt: new Date().toISOString()
        };
      }

      const otherPlayers = players.filter(p => p.id !== p1.id && p.id !== p2.id);
      await onSaveRankingMatch(newMatch, [...otherPlayers, updatedP1, updatedP2]);

      setIsNewMatchModalOpen(false);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      if (isDraw) {
        setMatchSuccessMsg('Incontro terminato in Pareggio registrato con successo! (+5 pt ciascuno). Classifica aggiornata.');
      } else {
        const winner = winnerId === p1.id ? p1 : p2;
        setMatchSuccessMsg(`Partita registrata con successo! Vincitore: ${winner.name} (+${calc ? calc.winnerPointsEarned : 15} pt). Classifica aggiornata.`);
      }
      setMNotes('');
      setTimeout(() => setMatchSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setMatchErrorMsg('Errore salvataggio partita.');
    } finally {
      setMatchSubmitting(false);
    }
  };

  const handleSaveEditedRankingMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRankingMatch || !rWinnerId) return;

    try {
      setIsSavingEditedMatch(true);

      const wRank = rWinnerId === editingRankingMatch.player1Id ? editingRankingMatch.player1RankAtMatch : editingRankingMatch.player2RankAtMatch;
      const lRank = rWinnerId === editingRankingMatch.player1Id ? editingRankingMatch.player2RankAtMatch : editingRankingMatch.player1RankAtMatch;
      
      const calc = calculateRankingPoints(wRank, lRank);

      let setsList: SetScore[] = [];
      let finalScore = '';

      if (rMatchType === 'classic') {
        setsList = [
          { p1: rSet1P1, p2: rSet1P2 },
          { p1: rSet2P1, p2: rSet2P2 }
        ];
        if (rHasSet3) {
          setsList.push({ p1: rSet3P1, p2: rSet3P2 });
        }
        const scoreParts = [`${rSet1P1}-${rSet1P2}`, `${rSet2P1}-${rSet2P2}`];
        if (rHasSet3) scoreParts.push(`${rSet3P1}-${rSet3P2}`);
        finalScore = scoreParts.join(' ');
      } else {
        setsList = [{ p1: rTimedGamesP1, p2: rTimedGamesP2 }];
        finalScore = `${rTimedGamesP1}-${rTimedGamesP2} (1h)`;
      }

      const editedMatch: RankingMatch = {
        ...editingRankingMatch,
        matchType: rMatchType,
        date: new Date(rDateStr).toISOString(),
        winnerId: rWinnerId,
        loserId: rWinnerId === editingRankingMatch.player1Id ? editingRankingMatch.player2Id : editingRankingMatch.player1Id,
        score: finalScore,
        sets: setsList,
        pointsAwardedWinner: calc.winnerPointsEarned,
        pointsDeductedLoser: calc.loserPointsLost,
        ruleApplied: calc.ruleDescription,
        court: rCourt,
        notes: rNotes,
      };

      await onSaveRankingMatch(editedMatch, []);
      setEditingRankingMatch(null);
      setMatchSuccessMsg('Sfida modificata e classifica ricalcolata.');
      setTimeout(() => setMatchSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Errore durante la modifica della sfida:', err);
      alert('Impossibile salvare la modifica.');
    } finally {
      setIsSavingEditedMatch(false);
    }
  };

  const handleDeleteRankingMatchConfirm = async () => {
    if (!matchToDelete) return;
    try {
      await onDeleteRankingMatch(matchToDelete.id);
      setMatchToDelete(null);
      setMatchSuccessMsg('Sfida eliminata e classifica ricalcolata.');
      setTimeout(() => setMatchSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setMatchErrorMsg('Errore eliminazione sfida.');
    }
  };

  // ==========================================
  // HANDLERS: TOURNAMENTS
  // ==========================================
  const handleSaveTournScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournMatch || !tournWinnerId) return;

    try {
      const winnerName = tournWinnerId === editingTournMatch.player1Id 
        ? editingTournMatch.player1Name 
        : editingTournMatch.player2Name;

      await onUpdateTournamentMatchScore(
        editingTournMatch.id,
        tournScoreInput,
        tournWinnerId,
        winnerName,
        editingTournMatch.nextMatchId,
        editingTournMatch.nextMatchSlot
      );

      if (editingTournMatch.roundName.toLowerCase().includes('finale') && !editingTournMatch.roundName.toLowerCase().includes('semi')) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }

      setEditingTournMatch(null);
    } catch (err) {
      console.error(err);
      alert('Errore aggiornamento punteggio torneo.');
    }
  };

  const handleDeleteTournConfirm = async () => {
    if (!tournToDelete) return;
    try {
      await onDeleteTournament(tournToDelete.id);
      setTournToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Errore eliminazione torneo.');
    }
  };

  // Modifica Nome Torneo State & Handler
  const [editingTournName, setEditingTournName] = useState<Tournament | null>(null);
  const [newTournNameInput, setNewTournNameInput] = useState<string>('');
  const [isSavingTournName, setIsSavingTournName] = useState<boolean>(false);

  const handleSaveTournNameConfirm = async () => {
    if (!editingTournName || !newTournNameInput.trim() || !onUpdateTournament) return;
    try {
      setIsSavingTournName(true);
      await onUpdateTournament({
        ...editingTournName,
        name: newTournNameInput.trim()
      });
      setEditingTournName(null);
    } catch (err) {
      console.error(err);
      alert('Errore modifica nome torneo.');
    } finally {
      setIsSavingTournName(false);
    }
  };

  // ==========================================
  // HANDLERS: SETTINGS & DATABASE PURGE
  // ==========================================
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveClubSettings({
        ...clubSettings,
        clubName: clubNameInput.trim() || 'Tennis Comunali Trissino',
        season: seasonInput.trim() || 'Stagione 2026',
        announcement: announcementInput.trim(),
        adminPin: adminPinInput.trim() || '1234',
        adminPin2: adminPin2Input.trim() || '',
        city: cityInput.trim() || 'Trissino (VI)',
        address: addressInput.trim() || 'Via Palladio, 24 - 36070 Trissino (VI)',
        phone: phoneInput.trim() || '+39 320 8080670',
        logoUrl: logoUrlInput.trim() || '/logo.svg'
      });
      setSettingsSuccessMsg('Impostazioni di Tennis Comunali Trissino salvate con successo!');
      setTimeout(() => setSettingsSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Errore salvataggio impostazioni.');
    }
  };

  const handleClearDatabaseExecute = async () => {
    if (confirmClearText.toUpperCase() !== 'CANCELLA') {
      alert('Digita CANCELLA per confermare.');
      return;
    }
    try {
      await onClearAllData();
      setShowClearConfirmModal(false);
      setConfirmClearText('');
      setSettingsSuccessMsg('Tutti i dati sono stati eliminati. Database azzerato.');
      setTimeout(() => setSettingsSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Errore azzeramento database.');
    }
  };

  const filteredPlayersList = players.filter(p => {
    if (playerCategoryFilter === 'all') return true;
    return (p.category || 'maschile') === playerCategoryFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Manager Banner */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-100/50 to-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm shadow-slate-100/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <ClubLogo size="lg" customUrl={clubSettings.logoUrl} className="shrink-0 hidden sm:inline-flex mt-1" />
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-orange-500/30">
                  <ShieldCheck className="w-4 h-4" />
                  Area Riservata Gestore
                </span>
                <span className="text-xs text-orange-600 font-semibold">
                  Tennis Comunali Trissino
                </span>
              </div>
              
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900">
                Pannello Gestore Circolo
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Qui effettui tutti gli inserimenti e le modifiche: tesseramento giocatori per categoria, registrazione risultati sfide con calcolo punteggio, organizzazione tornei sociali e impostazioni circolo.
              </p>
            </div>
          </div>

          {/* Quick Exit or Switch to Public View */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => onViewPublicTab('ladder')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
              title="Visualizza l'applicazione come appare ai soci e al pubblico"
            >
              <Eye className="w-4 h-4 text-orange-500" />
              <span>Anteprima Pubblica</span>
            </button>
            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Esci da Gestore</span>
            </button>
          </div>
        </div>

        {/* Quick Statistics Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm shadow-slate-100/50">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">🎾 Maschile</span>
            <span className="text-2xl font-black text-slate-900">{maschileCount}</span>
            <span className="text-[11px] text-slate-500 block">iscritti</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm shadow-slate-100/50">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">🎾 Femminile</span>
            <span className="text-2xl font-black text-slate-900">{femminileCount}</span>
            <span className="text-[11px] text-slate-500 block">iscritte</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm shadow-slate-100/50">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">⚔️ Sfide Registrate</span>
            <span className="text-2xl font-black text-slate-900">{rankingMatches.length}</span>
            <span className="text-[11px] text-slate-500 block">partite</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm shadow-slate-100/50">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">🏆 Tornei Sociali</span>
            <span className="text-2xl font-black text-slate-900">{tournaments.length}</span>
            <span className="text-[11px] text-slate-500 block">creati</span>
          </div>
        </div>
      </div>

      {/* Internal Navigation for Area Gestore */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm shadow-slate-100">
        <button
          onClick={() => setActiveSection('players')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'players'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. Atleti & Coppie ({players.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('matches')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'matches'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>2. Registra Risultato Sfida</span>
        </button>

        <button
          onClick={() => setActiveSection('tournaments')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'tournaments'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>3. Tornei Sociali ({tournaments.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'settings'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>4. Impostazioni Circolo & Reset</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: GESTIONE ATLETI & COPPIE                                       */}
      {/* ========================================================================= */}
      {activeSection === 'players' && (
        <div className="space-y-6">
          {/* Top Action Bar for Atleti */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                Gestione Atleti & Coppie ({players.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggiungi nuovi atleti, gestisci le classifiche FITP e monitora le coppie di doppio.
              </p>
            </div>
            <button
              onClick={() => setIsNewPlayerModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuovo Giocatore / Coppia</span>
            </button>
          </div>

          {/* Modal Inserimento Nuovo Atleta o Coppia */}
          {isNewPlayerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-black text-lg text-white">
                      Inserisci Nuovo Atleta o Coppia
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsNewPlayerModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  {playerFormError && (
                    <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{playerFormError}</span>
                    </div>
                  )}

                  {playerSuccessMsg && (
                    <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2 font-medium">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{playerSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddPlayerSubmit} className="space-y-5">
                    {/* Category Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                        Categoria di Classifica *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setNewCategory('maschile');
                            setNewGender('M');
                          }}
                          className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            newCategory === 'maschile'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>🎾 Singolare Maschile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewCategory('femminile');
                            setNewGender('F');
                          }}
                          className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            newCategory === 'femminile'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>🎾 Singolare Femminile</span>
                        </button>
                      </div>
                    </div>

                    {/* Anagrafica Atleta: Nome, Cognome, Sesso, Data di Nascita ed Età */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400" />
                          {newCategory === 'doppio' ? 'Dati Atleta 1 (Capitano Coppia)' : 'Dati Anagrafici Giocatore'}
                        </span>
                        {newBirthDate && calculateAge(newBirthDate) !== null && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Età: {calculateAge(newBirthDate)} anni
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Nome */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            Nome *
                          </label>
                          <input
                            type="text"
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                            placeholder="es. Mario"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>

                        {/* Cognome */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            Cognome *
                          </label>
                          <input
                            type="text"
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                            placeholder="es. Rossi"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>

                        {/* Sesso */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            Sesso *
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setNewGender('M')}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                newGender === 'M'
                                  ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>Maschio (M)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewGender('F')}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                newGender === 'F'
                                  ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>Femmina (F)</span>
                            </button>
                          </div>
                        </div>

                        {/* Data di Nascita */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            Data di Nascita *
                          </label>
                          <input
                            type="date"
                            value={newBirthDate}
                            onChange={(e) => setNewBirthDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dati Partner se Categoria Doppio */}
                    {newCategory === 'doppio' && (
                      <div className="bg-indigo-950/20 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            Dati Compagno di Doppio (Partner)
                          </span>
                          {newPartnerBirthDate && calculateAge(newPartnerBirthDate) !== null && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              Età: {calculateAge(newPartnerBirthDate)} anni
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Nome Partner */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">
                              Nome Partner *
                            </label>
                            <input
                              type="text"
                              value={newPartnerFirstName}
                              onChange={(e) => setNewPartnerFirstName(e.target.value)}
                              placeholder="es. Luigi"
                              required
                              className="w-full px-3.5 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-400 font-medium"
                            />
                          </div>

                          {/* Cognome Partner */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">
                              Cognome Partner *
                            </label>
                            <input
                              type="text"
                              value={newPartnerLastName}
                              onChange={(e) => setNewPartnerLastName(e.target.value)}
                              placeholder="es. Bianchi"
                              required
                              className="w-full px-3.5 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-400 font-medium"
                            />
                          </div>

                          {/* Sesso Partner */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">
                              Sesso Partner *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setNewPartnerGender('M')}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  newPartnerGender === 'M'
                                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span>Maschio (M)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewPartnerGender('F')}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  newPartnerGender === 'F'
                                    ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span>Femmina (F)</span>
                              </button>
                            </div>
                          </div>

                          {/* Data di Nascita Partner */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">
                              Data di Nascita Partner
                            </label>
                            <input
                              type="date"
                              value={newPartnerBirthDate}
                              onChange={(e) => setNewPartnerBirthDate(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Classifica FITP e Punti */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Classifica FITP Ufficiale
                        </label>
                        <select
                          value={newFitRating}
                          onChange={(e) => setNewFitRating(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                        >
                          {FITP_RATINGS.map(r => (
                            <option key={r} value={r}>
                              FITP {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Punti Iniziali Classifica
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5000"
                          value={newInitialPoints}
                          onChange={(e) => setNewInitialPoints(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[11px] text-slate-500 block">Default consigliato: 100 pt</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Telefono (opzionale)
                        </label>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="340 1234567"
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Email (opzionale)
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="atleta@email.it"
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsNewPlayerModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Aggiungi Giocatore / Coppia</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Elenco e Gestione Atleti Registrati */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white">
                  Atleti e Coppie Registrati ({players.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Gestione anagrafica, modifica punti FITP ed eliminazione
                </p>
              </div>

              {/* Filtro per categoria */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setPlayerCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    playerCategoryFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tutti ({players.length})
                </button>
                <button
                  onClick={() => setPlayerCategoryFilter('maschile')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    playerCategoryFilter === 'maschile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Maschile ({maschileCount})
                </button>
                <button
                  onClick={() => setPlayerCategoryFilter('femminile')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    playerCategoryFilter === 'femminile' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Femminile ({femminileCount})
                </button>
              </div>
            </div>

            {filteredPlayersList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nessun atleta registrato in questa categoria. Usa il form sopra per inserire i tuoi atleti.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold">
                      <th className="py-3 px-3">Pos.</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-3">Atleta / Coppia</th>
                      <th className="py-3 px-3 text-center">Sesso</th>
                      <th className="py-3 px-3">Data Nascita & Età</th>
                      <th className="py-3 px-3">FITP</th>
                      <th className="py-3 px-3">Punti</th>
                      <th className="py-3 px-3">Record (V/P)</th>
                      <th className="py-3 px-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredPlayersList.map(player => {
                      const pAge = calculateAge(player.birthDate);
                      const partnerAge = player.category === 'doppio' ? calculateAge(player.partnerBirthDate) : null;
                      return (
                        <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-display font-black text-amber-400">#{player.rank}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              player.category === 'maschile'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : player.category === 'femminile'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}>
                              {player.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-white font-bold">
                            <div className="flex items-center gap-1.5">
                              <span>{player.name}</span>
                            </div>
                            {player.partnerName && (
                              <span className="text-xs font-normal text-indigo-300 block">
                                / {player.partnerName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                              player.gender === 'F' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {player.gender || (player.category === 'femminile' ? 'F' : 'M')}
                            </span>
                            {player.category === 'doppio' && player.partnerGender && (
                              <span className={`ml-1 px-2 py-0.5 rounded font-black text-[11px] ${
                                player.partnerGender === 'F' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                / {player.partnerGender}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              {pAge !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {pAge} anni
                                  </span>
                                  {player.birthDate && (
                                    <span className="text-[11px] text-slate-400">
                                      ({formatBirthDate(player.birthDate)})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">Non inserita</span>
                              )}
                              {player.category === 'doppio' && (
                                <div className="text-[11px] text-indigo-300 pt-0.5">
                                  {partnerAge !== null ? `Partner: ${partnerAge} anni` : 'Partner: età n.d.'}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {player.fitRating || 'NC'}
                          </td>
                          <td className="py-3 px-3 text-emerald-400 font-extrabold text-base">
                            {player.points} pt
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {player.matchesWon}V - {player.matchesLost}P ({player.matchesPlayed} tot)
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditPlayer(player)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Modifica dati atleta"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setPlayerToDelete(player)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition-colors"
                                title="Elimina atleta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: REGISTRAZIONE RISULTATO SFIDA                                   */}
      {/* ========================================================================= */}
      {activeSection === 'matches' && (
        <div className="space-y-6">
          {/* Top Action Bar for Matches */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                Gestione Sfide & Risultati
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Registra nuove partite o consulta lo storico delle sfide di classifica.
              </p>
            </div>
            <button
              onClick={() => setIsNewMatchModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registra Partita</span>
            </button>
          </div>

          {/* Modal Registrazione Nuova Partita */}
          {isNewMatchModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Swords className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-black text-lg text-white">
                      Registra Risultato Sfida (Classifica Mobile)
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsNewMatchModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                  {matchErrorMsg && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{matchErrorMsg}</span>
              </div>
            )}

            {matchSuccessMsg && (
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{matchSuccessMsg}</span>
              </div>
            )}

            {/* Scelta Categoria Sfida */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Seleziona Categoria della Sfida *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMatchCategory('maschile')}
                  className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    matchCategory === 'maschile'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🎾 Singolare Maschile ({maschileCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchCategory('femminile')}
                  className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    matchCategory === 'femminile'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🎾 Singolare Femminile ({femminileCount})</span>
                </button>
              </div>
            </div>

            {categoryAvailablePlayers.length < 2 ? (
              <div className="p-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Per registrare una sfida nella categoria <strong>{matchCategory.toUpperCase()}</strong> servono almeno 2 atleti registrati.
                  Attualmente ce ne sono {categoryAvailablePlayers.length}.
                </p>
                <button
                  onClick={() => setActiveSection('players')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Vai alla sezione 1. Atleti per inserirli
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveMatchSubmit} className="space-y-6">
                {/* Selezione Giocatori */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Player 1 */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Giocatore 1 / Coppia 1 *
                    </label>
                    <SearchableSelect
                      options={categoryAvailablePlayers.map(p => {
                        const age = calculateAge(p.birthDate);
                        const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                        return {
                          value: p.id,
                          label: `#${p.rank} - ${p.name} ${p.partnerName ? `/ ${p.partnerName}` : ''} ${age !== null ? `(${age} anni, ${genderBadge})` : `(${genderBadge})`} - ${p.points} pt`
                        };
                      })}
                      value={mPlayer1Id}
                      onChange={setMPlayer1Id}
                      placeholder="Seleziona giocatore 1..."
                      searchPlaceholder="Cerca atleta..."
                      className="w-full"
                    />

                    {p1 && (
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 gap-1.5 mt-2">
                        <span>Classifica: <strong className="text-amber-400">#{p1.rank}</strong> ({p1.points} pt)</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                            p1.gender === 'F' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {p1.gender === 'F' ? '♀ Femmina' : '♂ Maschio'}
                          </span>
                          {calculateAge(p1.birthDate) !== null ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                              Età: {calculateAge(p1.birthDate)} anni
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Età non specificata</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player 2 */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Giocatore 2 / Coppia 2 *
                    </label>
                    <SearchableSelect
                      options={categoryAvailablePlayers.map(p => {
                        const age = calculateAge(p.birthDate);
                        const genderBadge = p.gender || (p.category === 'femminile' ? 'F' : 'M');
                        return {
                          value: p.id,
                          label: `#${p.rank} - ${p.name} ${p.partnerName ? `/ ${p.partnerName}` : ''} ${age !== null ? `(${age} anni, ${genderBadge})` : `(${genderBadge})`} - ${p.points} pt`
                        };
                      })}
                      value={mPlayer2Id}
                      onChange={setMPlayer2Id}
                      placeholder="Seleziona giocatore 2..."
                      searchPlaceholder="Cerca atleta..."
                      className="w-full"
                    />

                    {p2 && (
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 gap-1.5 mt-2">
                        <span>Classifica: <strong className="text-amber-400">#{p2.rank}</strong> ({p2.points} pt)</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                            p2.gender === 'F' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {p2.gender === 'F' ? '♀ Femmina' : '♂ Maschio'}
                          </span>
                          {calculateAge(p2.birthDate) !== null ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                              Età: {calculateAge(p2.birthDate)} anni
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Età non specificata</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confronto Età Avversari */}
                {p1 && p2 && p1.id !== p2.id && calculateAge(p1.birthDate) !== null && calculateAge(p2.birthDate) !== null && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎂 Confronto Età Contendenti:</span>
                    </span>
                    <div className="text-slate-200">
                      {calculateAge(p1.birthDate) === calculateAge(p2.birthDate) ? (
                        <span className="text-emerald-400 font-bold">Stessa età ({calculateAge(p1.birthDate)} anni - Coetanei)</span>
                      ) : calculateAge(p1.birthDate)! > calculateAge(p2.birthDate)! ? (
                        <span>
                          <strong>{p1.name}</strong> ({calculateAge(p1.birthDate)}a) ha <strong className="text-amber-400">+{calculateAge(p1.birthDate)! - calculateAge(p2.birthDate)!} anni</strong> rispetto a <strong>{p2.name}</strong> ({calculateAge(p2.birthDate)}a)
                        </span>
                      ) : (
                        <span>
                          <strong>{p2.name}</strong> ({calculateAge(p2.birthDate)}a) ha <strong className="text-amber-400">+{calculateAge(p2.birthDate)! - calculateAge(p1.birthDate)!} anni</strong> rispetto a <strong>{p1.name}</strong> ({calculateAge(p1.birthDate)}a)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Score inputs */}
                {/* Formato Partita */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    2. Formato Partita *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMMatchType('classic')}
                      className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                        mMatchType === 'classic'
                          ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎾</span>
                      <span>Partita Classica (2 Set + TB)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMMatchType('timed')}
                      className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                        mMatchType === 'timed'
                          ? 'bg-orange-500/25 border-orange-500 text-orange-300 shadow-md shadow-orange-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⏱️</span>
                      <span>Più giochi in un'ora</span>
                    </button>
                  </div>
                </div>

                {/* Timed Match Input */}
                {mMatchType === 'timed' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block text-center">
                      Totale Giochi vinti in 1 Ora (60 min)
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-400 truncate max-w-[140px]" title={p1 ? p1.name : 'Giocatore 1'}>
                        {p1 ? p1.name.split(' ')[0] : 'Giocatore 1'}
                      </span>
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={mTimedGamesP1}
                          onChange={(e) => setMTimedGamesP1(parseInt(e.target.value) || 0)}
                          className="w-16 text-center py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-xl"
                        />
                        <span className="text-slate-500 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={mTimedGamesP2}
                          onChange={(e) => setMTimedGamesP2(parseInt(e.target.value) || 0)}
                          className="w-16 text-center py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-xl"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 truncate max-w-[140px] text-right" title={p2 ? p2.name : 'Giocatore 2'}>
                        {p2 ? p2.name.split(' ')[0] : 'Giocatore 2'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic text-center pt-1">
                      ⏱️ Vince l'atleta che si è aggiudicato più giochi allo scadere dei 60 minuti.
                    </p>
                  </div>
                )}

                {/* Classic Score inputs */}
                {mMatchType === 'classic' && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      3. Punteggio dei Set
                    </span>
                    <div className="flex flex-col gap-1.5 self-start sm:self-center">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mHasSet3}
                          onChange={(e) => {
                            setMHasSet3(e.target.checked);
                            if (e.target.checked) setMIsDrawChecked(false);
                          }}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Includi 3° Set / Super Tie-Break</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mIsDrawChecked}
                          onChange={(e) => {
                            setMIsDrawChecked(e.target.checked);
                            if (e.target.checked) setMHasSet3(false);
                          }}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span>Incontro Incompleto / Pareggio (+5 pt a testa)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Set 1 */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs font-bold text-slate-400 block mb-2">1° Set</span>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={mSet1P1}
                          onChange={(e) => setMSet1P1(Number(e.target.value))}
                          className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-slate-700 rounded-lg text-white text-base"
                        />
                        <span className="text-slate-500 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={mSet1P2}
                          onChange={(e) => setMSet1P2(Number(e.target.value))}
                          className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-slate-700 rounded-lg text-white text-base"
                        />
                      </div>
                    </div>

                    {/* Set 2 */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs font-bold text-slate-400 block mb-2">2° Set</span>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={mSet2P1}
                          onChange={(e) => setMSet2P1(Number(e.target.value))}
                          className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-slate-700 rounded-lg text-white text-base"
                        />
                        <span className="text-slate-500 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={mSet2P2}
                          onChange={(e) => setMSet2P2(Number(e.target.value))}
                          className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-slate-700 rounded-lg text-white text-base"
                        />
                      </div>
                    </div>

                    {/* Set 3 */}
                    {mHasSet3 && (
                      <div className="bg-slate-900 p-3 rounded-xl border border-indigo-500/40 text-center animate-fadeIn">
                        <span className="text-xs font-bold text-indigo-400 block mb-2">3° Set / Super TB</span>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={mSet3P1}
                            onChange={(e) => setMSet3P1(Number(e.target.value))}
                            className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-indigo-500/60 rounded-lg text-white text-base"
                          />
                          <span className="text-indigo-400 font-bold">-</span>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={mSet3P2}
                            onChange={(e) => setMSet3P2(Number(e.target.value))}
                            className="w-12 py-1.5 text-center font-bold bg-slate-950 border border-indigo-500/60 rounded-lg text-white text-base"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Score Preview with Official Club Rule Applied */}
                {matchCalculation.ruleInfo && p1 && p2 && (
                  <div className={`bg-gradient-to-r ${matchCalculation.isDraw ? 'from-amber-950/40 border-amber-500/40 text-amber-300' : 'from-emerald-950/40 border-emerald-500/40 text-emerald-300'} via-slate-950 to-slate-950 border rounded-2xl p-4 sm:p-5`}>
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${matchCalculation.isDraw ? 'text-amber-400' : 'text-emerald-400'}`}>
                      <Sparkles className="w-4 h-4" />
                      {matchCalculation.isDraw ? 'Anteprima Calcolo Pareggio (Ipotesi 3)' : 'Anteprima Calcolo Regolamento Circolo'}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-xs text-slate-400 block">{matchCalculation.isDraw ? `Giocatore 1 (${matchCalculation.formattedScore}):` : `Vincitore (${matchCalculation.formattedScore}):`}</span>
                        <strong className="text-lg text-white">
                          {matchCalculation.isDraw ? p1.name : (matchCalculation.winnerId === p1.id ? p1.name : p2.name)}
                        </strong>
                        <div className={`text-sm font-black mt-0.5 ${matchCalculation.isDraw ? 'text-amber-400' : 'text-emerald-400'}`}>
                          +{matchCalculation.ruleInfo.winnerPointsEarned} PUNTI IN CLASSIFICA
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {matchCalculation.ruleInfo.ruleDescription}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block">{matchCalculation.isDraw ? 'Giocatore 2:' : 'Sconfitto:'}</span>
                        <strong className="text-lg text-white">
                          {matchCalculation.isDraw ? p2.name : (matchCalculation.loserId === p1.id ? p1.name : p2.name)}
                        </strong>
                        <div className={`text-sm font-black mt-0.5 ${matchCalculation.isDraw ? 'text-amber-400' : 'text-rose-400'}`}>
                          {matchCalculation.isDraw ? `+${matchCalculation.ruleInfo.winnerPointsEarned} PUNTI IN CLASSIFICA` : `-${matchCalculation.ruleInfo.loserPointsLost} PUNTI (Penalità sconfitta)`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Court and Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Campo da Gioco
                    </label>
                    <input
                      type="text"
                      value={mCourt}
                      onChange={(e) => setMCourt(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Note Partita (opzionale)
                    </label>
                    <input
                      type="text"
                      value={mNotes}
                      onChange={(e) => setMNotes(e.target.value)}
                      placeholder="es. Match point annullato al 3° set"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={matchSubmitting}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salva e Aggiorna Classifica</span>
                  </button>
                </div>
              </form>
            )}
                </div>
              </div>
            </div>
          )}

          {/* Storico Sfide Registrate con opzione per eliminarle */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white">
                  Sfide di Classifica Registrate ({rankingMatches.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Cronologia di tutti i match di classifica registrati dalla segreteria
                </p>
              </div>

              {/* Filtro per categoria */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setMatchListCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    matchListCategoryFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tutti ({rankingMatches.length})
                </button>
                <button
                  onClick={() => setMatchListCategoryFilter('maschile')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    matchListCategoryFilter === 'maschile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Maschile ({matchMaschileCount})
                </button>
                <button
                  onClick={() => setMatchListCategoryFilter('femminile')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    matchListCategoryFilter === 'femminile' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Femminile ({matchFemminileCount})
                </button>
              </div>
            </div>

            {filteredRankingMatches.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Nessuna sfida registrata in questa categoria.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredRankingMatches.map((match, idx) => (
                  <div key={`m_${match.id}_${idx}`} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {match.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(match.date).toLocaleDateString('it-IT')}
                        </span>
                        {match.court && (
                          <span className="text-xs text-slate-400">• {match.court}</span>
                        )}
                      </div>
                      <div className="font-display font-bold text-white text-base">
                        <span className={match.winnerId === match.player1Id ? 'text-emerald-400' : 'text-slate-300'}>
                          {match.player1Name}
                        </span>
                        <span className="mx-2 text-slate-500">vs</span>
                        <span className={match.winnerId === match.player2Id ? 'text-emerald-400' : 'text-slate-300'}>
                          {match.player2Name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Punteggio: <strong className="text-white font-mono">{match.score}</strong> • Regola: {match.ruleApplied}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse">
                        +{match.pointsAwardedWinner} pt vincitore
                      </span>
                      <button
                        onClick={() => {
                          let s1_1 = 6, s1_2 = 4;
                          let s2_1 = 6, s2_2 = 3;
                          let s3_1 = 10, s3_2 = 8;
                          let has3 = false;
                          let mType: 'classic' | 'timed' = match.matchType || 'classic';
                          let tG1 = 12, tG2 = 9;

                          if (match.score && match.score.includes('(1h)')) {
                            mType = 'timed';
                            const parts = match.score.replace('(1h)', '').trim().split('-');
                            if (parts.length === 2) {
                              tG1 = parseInt(parts[0]) || 12;
                              tG2 = parseInt(parts[1]) || 9;
                            }
                          } else if (match.sets && match.sets[0] && match.matchType === 'timed') {
                            mType = 'timed';
                            tG1 = match.sets[0].p1 ?? 12;
                            tG2 = match.sets[0].p2 ?? 9;
                          } else if (match.score) {
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

                          setRMatchType(mType);
                          setRSet1P1(s1_1);
                          setRSet1P2(s1_2);
                          setRSet2P1(s2_1);
                          setRSet2P2(s2_2);
                          setRHasSet3(has3);
                          setRSet3P1(s3_1);
                          setRSet3P2(s3_2);
                          setRTimedGamesP1(tG1);
                          setRTimedGamesP2(tG2);
                          
                          setRCourt(match.court || 'Campo 1 (Terra Rossa)');
                          setRNotes(match.notes || '');
                          
                          const d = new Date(match.date);
                          const tzoffset = d.getTimezoneOffset() * 60000;
                          const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
                          setRDateStr(localISOTime);
                          
                          setRWinnerId(match.winnerId);
                          setRScore(match.score);
                          setEditingRankingMatch(match);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 transition-colors"
                        title="Modifica sfida"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMatchToDelete(match)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"
                        title="Elimina sfida errata"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: GESTIONE TORNEI SOCIALI                                        */}
      {/* ========================================================================= */}
      {activeSection === 'tournaments' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Trophy className="w-4 h-4" />
                Organizzazione Tornei Sociali
              </div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                Tornei Sociali del Circolo ({tournaments.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Crea tabelloni ad eliminazione diretta o gironi Round-Robin con calendario gare. Gestisci i punteggi per far avanzare i giocatori fino alla finale.
              </p>
            </div>

            <button
              onClick={onOpenNewTournamentModal}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 text-white font-black text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] self-start sm:self-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crea Nuovo Torneo</span>
            </button>
          </div>

          {tournaments.length === 0 ? (
            <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-display font-bold text-lg text-white">
                Nessun torneo sociale attivo
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clicca su "Crea Nuovo Torneo" per generare un tabellone con i tuoi atleti o coppie iscritte.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selettore Torneo */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Seleziona Torneo:</span>
                  <select
                    value={activeTourn?.id || ''}
                    onChange={(e) => setSelectedTournId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category} - {t.type === 'elimination' ? 'Eliminazione' : 'Girone'})
                      </option>
                    ))}
                  </select>
                </div>

                {activeTourn && (
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => {
                        setEditingTournName(activeTourn);
                        setNewTournNameInput(activeTourn.name);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer"
                      title="Modifica nome del torneo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Rinomina Torneo</span>
                    </button>

                    <button
                      onClick={() => setTournToDelete(activeTourn)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Elimina Questo Torneo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Partite del Torneo da Aggiornare */}
              {activeTourn && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">
                        Incontri Torneo: {activeTourn.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Clicca su un incontro per registrare o modificare il punteggio del match e assegnare il vincitore.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeTournMatches.map((m, idx) => {
                      const isComplete = m.status === 'completed';
                      const isBye = m.status === 'bye';
                      const canEdit = !isBye && m.player1Id && m.player2Id;

                      return (
                        <div
                          key={`tm_${m.id}_${idx}`}
                          onClick={() => {
                            if (canEdit) {
                              let s1_1 = 6, s1_2 = 4;
                              let s2_1 = 6, s2_2 = 3;
                              let s3_1 = 10, s3_2 = 8;
                              let has3 = false;

                              if (m.score) {
                                const parts = m.score.trim().split(/\s+/);
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

                              setTSet1P1(s1_1);
                              setTSet1P2(s1_2);
                              setTSet2P1(s2_1);
                              setTSet2P2(s2_2);
                              setTHasSet3(has3);
                              setTSet3P1(s3_1);
                              setTSet3P2(s3_2);

                              setEditingTournMatch(m);
                              setTournScoreInput(m.score || '6-4 6-3');
                              setTournWinnerId(m.winnerId || m.player1Id || '');
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            canEdit ? 'cursor-pointer hover:border-indigo-400 hover:scale-[1.01]' : 'opacity-85'
                          } ${
                            isComplete 
                              ? 'bg-slate-950 border-emerald-500/30' 
                              : isBye
                              ? 'bg-slate-950/60 border-slate-800'
                              : 'bg-slate-950 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                            <span>{m.roundName}</span>
                            <span className={isComplete ? 'text-emerald-400' : isBye ? 'text-slate-500' : 'text-amber-400'}>
                              {isComplete ? 'Completata' : isBye ? 'BYE' : 'Da disputare'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className={`flex items-center justify-between ${
                              m.winnerId === m.player1Id ? 'font-black text-emerald-400' : 'text-slate-200'
                            }`}>
                              <span>{m.player1Name}</span>
                              {m.winnerId === m.player1Id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <div className={`flex items-center justify-between ${
                              m.winnerId === m.player2Id ? 'font-black text-emerald-400' : 'text-slate-200'
                            }`}>
                              <span>{m.player2Name}</span>
                              {m.winnerId === m.player2Id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          </div>

                          {m.score && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-white flex justify-between">
                              <span className="text-slate-400">Score:</span>
                              <strong>{m.score}</strong>
                            </div>
                          )}

                          {canEdit && (
                            <div className="mt-2 text-[10px] text-indigo-300 font-semibold text-right">
                              Clicca per inserire punteggio →
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: IMPOSTAZIONI CIRCOLO & RESET                                   */}
      {/* ========================================================================= */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="font-display font-black text-xl sm:text-2xl text-white mb-1">
              Impostazioni Circolo & Bacheca
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Personalizza i dettagli del circolo, il testo del comunicato visualizzato dai soci e il PIN per l'Area Gestore.
            </p>

            {settingsSuccessMsg && (
              <div className="mb-5 p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Nome del Circolo Tennis
                  </label>
                  <input
                    type="text"
                    value={clubNameInput}
                    onChange={(e) => setClubNameInput(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Stagione
                  </label>
                  <input
                    type="text"
                    value={seasonInput}
                    onChange={(e) => setSeasonInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Comunicato per la Bacheca Pubblica del Circolo
                </label>
                <textarea
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  placeholder="Avviso ufficiale visibile a tutti i soci..."
                />
              </div>

              {/* Sezione PIN Gestori (Fino a 2 PIN a 8 cifre) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                  <h4 className="font-display font-bold text-sm text-white">
                    Codici PIN di Accesso all'Area Gestore (Fino a 2 Gestori)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Puoi impostare 2 codici PIN indipendenti a 8 cifre in modo che entrambi i gestori abbiano il proprio accesso riservato.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      PIN Gestore 1 (8 cifre)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="es. 12345678"
                      required
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-base tracking-widest focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      {adminPinInput.length === 8 ? '✓ 8 cifre impostate' : `${adminPinInput.length}/8 cifre`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      PIN Gestore 2 (8 cifre - Secondo Gestore)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={adminPin2Input}
                      onChange={(e) => setAdminPin2Input(e.target.value.replace(/\D/g, ''))}
                      placeholder="es. 87654321"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-base tracking-widest focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      {adminPin2Input ? (adminPin2Input.length === 8 ? '✓ 8 cifre impostate' : `${adminPin2Input.length}/8 cifre`) : 'Opzionale (non impostato)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva Impostazioni</span>
                </button>
              </div>
            </form>
          </div>

          {/* Strumento di Allineamento e Ricalcolo Database */}
          {onRecalculateAllPlayerStats && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-white">
                    Sincronizzazione & Ricalcolo Database
                  </h3>
                  <p className="text-xs text-slate-400">
                    Se hai eliminato partite o noti incongruenze nei punteggi, questo strumento ricalcolerà da zero tutti i punti e le statistiche dei soci basandosi esclusivamente sulle sfide reali rimaste nel database.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                L'operazione ripristinerà i dati iniziali di ciascun atleta e applicherà tutte le sfide storiche registrate in ordine cronologico. Consigliato per allineare le statistiche dopo modifiche manuali o rimozioni.
              </p>

              <button
                onClick={onRecalculateAllPlayerStats}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ricalcola e Allinea Statistiche Giocatori</span>
              </button>
            </div>
          )}

          {/* Svuota Tutto / Azzera Dati per Test */}
          <div className="bg-rose-950/20 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-rose-300">
                  Zona di Pericolo: Azzera Database Circolo
                </h3>
                <p className="text-xs text-slate-400">
                  Permette di cancellare in un istante tutti i giocatori, le partite e i tornei per ripartire completamente da zero durante i tuoi test.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Questa operazione svuota tutte le collezioni (giocatori, sfide classifica e tornei) su Firestore. Non è reversibile.
            </p>

            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Svuota Tutti i Dati del Circolo</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: MODIFICA GIOCATORE                                               */}
      {/* ========================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Modifica Atleta: {editingPlayer.name}
                </h3>
                <span className="text-xs text-slate-400 capitalize">
                  Categoria: {editingPlayer.category}
                </span>
              </div>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlayerSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Dati Anagrafici Principali */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {editingPlayer.category === 'doppio' ? 'Dati Atleta 1 (Capitano)' : 'Dati Anagrafici'}
                  </span>
                  {editingPlayer.birthDate && calculateAge(editingPlayer.birthDate) !== null && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Età: {calculateAge(editingPlayer.birthDate)} anni
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nome *</label>
                    <input
                      type="text"
                      value={editingPlayer.firstName || ''}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, firstName: e.target.value })}
                      required
                      placeholder="Nome"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Cognome *</label>
                    <input
                      type="text"
                      value={editingPlayer.lastName || ''}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, lastName: e.target.value })}
                      required
                      placeholder="Cognome"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Sesso *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPlayer({ ...editingPlayer, gender: 'M' })}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          editingPlayer.gender === 'M'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Maschio (M)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlayer({ ...editingPlayer, gender: 'F' })}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          editingPlayer.gender === 'F'
                            ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Femmina (F)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Data di Nascita</label>
                    <input
                      type="date"
                      value={editingPlayer.birthDate || ''}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, birthDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Dati Partner se Doppio */}
              {editingPlayer.category === 'doppio' && (
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Dati Partner di Doppio
                    </span>
                    {editingPlayer.partnerBirthDate && calculateAge(editingPlayer.partnerBirthDate) !== null && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Età: {calculateAge(editingPlayer.partnerBirthDate)} anni
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-indigo-300 uppercase">Nome Partner</label>
                      <input
                        type="text"
                        value={editingPlayer.partnerFirstName || ''}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, partnerFirstName: e.target.value })}
                        placeholder="Nome Partner"
                        className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/50 rounded-xl text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-indigo-300 uppercase">Cognome Partner</label>
                      <input
                        type="text"
                        value={editingPlayer.partnerLastName || ''}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, partnerLastName: e.target.value })}
                        placeholder="Cognome Partner"
                        className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/50 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-indigo-300 uppercase">Sesso Partner</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPlayer({ ...editingPlayer, partnerGender: 'M' })}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            editingPlayer.partnerGender === 'M'
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Maschio (M)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPlayer({ ...editingPlayer, partnerGender: 'F' })}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            editingPlayer.partnerGender === 'F'
                              ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Femmina (F)
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-indigo-300 uppercase">Data Nascita Partner</label>
                      <input
                        type="date"
                        value={editingPlayer.partnerBirthDate || ''}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, partnerBirthDate: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Classifica e Punti */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Classifica FITP</label>
                  <select
                    value={editingPlayer.fitRating || '4.NC'}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, fitRating: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    {FITP_RATINGS.map(r => (
                      <option key={r} value={r}>
                        FITP {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Punti Classifica</label>
                  <input
                    type="number"
                    value={editingPlayer.points}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Contatti */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Telefono</label>
                  <input
                    type="tel"
                    value={editingPlayer.phone || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                  <input
                    type="email"
                    value={editingPlayer.email || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFERMA ELIMINA GIOCATORE                                       */}
      {/* ========================================================================= */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              Eliminare {playerToDelete.name}?
            </h3>
            <p className="text-xs text-slate-300">
              L'atleta verrà rimosso dalla categoria <strong>{playerToDelete.category.toUpperCase()}</strong> e la classifica verrà automaticamente ricalcolata.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeletePlayerConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Sì, Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFERMA ELIMINA SFIDA                                           */}
      {/* ========================================================================= */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              Eliminare questa sfida?
            </h3>
            <p className="text-xs text-slate-300">
              Verrà eliminata la partita <strong>{matchToDelete.player1Name} vs {matchToDelete.player2Name}</strong> ({matchToDelete.score}).
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteRankingMatchConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Elimina Sfida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3B: MODIFICA SFIDA DI CLASSIFICA                                    */}
      {/* ========================================================================= */}
      {editingRankingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Modifica Sfida di Classifica
                </h3>
                <span className="text-xs text-indigo-400">Aggiorna punteggio, data-ora, campo e note della sfida</span>
              </div>
              <button onClick={() => setEditingRankingMatch(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRankingMatch} className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-sm font-bold text-slate-300">
                  {editingRankingMatch.player1Name} <span className="text-slate-500 font-normal">vs</span> {editingRankingMatch.player2Name}
                </div>
              </div>

              {/* Seleziona Vincitore */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase block">Vincitore Incontro *</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRWinnerId(editingRankingMatch.player1Id)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      rWinnerId === editingRankingMatch.player1Id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {editingRankingMatch.player1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRWinnerId(editingRankingMatch.player2Id)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      rWinnerId === editingRankingMatch.player2Id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {editingRankingMatch.player2Name}
                  </button>
                </div>
              </div>

              {/* Formato Partita */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Formato Partita
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRMatchType('classic')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      rMatchType === 'classic'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>🎾</span>
                    <span>Partita Classica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRMatchType('timed')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      rMatchType === 'timed'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>⏱️</span>
                    <span>Più giochi in un'ora</span>
                  </button>
                </div>
              </div>

              {/* Timed Match Edit Input */}
              {rMatchType === 'timed' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block text-center">
                    Totale Giochi vinti in 1 Ora (60 min)
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px]">
                      {editingRankingMatch.player1Name.split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={rTimedGamesP1}
                        onChange={(e) => setRTimedGamesP1(parseInt(e.target.value) || 0)}
                        className="w-16 text-center py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-lg"
                      />
                      <span className="text-slate-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={rTimedGamesP2}
                        onChange={(e) => setRTimedGamesP2(parseInt(e.target.value) || 0)}
                        className="w-16 text-center py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-lg"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px] text-right">
                      {editingRankingMatch.player2Name.split(' ')[0]}
                    </span>
                  </div>
                </div>
              )}

              {/* Inserimento Punteggio Set (Classico) */}
              {rMatchType === 'classic' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
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
                      value={rSet1P1}
                      onChange={(e) => setRSet1P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={rSet1P2}
                      onChange={(e) => setRSet1P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
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
                      value={rSet2P1}
                      onChange={(e) => setRSet2P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={rSet2P2}
                      onChange={(e) => setRSet2P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Set 3 Toggle */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rHasSet3}
                      onChange={(e) => setRHasSet3(e.target.checked)}
                      className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    Incontro andato al 3° Set / Super Tie-break
                  </label>
                </div>

                {/* Set 3 */}
                {rHasSet3 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs font-semibold text-slate-400 w-16">3° Set / TB</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={rSet3P1}
                        onChange={(e) => setRSet3P1(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={rSet3P2}
                        onChange={(e) => setRSet3P2(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Data e Ora Incontro */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase block">Data e Ora Incontro</label>
                <input
                  type="datetime-local"
                  value={rDateStr}
                  onChange={(e) => setRDateStr(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              {/* Campo e Note */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase block">Campo</label>
                  <select
                    value={rCourt}
                    onChange={(e) => setRCourt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
                  >
                    <option value="Campo 1 (Terra Rossa)">Campo 1 (Terra Rossa)</option>
                    <option value="Campo 2 (Terra Rossa)">Campo 2 (Terra Rossa)</option>
                    <option value="Campo 3 (Sintetico)">Campo 3 (Sintetico)</option>
                    <option value="Campo 4 (Erba Sintetica)">Campo 4 (Erba Sintetica)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase block">Note</label>
                  <input
                    type="text"
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    placeholder="es. Annullato match point..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Risultato Finale Formattato */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Risultato Formattato (Generato Automaticamente)
                </span>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center font-display font-extrabold text-sm text-indigo-400">
                  {rScore}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRankingMatch(null)}
                  disabled={isSavingEditedMatch}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditedMatch || !rWinnerId}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/25 cursor-pointer"
                >
                  {isSavingEditedMatch ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: AGGIORNA PUNTEGGIO MATCH TORNEO                                 */}
      {/* ========================================================================= */}
      {editingTournMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Risultato Match: {editingTournMatch.roundName}
                </h3>
                <span className="text-xs text-indigo-400">Inserisci punteggio e seleziona il vincitore</span>
              </div>
              <button onClick={() => setEditingTournMatch(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTournScore} className="space-y-4">
              {/* Seleziona Vincitore */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase block">Chi ha vinto l'incontro? *</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTournWinnerId(editingTournMatch.player1Id || '')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      tournWinnerId === editingTournMatch.player1Id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {editingTournMatch.player1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTournWinnerId(editingTournMatch.player2Id || '')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      tournWinnerId === editingTournMatch.player2Id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {editingTournMatch.player2Name}
                  </button>
                </div>
              </div>

              {/* Inserimento Punteggio Set */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
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
                      value={tSet1P1}
                      onChange={(e) => setTSet1P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={tSet1P2}
                      onChange={(e) => setTSet1P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
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
                      value={tSet2P1}
                      onChange={(e) => setTSet2P1(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={tSet2P2}
                      onChange={(e) => setTSet2P2(parseInt(e.target.value) || 0)}
                      className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Set 3 Toggle */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tHasSet3}
                      onChange={(e) => setTHasSet3(e.target.checked)}
                      className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    Incontro andato al 3° Set / Super Tie-break
                  </label>
                </div>

                {/* Set 3 */}
                {tHasSet3 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs font-semibold text-slate-400 w-16">3° Set / TB</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={tSet3P1}
                        onChange={(e) => setTSet3P1(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={tSet3P2}
                        onChange={(e) => setTSet3P2(parseInt(e.target.value) || 0)}
                        className="w-14 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
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
                <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center font-display font-extrabold text-base text-indigo-400">
                  {tournScoreInput}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTournMatch(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25"
                >
                  Salva e Fai Avanzare Vincitore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFERMA ELIMINA TORNEO                                          */}
      {/* ========================================================================= */}
      {tournToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              Eliminare il torneo {tournToDelete.name}?
            </h3>
            <p className="text-xs text-slate-300">
              Verranno rimossi il torneo e tutte le relative partite del tabellone. L'operazione non può essere annullata.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTournToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteTournConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Elimina Torneo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5B: MODIFICA NOME TORNEO                                            */}
      {/* ========================================================================= */}
      {editingTournName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-white">
                  Rinomina Torneo
                </h3>
              </div>
              <button
                onClick={() => setEditingTournName(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">
                Nome Torneo
              </label>
              <input
                type="text"
                value={newTournNameInput}
                onChange={(e) => setNewTournNameInput(e.target.value)}
                placeholder="Inserisci nuovo nome torneo..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveTournNameConfirm();
                  } else if (e.key === 'Escape') {
                    setEditingTournName(null);
                  }
                }}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTournName(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isSavingTournName || !newTournNameInput.trim()}
                onClick={handleSaveTournNameConfirm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSavingTournName ? 'Salvataggio...' : 'Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFERMA DI SICUREZZA PER SVUOTA DATABASE                        */}
      {/* ========================================================================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-display font-black text-xl text-white">
                Sei davvero sicuro di voler azzerare tutto?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Verranno eliminati permanentemente <strong>tutti i giocatori, tutte le sfide di classifica e tutti i tornei</strong>.
                Il database tornerà vuoto, pronto per nuovi inserimenti.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-rose-400 block text-center">
                Per confermare, digita esattamente <strong className="text-white">CANCELLA</strong> qui sotto:
              </label>
              <input
                type="text"
                value={confirmClearText}
                onChange={(e) => setConfirmClearText(e.target.value)}
                placeholder="CANCELLA"
                className="w-full text-center px-4 py-2.5 bg-slate-950 border border-rose-500/60 rounded-xl text-white font-mono font-bold tracking-widest text-sm focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  setConfirmClearText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleClearDatabaseExecute}
                disabled={confirmClearText.toUpperCase() !== 'CANCELLA'}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black shadow-lg shadow-rose-600/30"
              >
                Conferma Azzeramento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
