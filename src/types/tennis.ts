export type PlayerCategory = 'maschile' | 'femminile' | 'doppio';
export type Gender = 'M' | 'F';

export interface Player {
  id: string;
  name: string; // Nome completo calcolato (Nome + Cognome)
  firstName?: string; // Nome separato
  lastName?: string; // Cognome separato
  gender?: Gender; // Sesso ('M' o 'F')
  birthDate?: string; // Data di nascita (YYYY-MM-DD)
  category: PlayerCategory;
  partnerName?: string; // Nome completo partner per doppio
  partnerFirstName?: string; // Nome partner separato
  partnerLastName?: string; // Cognome partner separato
  partnerGender?: Gender; // Sesso partner ('M' o 'F')
  partnerBirthDate?: string; // Data di nascita partner
  fitRating?: string; // e.g. "4.1", "4.NC", "3.5", "4.3"
  points: number;
  rank: number;
  previousRank?: number;
  phone?: string;
  email?: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  currentStreak: number; // positive = win streak, negative = loss streak
  bestStreak: number;
  avatarColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetScore {
  p1: number;
  p2: number;
  tiebreak?: string; // e.g. "7-5"
}

export interface RankingMatch {
  id: string;
  category: PlayerCategory;
  matchType?: 'classic' | 'timed';
  date: string; // ISO string
  player1Id: string;
  player1Name: string;
  player1RankAtMatch: number;
  player2Id: string;
  player2Name: string;
  player2RankAtMatch: number;
  winnerId: string;
  loserId: string;
  score: string; // e.g. "6-4 3-6 10-8"
  sets: SetScore[];
  pointsAwardedWinner: number;
  pointsDeductedLoser: number;
  ruleApplied: string;
  court?: string;
  notes?: string;
  status: 'scheduled' | 'completed';
  createdAt: string;
}

export type TournamentType = 'round_robin' | 'elimination';

export interface TournamentParticipant {
  playerId: string;
  name: string;
  fitRating?: string;
  seed?: number; // 1, 2, 3, 4... for bracket seeding
  group?: string; // "Girone A", "Girone B" for round robin
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  category: string; // 'Singolo Maschile' | 'Singolo Femminile' | 'Open' | 'Doppio'
  surface: string; // 'Terra Rossa' | 'Sintetico' | 'Erba Sintetica' | 'Cemento'
  startDate: string;
  endDate: string;
  status: 'draft' | 'ongoing' | 'completed';
  participants: TournamentParticipant[];
  winnerId?: string;
  winnerName?: string;
  runnerUpId?: string;
  runnerUpName?: string;
  settings?: {
    setsToWin: number; // usually 2
    groupsCount?: number; // for round robin
    tiebreakRule?: string; // "Super Tie-break al 3° set (10 pt)"
  };
  roundDeadlines?: Record<string, string>; // e.g. { "Turno 1": "2026-10-10", "Quarti": "2026-10-20" }
  createdAt: string;
  updatedAt: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  tournamentType: TournamentType;
  round: number; // 1, 2, 3...
  roundName: string; // "Ottavi", "Quarti", "Semifinali", "Finale" or "Giornata 1"
  group?: string | null; // For round robin
  matchNumber: number;
  player1Id: string | null;
  player1Name: string;
  player1Seed?: number | null;
  player2Id: string | null;
  player2Name: string;
  player2Seed?: number | null;
  score?: string; // e.g. "6-3 6-4"
  sets?: SetScore[];
  winnerId: string | null;
  nextMatchId?: string | null;
  nextMatchSlot?: 'p1' | 'p2' | null;
  scheduledDate?: string;
  court?: string;
  status: 'scheduled' | 'completed' | 'bye';
  updatedAt: string;
}

export interface RoundRobinStanding {
  player: TournamentParticipant;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number; // 2 or 3 pts for win in round robin
}

export interface ClubSettings {
  clubName: string;
  city?: string;
  adminPin: string;
  announcement: string;
  season: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}
