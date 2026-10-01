# Tennis Comunali Trissino • Classifica Mobile

Applicazione web professionale e moderna per la gestione del circolo tennis, classifiche a sfide dirette, tornei sociali, statistiche avanzate degli atleti e grafici di andamento dei punti.

## Funzionalità Principali

- **Classifica Mobile a Sfide Dirette**: Sistema asimmetrico e meritocratico con calcolo automatico dei punti vittoria/sconfitta.
- **Visualizzazione Top 5 e Classifica Completa**: Visualizzazione rapida dei primi 5 giocatori con tasto per espandere l'intera classifica.
- **Dashboard Atleta Interattiva**: Statistiche dettagliate, match giocati, win %, strisce di vittorie e grafico temporale dell'andamento punti nel tempo (realizzato con `recharts`).
- **Area Gestore Protetta da PIN**:
  - Gestione completa degli atleti (singolare maschile, femminile e doppio con indicazione prima il cognome e poi il nome).
  - Registrazione dei risultati delle sfide con popup modale dedicato e filtri per categoria.
  - Storico delle sfide di classifica con opzione di eliminazione e ricalcolo automatico in tempo reale.
- **Gestione Tornei Sociali**: Tabelloni ad eliminazione diretta e gironi Round-Robin con calendario gare e aggiornamento punteggi.
- **Bacheca Annunci & Regolamento Circolo**: Sezione notizie e spiegazione dettagliata del sistema di punteggio.

## Come iniziare (Sviluppo Locale)

1. Cliona o scarica il repository.
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

## Pubblicazione su GitHub

Per pubblicare il progetto sul tuo account GitHub:

1. Crea un nuovo repository su [GitHub](https://github.com/new) (es. `tennis-trissino-classifica`).
2. Inizializza git e collega il repository remoto dal terminale del tuo progetto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Tennis Comunali Trissino app"
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/TUO-REPOSITORY.git
   git push -u origin main
   ```

## Hosting & Deploy consigliati

Puoi ospitare gratuitamente l'applicazione su:
- **Vercel** (collegando il repository GitHub)
- **Netlify**
- **GitHub Pages** (tramite azioni di build statica)
- **Firebase Hosting**
