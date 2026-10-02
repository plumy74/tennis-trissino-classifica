import React, { useState } from 'react';
import { X, Settings, UserPlus, Save, Building2, Megaphone, Trash2, Users, AlertCircle, Image } from 'lucide-react';
import { ClubSettings, Player, PlayerCategory, Gender } from '../types/tennis';
import { calculateAge } from '../utils/scoring';
import { ClubLogo } from './ClubLogo';

interface ClubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClubSettings;
  onSaveSettings: (settings: ClubSettings) => Promise<void>;
  onAddPlayer: (player: Player) => Promise<void>;
  onClearDatabase?: () => Promise<void>;
}

export const ClubSettingsModal: React.FC<ClubSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onAddPlayer,
  onClearDatabase
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'new_player'>('settings');

  // Settings form
  const [clubName, setClubName] = useState(settings.clubName || 'Tennis Comunali Trissino');
  const [city, setCity] = useState(settings.city || 'Trissino (VI)');
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [season, setSeason] = useState(settings.season);
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [adminPin2, setAdminPin2] = useState(settings.adminPin2 || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [address, setAddress] = useState(settings.address || 'Via Nardi 104, Trissino (VI)');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '/logo.svg');

  // New Player form with separate fields
  const [playerCategory, setPlayerCategory] = useState<PlayerCategory>('maschile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [birthDate, setBirthDate] = useState('');
  
  const [partnerFirstName, setPartnerFirstName] = useState('');
  const [partnerLastName, setPartnerLastName] = useState('');
  const [partnerGender, setPartnerGender] = useState<Gender>('M');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');

  const [fitRating, setFitRating] = useState('4.NC');
  const [initialPoints, setInitialPoints] = useState(0);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setIsSaving(true);
      await onSaveSettings({
        ...settings,
        clubName,
        city,
        announcement,
        season,
        adminPin,
        adminPin2,
        phone,
        address,
        logoUrl
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Errore durante il salvataggio delle impostazioni.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!fName || !lName) {
      setErrorMessage('Inserisci sia il nome che il cognome del giocatore.');
      return;
    }

    if (playerCategory === 'doppio' && (!partnerFirstName.trim() || !partnerLastName.trim())) {
      setErrorMessage('Inserisci sia il nome che il cognome del compagno di doppio.');
      return;
    }

    try {
      setIsSaving(true);
      const fullName = `${fName} ${lName}`;
      const partnerFullName = playerCategory === 'doppio' 
        ? `${partnerFirstName.trim()} ${partnerLastName.trim()}` 
        : undefined;

      const newPlayer: Player = {
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: fullName,
        firstName: fName,
        lastName: lName,
        gender,
        birthDate: birthDate || undefined,
        category: playerCategory,
        partnerName: partnerFullName,
        partnerFirstName: playerCategory === 'doppio' ? partnerFirstName.trim() : undefined,
        partnerLastName: playerCategory === 'doppio' ? partnerLastName.trim() : undefined,
        partnerGender: playerCategory === 'doppio' ? partnerGender : undefined,
        partnerBirthDate: playerCategory === 'doppio' ? (partnerBirthDate || undefined) : undefined,
        fitRating,
        points: initialPoints,
        rank: 99, // will be auto-recalculated
        email: playerEmail.trim() || undefined,
        phone: playerPhone.trim() || undefined,
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
      setFirstName('');
      setLastName('');
      setBirthDate('');
      setPartnerFirstName('');
      setPartnerLastName('');
      setPartnerBirthDate('');
      setPlayerEmail('');
      setPlayerPhone('');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Errore durante l\'aggiunta del nuovo giocatore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header with tabs */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Impostazioni Circolo
            </button>
            <button
              onClick={() => setActiveTab('new_player')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'new_player'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-500/25'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              + Nuovo Giocatore
            </button>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Settings Form */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Club Logo Preview */}
            <div className="flex items-center gap-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <ClubLogo customUrl={logoUrl} size="lg" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block">
                  Logo Ufficiale Circolo
                </span>
                <span className="text-sm font-bold text-slate-900 block truncate">{clubName}</span>
                <span className="text-xs text-slate-500">{city}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Nome del Circolo Tennis
              </label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Città / Località
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Trissino (VI)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Stagione di Riferimento
                </label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Indirizzo Circolo
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Via Nardi 104, Trissino (VI)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                URL Logo Circolo (SVG o Immagine)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/logo.svg"
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl('/logo.svg')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Predefinito
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Comunicato in Bacheca
              </label>
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Avviso per i soci del circolo..."
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  PIN Accesso Gestori (Fino a 2 Gestori a 8 Cifre)
                </label>
                <p className="text-[11px] text-slate-500">
                  Consente l'accesso indipendente a entrambi i responsabili del circolo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    PIN Gestore 1 (8 cifre)
                  </span>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="es. 12345678"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-sm tracking-widest focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {adminPin.length === 8 ? '✓ 8 cifre' : `${adminPin.length}/8 cifre`}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    PIN Gestore 2 (8 cifre - Opzionale)
                  </span>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="es. 87654321"
                    value={adminPin2}
                    onChange={(e) => setAdminPin2(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-sm tracking-widest focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {adminPin2 ? (adminPin2.length === 8 ? '✓ 8 cifre' : `${adminPin2.length}/8 cifre`) : 'Non impostato'}
                  </span>
                </div>
              </div>
            </div>

            {onClearDatabase && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-600 block">Azzera Tutti i Dati</span>
                  <span className="text-[11px] text-slate-500">Elimina tutte le partite, tornei e soci registrati</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Sei sicuro di voler eliminare tutti i dati del circolo (giocatori, sfide e tornei)? L\'operazione non è reversibile.')) {
                      await onClearDatabase();
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Svuota Database
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: New Player Form */}
        {activeTab === 'new_player' && (
          <form onSubmit={handleCreatePlayer} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Categoria Giocatore */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Categoria Classifica
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerCategory('maschile');
                    setGender('M');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                    playerCategory === 'maschile'
                      ? 'bg-blue-50 text-blue-700 border-blue-400 font-black shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                  }`}
                >
                  Singolare Maschile (M)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerCategory('femminile');
                    setGender('F');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                    playerCategory === 'femminile'
                      ? 'bg-rose-50 text-rose-700 border-rose-400 font-black shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                  }`}
                >
                  Singolare Femminile (F)
                </button>
              </div>
            </div>

            {/* Dati Anagrafici Giocatore */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {playerCategory === 'doppio' ? 'Atleta 1 (Capitano)' : 'Anagrafica Giocatore'}
                </span>
                {birthDate && calculateAge(birthDate) !== null && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Età: {calculateAge(birthDate)} anni
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Mario"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cognome *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Rossi"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Sesso *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('M')}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        gender === 'M' ? 'bg-blue-50 border-blue-400 text-blue-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Maschio
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('F')}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        gender === 'F' ? 'bg-rose-50 border-rose-400 text-rose-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Femmina
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Data di Nascita</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Dati Partner se Doppio */}
            {playerCategory === 'doppio' && (
              <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Dati Compagno di Doppio (Partner)
                  </span>
                  {partnerBirthDate && calculateAge(partnerBirthDate) !== null && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Età: {calculateAge(partnerBirthDate)} anni
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-700 uppercase">Nome Partner *</label>
                    <input
                      type="text"
                      value={partnerFirstName}
                      onChange={(e) => setPartnerFirstName(e.target.value)}
                      required
                      placeholder="Luigi"
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-700 uppercase">Cognome Partner *</label>
                    <input
                      type="text"
                      value={partnerLastName}
                      onChange={(e) => setPartnerLastName(e.target.value)}
                      required
                      placeholder="Bianchi"
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-700 uppercase">Sesso Partner</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPartnerGender('M')}
                        className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          partnerGender === 'M' ? 'bg-blue-50 border-blue-400 text-blue-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Maschio
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartnerGender('F')}
                        className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          partnerGender === 'F' ? 'bg-rose-50 border-rose-400 text-rose-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Femmina
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-700 uppercase">Data Nascita Partner</label>
                    <input
                      type="date"
                      value={partnerBirthDate}
                      onChange={(e) => setPartnerBirthDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Classifica FITP</label>
                <select
                  value={fitRating}
                  onChange={(e) => setFitRating(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="3.1">3.1</option>
                  <option value="3.2">3.2</option>
                  <option value="3.3">3.3</option>
                  <option value="3.4">3.4</option>
                  <option value="3.5">3.5</option>
                  <option value="4.1">4.1</option>
                  <option value="4.2">4.2</option>
                  <option value="4.3">4.3</option>
                  <option value="4.4">4.4</option>
                  <option value="4.5">4.5</option>
                  <option value="4.NC">4.NC</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Punti Iniziali Circolo</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={initialPoints}
                  onChange={(e) => setInitialPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Email (opzionale)</label>
                <input
                  type="email"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  placeholder="giocatore@email.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Cellulare (opzionale)</label>
                <input
                  type="tel"
                  value={playerPhone}
                  onChange={(e) => setPlayerPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSaving || !firstName.trim() || !lastName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isSaving ? 'Aggiunta...' : 'Aggiungi Giocatore'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
