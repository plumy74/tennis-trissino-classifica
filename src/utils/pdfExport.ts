import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tournament, TournamentMatch, RoundRobinStanding, RankingMatch } from '../types/tennis';

/**
 * Esporta il tabellone grafico ufficiale con linee di dipendenza gerarchica (stile FITP / albero)
 */
export function exportTournamentToPDF(
  tournament: Tournament,
  matches: TournamentMatch[],
  clubName: string = 'Tennis Comunali Trissino',
  standings?: RoundRobinStanding[]
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Se è Round Robin, genera la tabella delle classifiche e incontri
  if (tournament.type === 'round_robin') {
    exportRoundRobinPDF(doc, tournament, matches, clubName, pageWidth, pageHeight, standings);
    return;
  }

  // --- TABELLONE AD ELIMINAZIONE DIRETTA CON LINEE DI DIPENDENZA (ALBERO) ---
  let currentY = 12;

  // Intestazione pulita in alto a sinistra
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${clubName.toUpperCase()} — ${tournament.name.toUpperCase()}`, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Categoria: ${tournament.category}  •  Superficie: ${tournament.surface}  •  Periodo: ${tournament.startDate} - ${tournament.endDate}`, 14, currentY + 5);

  currentY += 12;

  // Raggruppa i match per round
  const roundsMap = new Map<number, TournamentMatch[]>();
  matches.forEach(m => {
    const r = m.round || 1;
    if (!roundsMap.has(r)) roundsMap.set(r, []);
    roundsMap.get(r)!.push(m);
  });

  const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
  const totalRounds = rounds.length;

  if (totalRounds === 0) {
    doc.text('Nessun incontro disponibile nel tabellone.', 14, currentY + 10);
    doc.save(`Tabellone_${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    return;
  }

  const colWidth = Math.floor((pageWidth - 28) / Math.max(totalRounds, 1));
  const boxWidth = colWidth - 10;
  const boxHeight = 14;
  const startX = 14;

  // Mappa per memorizzare le coordinate (x, y centrali) di ogni match per disegnare le linee
  const matchCoords = new Map<string, { x: number; y: number }>();

  // Calcola prima le coordinate di tutti i match
  rounds.forEach((roundNum, colIdx) => {
    const roundMatches = roundsMap.get(roundNum) || [];
    const x = startX + (colIdx * colWidth);
    const availableHeight = pageHeight - currentY - 15;
    const totalItems = roundMatches.length;
    const verticalStep = availableHeight / Math.max(totalItems, 1);

    roundMatches.forEach((m, matchIdx) => {
      const y = currentY + 6 + (matchIdx * verticalStep) + (verticalStep / 2) - (boxHeight / 2);
      matchCoords.set(m.id, { x: x + boxWidth, y: y + (boxHeight / 2) });
    });
  });

  // Disegna le linee di collegamento (gerarchia) prima dei box
  rounds.forEach((roundNum) => {
    const roundMatches = roundsMap.get(roundNum) || [];
    roundMatches.forEach((m) => {
      if (m.nextMatchId && matchCoords.has(m.id) && matchCoords.has(m.nextMatchId)) {
        const from = matchCoords.get(m.id)!;
        const to = matchCoords.get(m.nextMatchId)!;

        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.3);

        // Linea orizzontale dal match corrente verso destra, poi verticale, poi orizzontale al match successivo
        const midX = from.x + (to.x - from.x) / 2;
        doc.line(from.x, from.y, midX, from.y);
        doc.line(midX, from.y, midX, to.y);
        doc.line(midX, to.y, to.x - boxWidth, to.y);
      }
    });
  });

  // Disegna i box dei match per ogni round
  rounds.forEach((roundNum, colIdx) => {
    const roundMatches = roundsMap.get(roundNum) || [];
    const roundName = roundMatches[0]?.roundName || `Turno ${roundNum}`;
    const x = startX + (colIdx * colWidth);

    // Intestazione colonna round
    doc.setFillColor(241, 245, 249);
    doc.rect(x, currentY, boxWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    let roundHeader = roundName.toUpperCase();
    const deadline = tournament.roundDeadlines?.[roundName];
    if (deadline) {
      const [y, m, d] = deadline.split('-');
      const formattedDate = d && m ? `${d}/${m}` : deadline;
      roundHeader += ` (Scad:${formattedDate})`;
    }
    doc.text(roundHeader, x + 1.5, currentY + 3.8);

    const availableHeight = pageHeight - currentY - 15;
    const totalItems = roundMatches.length;
    const verticalStep = availableHeight / Math.max(totalItems, 1);

    roundMatches.forEach((m, matchIdx) => {
      const y = currentY + 6 + (matchIdx * verticalStep) + (verticalStep / 2) - (boxHeight / 2);

      const p1Name = m.player1Name ? `${m.player1Seed ? `(${m.player1Seed}) ` : ''}${m.player1Name}` : 'BYE / Da definire';
      const p2Name = m.player2Name ? `${m.player2Seed ? `(${m.player2Seed}) ` : ''}${m.player2Name}` : 'BYE / Da definire';

      const isP1Winner = m.winnerId && m.winnerId === m.player1Id;
      const isP2Winner = m.winnerId && m.winnerId === m.player2Id;

      // Box partita
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, boxWidth, boxHeight, 'FD');

      // Linea divisoria interna
      doc.line(x, y + (boxHeight / 2), x + boxWidth, y + (boxHeight / 2));

      // Giocatore 1
      doc.setFont('helvetica', isP1Winner ? 'bold' : 'normal');
      doc.setTextColor(isP1Winner ? 15 : 51, isP1Winner ? 23 : 65, isP1Winner ? 42 : 85);
      doc.setFontSize(7);
      doc.text(p1Name, x + 2, y + 3.8);

      // Giocatore 2
      doc.setFont('helvetica', isP2Winner ? 'bold' : 'normal');
      doc.setTextColor(isP2Winner ? 15 : 51, isP2Winner ? 23 : 65, isP2Winner ? 42 : 85);
      doc.text(p2Name, x + 2, y + boxHeight - 2.5);

      // Punteggio se completato
      if (m.status === 'completed' && m.score) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(225, 29, 72);
        doc.text(m.score, x + boxWidth - 18, y + (boxHeight / 2) + 1.2);
      }
    });
  });

  const filename = `Tabellone_${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Esporta PDF per tornei Round Robin (Girone all'italiana)
 */
function exportRoundRobinPDF(
  doc: jsPDF,
  tournament: Tournament,
  matches: TournamentMatch[],
  clubName: string,
  pageWidth: number,
  pageHeight: number,
  standings?: RoundRobinStanding[]
) {
  let currentY = 14;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${clubName.toUpperCase()}  |  ${tournament.name.toUpperCase()}`, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Formula: Girone all'italiana  •  Categoria: ${tournament.category}  •  Periodo: ${tournament.startDate} - ${tournament.endDate}`, 14, currentY + 6);

  currentY += 14;

  if (standings && standings.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('CLASSIFICA GIRONE', 14, currentY);
    currentY += 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('#', 17, currentY + 4);
    doc.text('GIOCATORE', 26, currentY + 4);
    doc.text('PG', 120, currentY + 4);
    doc.text('V', 135, currentY + 4);
    doc.text('P', 150, currentY + 4);
    doc.text('SET', 170, currentY + 4);
    doc.text('GAME', 195, currentY + 4);
    doc.text('PUNTI', 225, currentY + 4);
    currentY += 6;

    standings.forEach((s, idx) => {
      doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, pageWidth - 28, 5.5, 'F');
      }

      doc.text(`${idx + 1}°`, 17, currentY + 4);
      doc.text(s.player.name, 26, currentY + 4);
      doc.text(s.played.toString(), 120, currentY + 4);
      doc.text(s.won.toString(), 135, currentY + 4);
      doc.text(s.lost.toString(), 150, currentY + 4);
      doc.text(`${s.setsWon}-${s.setsLost}`, 170, currentY + 4);
      doc.text(`${s.gamesWon}-${s.gamesLost}`, 195, currentY + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.points} pt`, 225, currentY + 4);
      currentY += 5.5;
    });

    currentY += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CALENDARIO INCONTRI', 14, currentY);
  currentY += 4;

  const rounds = Array.from(new Set(matches.map(m => m.roundName)));

  rounds.forEach(roundName => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    let roundHeader = roundName.toUpperCase();
    const deadline = tournament.roundDeadlines?.[roundName];
    if (deadline) {
      const [y, m, d] = deadline.split('-');
      const formattedDate = d && m ? `${d}/${m}/${y}` : deadline;
      roundHeader += `   (Scadenza turno: ${formattedDate})`;
    }
    doc.text(roundHeader, 18, currentY + 4);
    currentY += 7;

    const roundMatches = matches.filter(m => m.roundName === roundName);

    roundMatches.forEach((m) => {
      if (currentY > pageHeight - 15) {
        doc.addPage();
        currentY = 15;
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const isP1Winner = m.winnerId && m.winnerId === m.player1Id;
      doc.setFont('helvetica', isP1Winner ? 'bold' : 'normal');
      doc.setTextColor(isP1Winner ? 16 : 71, isP1Winner ? 185 : 85, isP1Winner ? 129 : 105);
      const p1Text = `${m.player1Seed ? `(${m.player1Seed}) ` : ''}${m.player1Name}`;
      doc.text(p1Text, 18, currentY + 3.5);

      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('vs', 110, currentY + 3.5);

      const isP2Winner = m.winnerId && m.winnerId === m.player2Id;
      doc.setFont('helvetica', isP2Winner ? 'bold' : 'normal');
      doc.setTextColor(isP2Winner ? 16 : 71, isP2Winner ? 185 : 85, isP2Winner ? 129 : 105);
      const p2Text = `${m.player2Seed ? `(${m.player2Seed}) ` : ''}${m.player2Name}`;
      doc.text(p2Text, 120, currentY + 3.5);

      doc.setFont('helvetica', 'bold');
      if (m.status === 'completed') {
        doc.setTextColor(15, 23, 42);
        doc.text(m.score || 'Completato', 210, currentY + 3.5);
      } else if (m.status === 'bye') {
        doc.setTextColor(148, 163, 184);
        doc.text('BYE', 210, currentY + 3.5);
      } else {
        doc.setTextColor(202, 138, 4);
        doc.text('Da disputare', 210, currentY + 3.5);
      }

      currentY += 6;
    });

    currentY += 3;
  });

  const filename = `Tabellone_${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Prepara e apre la condivisione rapida via WhatsApp con testo pronto
 */
export function shareTournamentViaWhatsApp(
  tournament: Tournament,
  matches: TournamentMatch[],
  clubName: string = 'Tennis Comunali Trissino'
) {
  const completedCount = matches.filter(m => m.status === 'completed').length;
  const totalCount = matches.filter(m => m.status !== 'bye').length;

  let message = `🎾 *${clubName.toUpperCase()}*\n`;
  message += `🏆 *${tournament.name}* (${tournament.category})\n`;
  message += `📅 Periodo: ${tournament.startDate} - ${tournament.endDate}\n`;
  message += `📊 Avanzamento: ${completedCount}/${totalCount} partite completate\n\n`;

  if (tournament.winnerName) {
    message += `👑 *VINCITORE TORNEO:* ${tournament.winnerName} 🏆\n\n`;
  }

  // Raggruppa i match per round
  const roundsMap = new Map<string, TournamentMatch[]>();
  matches.forEach(m => {
    const rName = m.roundName || `Turno ${m.round}`;
    if (!roundsMap.has(rName)) roundsMap.set(rName, []);
    roundsMap.get(rName)!.push(m);
  });

  message += `*📋 STATO TURNI E INCONTRI:*\n\n`;

  roundsMap.forEach((roundMatches, roundName) => {
    const deadline = tournament.roundDeadlines?.[roundName];
    message += `🔹 *${roundName.toUpperCase()}*`;
    if (deadline) {
      const [y, m, d] = deadline.split('-');
      const formattedDate = d && m ? `${d}/${m}/${y}` : deadline;
      message += ` (📅 Scadenza: ${formattedDate})`;
    }
    message += `\n`;

    roundMatches.forEach(m => {
      if (m.status === 'bye') return;
      const p1 = m.player1Name || 'Da definire';
      const p2 = m.player2Name || 'Da definire';
      if (m.status === 'completed') {
        const winner = m.winnerId === m.player1Id ? p1 : p2;
        message += `  • ${p1} vs ${p2}\n    👉 Vinto da *${winner}* (${m.score})\n\n`;
      } else {
        message += `  • ${p1} vs ${p2}\n    ⏳ Da disputare\n\n`;
      }
    });
    message += `\n`;
  });

  message += `Consulta il tabellone completo e la bacheca del circolo online! 🎾💪`;

  const encoded = encodeURIComponent(message);
  
  if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
    navigator.share({
      title: `${clubName} - ${tournament.name}`,
      text: message
    }).catch(() => {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

/**
 * Prepara link di condivisione email
 */
export function shareTournamentViaEmail(
  tournament: Tournament,
  matches: TournamentMatch[],
  clubName: string = 'Tennis Comunali Trissino'
) {
  const subject = encodeURIComponent(`[${clubName}] Aggiornamento Tabellone: ${tournament.name}`);
  let body = `Gentili Soci e Giocatori,\n\n`;
  body += `Vi inviamo il tabellone aggiornato per il torneo "${tournament.name}" (${tournament.category}, ${tournament.surface}).\n\n`;

  if (tournament.winnerName) {
    body += `🏆 Complimenti al vincitore del torneo: ${tournament.winnerName}!\n\n`;
  }

  // Raggruppa i match per round
  const roundsMap = new Map<string, TournamentMatch[]>();
  matches.forEach(m => {
    const rName = m.roundName || `Turno ${m.round}`;
    if (!roundsMap.has(rName)) roundsMap.set(rName, []);
    roundsMap.get(rName)!.push(m);
  });

  body += `========================================\n`;
  body += `CALENDARIO INCONTRI E SCADENZE TURNI\n`;
  body += `========================================\n\n`;

  roundsMap.forEach((roundMatches, roundName) => {
    const deadline = tournament.roundDeadlines?.[roundName];
    body += `--- ${roundName.toUpperCase()} ---`;
    if (deadline) {
      const [y, m, d] = deadline.split('-');
      const formattedDate = d && m ? `${d}/${m}/${y}` : deadline;
      body += ` [Scadenza turno: ${formattedDate}]`;
    }
    body += `\n\n`;

    roundMatches.forEach(m => {
      if (m.status === 'bye') return;
      const p1 = m.player1Name || 'Da definire';
      const p2 = m.player2Name || 'Da definire';
      if (m.status === 'completed') {
        body += `  • ${p1} vs ${p2}\n    Risultato: ${m.score} (Vincitore: ${m.winnerId === m.player1Id ? p1 : p2})\n\n`;
      } else {
        body += `  • ${p1} vs ${p2}\n    [In programma / Da disputare]\n\n`;
      }
    });
    body += `\n`;
  });

  body += `Il tabellone completo è affisso anche nella bacheca del circolo.\n\nCordiali saluti,\nLa Direzione del ${clubName}`;

  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}

/**
 * Esporta lo storico dei risultati in PDF
 */
export function exportMatchHistoryToPDF(
  matches: RankingMatch[],
  categoryLabel: string = 'Generale',
  clubName: string = 'Tennis Comunali Trissino'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${clubName.toUpperCase()} — STORICO PARTITE (${categoryLabel.toUpperCase()})`, 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Totale incontri registrati: ${matches.length}  •  Generato il ${new Date().toLocaleDateString('it-IT')}`, 14, 21);

  const tableData = matches.map((m, idx) => {
    const dateFormatted = new Date(m.date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const typeLabel = m.matchType === 'timed' ? 'A Tempo (1h)' : 'Classica';
    return [
      idx + 1,
      dateFormatted,
      m.category.toUpperCase(),
      m.player1Name,
      m.player2Name,
      m.score,
      typeLabel,
      `+${m.pointsAwardedWinner} pt`
    ];
  });

  autoTable(doc, {
    startY: 26,
    head: [['#', 'Data', 'Cat.', 'Giocatore 1', 'Giocatore 2', 'Punteggio', 'Formato', 'Punti']],
    body: tableData,
    headStyles: { fillColor: [249, 115, 22] }, // orange-500
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 20 },
      3: { cellWidth: 42 },
      4: { cellWidth: 42 },
      5: { cellWidth: 24 },
      6: { cellWidth: 22 },
      7: { cellWidth: 16 }
    }
  });

  doc.save(`Storico_Partite_${categoryLabel.replace(/\s+/g, '_')}.pdf`);
}
