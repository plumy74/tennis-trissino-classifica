import React from 'react';
import { 
  Trophy, 
  Swords, 
  UserCheck, 
  Tv, 
  Shield, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { ClubLogo } from './ClubLogo';

export type AppTab = 'ladder' | 'tournaments' | 'player' | 'noticeboard' | 'manager';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onNewMatch: () => void;
  onNewTournament: () => void;
  clubName: string;
  logoUrl?: string;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  onToggleAdmin,
  clubName,
  logoUrl,
  isSyncing
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm shadow-slate-100/80 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Club Title */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('noticeboard')}>
            <ClubLogo size="md" customUrl={logoUrl} className="group-hover:scale-105 transition-transform duration-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-slate-950 group-hover:text-orange-600 transition-colors">
                  {clubName}
                </span>
                {isSyncing && (
                  <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Classifica Mobile &amp; Tornei Sociali • Trissino (VI)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('manager')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-black transition-all ${
                  activeTab === 'manager'
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'text-orange-600 hover:text-orange-700 hover:bg-orange-500/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Area Gestore
              </button>
            )}

            <button
              onClick={() => setActiveTab('noticeboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'noticeboard'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Tv className="w-4 h-4 text-orange-500" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('ladder')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'ladder'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              Classifiche
            </button>

            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tournaments'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Swords className="w-4 h-4 text-orange-500" />
              Tornei Sociali
            </button>

            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'player'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-500" />
              Profilo Giocatore
            </button>
          </nav>

          {/* Quick Actions & Admin Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin Switch */}
            {!isAdmin && (
              <button
                onClick={onToggleAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                title="Accedi all'Area Gestore con PIN"
              >
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Area Gestore (PIN)</span>
                <span className="sm:hidden">Gestore</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-200 overflow-x-auto gap-2">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap ${
                activeTab === 'manager'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-orange-600 hover:bg-orange-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Gestione
            </button>
          )}
          <button
            onClick={() => setActiveTab('noticeboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'noticeboard'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-orange-500" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ladder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'ladder'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Classifiche
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'tournaments'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-orange-500" />
            Tornei
          </button>
          <button
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'player'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            Giocatori
          </button>
        </div>
      </div>
    </header>
  );
};

