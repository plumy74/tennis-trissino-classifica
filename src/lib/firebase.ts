import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Player, RankingMatch, Tournament, TournamentMatch, ClubSettings } from '../types/tennis';
import { generateEliminationBracket, generateRoundRobinMatches } from '../utils/tournamentGenerator';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Pulisce qualsiasi valore 'undefined' da oggetti prima di inviarli a Firestore,
 * prevenendo l'errore 'Unsupported field value: undefined'.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Validates connection to Firestore at initial boot as required by system instructions
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently in offline mode or waiting for connection.');
    }
    return false;
  }
}

/**
 * Dati iniziali predefiniti per popolare il circolo alla prima apertura
 */
export const INITIAL_CLUB_SETTINGS: ClubSettings = {
  clubName: 'Tennis Comunali Trissino',
  city: 'Trissino (VI)',
  adminPin: '1234',
  adminPin2: '',
  announcement: 'Benvenuti al Circolo Tennis Comunali Trissino! Sono aperte le sfide per la classifica mobile sociale e le iscrizioni ai tornei.',
  season: 'Stagione 2026',
  phone: '+39 320 8080670',
  address: 'Via Palladio, 24 - 36070 Trissino (VI)',
  logoUrl: '/logo.svg'
};

export const INITIAL_PLAYERS: Player[] = [];

export const INITIAL_RANKING_MATCHES: RankingMatch[] = [];

/**
 * Elimina tutti i dati di esempio e svuota le collezioni per consentire
 * all'utente di inserire da zero i propri soci e le proprie partite
 */
export async function clearAllSampleData(): Promise<void> {
  try {
    console.log('Rimozione di tutti i dati di esempio da Firestore...');
    const collectionsToClear = ['players', 'rankingMatches', 'tournaments', 'tournamentMatches'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    }
    await setDoc(doc(db, 'clubSettings', 'main'), sanitizeForFirestore(INITIAL_CLUB_SETTINGS));
    console.log('Dati di esempio eliminati con successo.');
  } catch (err) {
    console.error('Errore durante la pulizia dei dati:', err);
  }
}

/**
 * Funzione di inizializzazione: non inserisce dati di esempio, pulisce se richiesto
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Non inserisce alcun dato dimostrativo
  return;
}
