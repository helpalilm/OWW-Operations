// English / Italiano switch. Menus, buttons and messages are translated; item names, recipes and notes come from your sheets as written.
(function () {
  const L = localStorage.getItem('oww_lang') || ((navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en');
  OWW.lang = L; OWW.loc = () => L === 'it' ? 'it-IT' : 'en-GB'; document.documentElement.lang = L;
  OWW.setLang = l => { localStorage.setItem('oww_lang', l); location.reload(); };
  OWW.langBar = () => `<span class="seg" style="display:inline-flex"><button class="${L === 'en' ? 'on' : ''}" onclick="OWW.setLang('en')">EN</button><button class="${L === 'it' ? 'on' : ''}" onclick="OWW.setLang('it')">IT</button></span>`;
  if (L !== 'it') return;

  const D = {
    // login + account
    'Sign in with your work email': 'Accedi con la tua email di lavoro', 'Managers & directors only': 'Solo manager e direttori', 'Sign in': 'Accedi', 'Signing in…': 'Accesso in corso…',
    'Wrong email or password': 'Email o password errati', 'No connection to the server': 'Nessuna connessione al server', 'This app is for managers and directors only': 'Questa app è solo per manager e direttori',
    'Account': 'Account', 'Change password': 'Cambia password', 'Current password': 'Password attuale', 'New password (8+ characters)': 'Nuova password (min. 8 caratteri)', 'Save password': 'Salva password',
    'Sign out': 'Esci', 'Password changed': 'Password cambiata', 'Language / Lingua': 'Lingua / Language', 'Director': 'Direttore', 'Kitchen Manager': 'Resp. cucina', 'Staff': 'Personale',
    // nav + common
    'Prep': 'Prep', 'Message': 'Messaggio', 'Alerts': 'Allerte', 'Checks': 'Controlli', 'Shifts': 'Turni', 'Settings': 'Opzioni', 'Attendance': 'Presenze', 'Dashboard': 'Dashboard',
    'Stock': 'Scorte', 'Order': 'Ordini', 'Delivery': 'Consegna', 'Rota': 'Turni', 'HACCP': 'HACCP', 'Day': 'Giorno', 'Night': 'Notte', 'Morning': 'Mattina', 'Lunch': 'Pranzo', 'Dinner': 'Cena',
    'Cancel': 'Annulla', 'Close': 'Chiudi', 'Back': 'Indietro', 'Refresh': 'Aggiorna', '↻ Refresh': '↻ Aggiorna', 'Updating…': 'Aggiornamento…', 'Updated': 'Aggiornato', 'Loading…': 'Caricamento…',
    'Today': 'Oggi', 'Tomorrow': 'Domani', 'Custom': 'Personalizzato', 'From': 'Da', 'To': 'A', 'Date': 'Data', 'Start time': 'Ora inizio', 'End time': 'Ora fine', 'Time (optional)': 'Ora (facoltativa)',
    'Note (optional)': 'Nota (facoltativa)', 'Notes (optional)': 'Note (facoltative)', 'This week': 'Questa settimana', 'Last week': 'Settimana scorsa', 'This month': 'Questo mese', 'Days this month': 'Giorni nel mese',
    'Pending': 'In attesa', 'Approved': 'Approvato', 'Rejected': 'Rifiutato', 'syncing': 'sincronizzazione', 'saving': 'salvataggio', 'Approve': 'Approva', 'Reject': 'Rifiuta', 'OK': 'OK',
    // kitchen: prep + report
    'Kitchen Prep': 'Preparazioni', 'Search prep item…': 'Cerca preparazione…', 'Suggested for this shift': 'Suggeriti per questo turno', 'Done this shift': 'Fatto in questo turno',
    'WhatsApp report': 'Report WhatsApp', 'Stock alert': 'Allerta scorte', 'Message preview': 'Anteprima messaggio', 'To do next shift': 'Da fare nel prossimo turno', 'Add an item to Da Fare…': 'Aggiungi a Da Fare…',
    'Copy & open WhatsApp': 'Copia e apri WhatsApp', 'Nothing logged yet this shift': 'Nulla registrato in questo turno', 'Doses': 'Dosi', 'Log prep': 'Registra',
    'Logged ✓': 'Registrato ✓', 'Suggestions appear after the team has logged a few shifts. Use the search above meanwhile.': 'I suggerimenti compaiono dopo alcuni turni registrati. Nel frattempo usa la ricerca.',
    'Nothing planned. Search above to add items.': 'Nulla in programma. Cerca sopra per aggiungere.', 'No match': 'Nessun risultato', 'Upcoming events': 'Prossimi eventi',
    // kitchen: alerts
    'Flag a low-stock item': 'Segnala una scorta in esaurimento', 'Search any raw ingredient or consumable and say how much is left.': 'Cerca un ingrediente o consumabile e indica quanto ne resta.',
    'Search ingredient or consumable…': 'Cerca ingrediente o consumabile…', 'Your flags this week': 'Le tue segnalazioni di questa settimana', 'Resets every Friday after delivery.': 'Si azzera ogni venerdì dopo la consegna.',
    'No alerts raised this week': 'Nessuna segnalazione questa settimana', 'Waiting for manager': 'In attesa del manager', 'Ordered ✓': 'Ordinato ✓', 'Dismissed': 'Archiviata', 'Closed': 'Chiusa',
    'Send alert to manager': 'Invia allerta al manager', 'Alert sent ✓': 'Allerta inviata ✓', 'Already flagged this week': 'Già segnalato questa settimana', 'Ingredient': 'Ingrediente', 'Consumable': 'Consumabile',
    // kitchen: settings
    'Day shift': 'Turno giorno', 'Night shift': 'Turno notte', 'before 15:00': 'prima delle 15:00', 'from 15:00': 'dalle 15:00', 'Refresh data from sheet': 'Aggiorna i dati dal foglio', 'Data refreshed': 'Dati aggiornati',
    // shifts / attendance
    'Log shift': 'Registra turno', 'History': 'Storico', 'Save shift': 'Salva turno', 'Filter by date': 'Filtra per data', 'No shifts logged yet': 'Nessun turno registrato', 'No shifts logged on this date': 'Nessun turno in questa data',
    'e.g. covered the grill': 'es. ho coperto la griglia', 'Duration:': 'Durata:', '(overnight)': '(notturno)', 'Shift saved ✓': 'Turno salvato ✓', 'My upcoming shifts': 'I miei prossimi turni',
    'No planned shifts yet. Your manager adds them in the rota.': 'Nessun turno pianificato. Il tuo responsabile li inserisce nel piano turni.', 'Use for log': 'Usa per registrare',
    'Enter the date, start time and end time': 'Inserisci data, ora di inizio e ora di fine', 'Start and end time cannot be the same': 'Inizio e fine non possono coincidere',
    'Blocked: a shift cannot be longer than 7 hours': 'Bloccato: un turno non può superare 7 ore', 'Overlap: you already logged a shift that conflicts with this time': 'Sovrapposizione: hai già un turno in questo orario',
    // HACCP kitchen
    'Fridge temperatures': 'Temperature frigoriferi', 'Record every fridge and freezer at the start and at the end of your shift.': 'Registra ogni frigorifero e congelatore a inizio e fine turno.',
    'Start of shift': 'Inizio turno', 'End of shift': 'Fine turno', 'Save readings': 'Salva letture', 'Temperatures saved ✓': 'Temperature salvate ✓', 'Out of range': 'Fuori range',
    'No fridges set up yet. Ask your manager to add them in Admin → HACCP.': 'Nessun frigorifero configurato. Chiedi al manager di aggiungerli in Admin → HACCP.', 'Enter at least one temperature': 'Inserisci almeno una temperatura',
    // recipes
    '📖 Recipe & allergens': '📖 Ricetta e allergeni', 'Allergens': 'Allergeni', 'None recorded': 'Nessuno registrato', 'Ingredients per dose': 'Ingredienti per dose', 'Method': 'Procedimento',
    'No method written yet. Add it in the global sheet, RECIPES tab.': 'Nessun procedimento. Aggiungilo nel foglio globale, scheda RECIPES.',
    // admin dashboard
    'Admin': 'Admin', 'Staff attendance': 'Presenze del personale', 'Total hours': 'Ore totali', 'Hours per person': 'Ore per persona', 'Shift log': 'Registro turni', 'No shifts in this period': 'Nessun turno in questo periodo',
    '+ Add event': '+ Aggiungi evento', 'Add event': 'Aggiungi evento', 'Save event': 'Salva evento', 'No upcoming events. Tap “Add event”.': 'Nessun evento. Tocca “Aggiungi evento”.', 'Event added ✓': 'Evento aggiunto ✓',
    'Approve all pending': 'Approva tutti in attesa', 'Export CSV': 'Esporta CSV', 'Nothing pending in this period': 'Nulla in attesa in questo periodo', 'Reason (shown to the staff member)': 'Motivo (visibile al dipendente)',
    // admin haccp
    'Fridge temperature checks': 'Controllo temperature frigoriferi', 'Show': 'Mostra', 'Readings': 'Letture', 'Fridges': 'Frigoriferi', 'Fridges & freezers': 'Frigoriferi e congelatori', '+ Add fridge': '+ Aggiungi frigo',
    'Add fridge': 'Aggiungi frigo', 'Edit fridge': 'Modifica frigo', 'Name': 'Nome', 'Type': 'Tipo', 'Fridge': 'Frigorifero', 'Freezer': 'Congelatore', 'Other': 'Altro', 'Min °C': 'Min °C', 'Max °C': 'Max °C',
    'Active': 'Attivo', 'Inactive': 'Non attivo', 'Edit': 'Modifica', 'Save': 'Salva', 'Start': 'Inizio', 'End': 'Fine', 'No fridges yet. Tap “Add fridge”.': 'Nessun frigo. Tocca “Aggiungi frigo”.',
    // admin rota
    'Count by shelf walk': 'Conteggio giro scaffali', 'Start counting': 'Inizia a contare', '← Stock': '← Scorte', 'Walk the shelves and count what you see.': 'Percorri gli scaffali e conta ciò che vedi.',
    'Next shelf ›': 'Scaffale successivo ›', '‹ Previous shelf': '‹ Scaffale precedente', 'Review & finish': 'Controlla e concludi', 'Apply to stock': 'Applica alle scorte', 'Discard this count': 'Scarta questo conteggio', '‹ Back to counting': '‹ Torna al conteggio',
    'Counted': 'Contati', 'Big changes': 'Grandi differenze', 'Check these big changes': 'Controlla queste grandi differenze', 'Shelves with items not counted': 'Scaffali con articoli non contati', 'No items on this shelf': 'Nessun articolo su questo scaffale', 'Go': 'Vai',
    'Stock count': 'Conteggio scorte', 'Count →': 'Conta →', 'Never counted': 'Mai contato', 'Same as system': 'Come da sistema', 'Not counted': 'Non contato',
    'Nothing changes in your stock until you press “Apply to stock”. You can stop at any time and continue later, and anything you did not count stays as it is.': 'Le scorte non cambiano finché non premi “Applica alle scorte”. Puoi fermarti in qualsiasi momento e continuare dopo; ciò che non conti resta com’è.',
    'Items you did not count keep their current stock. Nothing changes until you press Apply.': 'Gli articoli non contati mantengono la scorta attuale. Non cambia nulla finché non premi Applica.',
    'Could not save your progress yet. Check the connection and try again.': 'Impossibile salvare i progressi. Controlla la connessione e riprova.',
    'Open Admin': 'Apri Admin', 'Open Kitchen': 'Apri Cucina', 'Start = now': 'Inizio = adesso', 'End = now': 'Fine = adesso', 'Late this month': 'Ritardi nel mese', 'Please tell us why': 'Dicci il motivo',
    'Transport': 'Trasporti', 'Illness': 'Malattia', 'Personal': 'Motivi personali', 'Approved by manager': 'Approvato dal manager', 'Excused': 'Giustificato', 'Excuse': 'Giustifica', 'Undo': 'Annulla', 'Punctuality': 'Puntualità',
    'Over late limit': 'Oltre il limite ritardi', 'Details': 'Dettagli', 'No late arrivals or early leaves this month': 'Nessun ritardo o uscita anticipata questo mese', '1 more = warning': 'Ancora 1 = avviso', 'Over limit': 'Oltre il limite', 'warned': 'avvisato', 'no email on file': 'nessuna email',
    'Today': 'Oggi', 'Team today': 'Team di oggi', 'On shift now': 'In turno ora', 'Shifts today': 'Turni oggi', 'Temp. out of range': 'Temp. fuori range', 'Open stock alerts': 'Allerte scorte aperte', 'To approve': 'Da approvare',
    'Off today': 'Assenti oggi', 'Now': 'Ora', 'Later': 'Dopo', 'Finished': 'Finito', 'Nobody is planned today': 'Nessuno in turno oggi', 'Deliveries & orders': 'Consegne e ordini', 'Nothing scheduled today': 'Niente in programma oggi',
    'No events this week': 'Nessun evento questa settimana', 'Events this week': 'Eventi della settimana', 'Review hours →': 'Controlla ore →', 'Hours waiting for approval': 'Ore in attesa di approvazione', 'Nothing waiting for approval': 'Niente da approvare',
    'No fridges set up yet': 'Nessun frigo configurato', 'Day · start': 'Giorno · inizio', 'Day · end': 'Giorno · fine', 'Night · start': 'Notte · inizio', 'Night · end': 'Notte · fine', '← Today': '← Oggi', 'Open order list →': 'Apri lista ordine →', 'Approve': 'Approva', 'Decline': 'Rifiuta', 'Cover': 'Sostituzione',
    'Total': 'Totale', 'Days': 'Giorni', 'Times (tap one or more — two for a split shift)': 'Orari (tocca uno o più — due per il turno spezzato)', 'Other start': 'Altro inizio', 'Other end': 'Altra fine', '+ Add this time': '+ Aggiungi questo orario', 'Or mark as': 'Oppure segna come',
    'Replace what is already planned on these days': 'Sostituisci ciò che è già pianificato in questi giorni', 'Already planned this week': 'Già pianificato questa settimana', 'Apply': 'Applica', 'Mon–Fri': 'Lun–Ven', 'Sat–Sun': 'Sab–Dom', 'All week': 'Tutta la settimana', 'Clear': 'Svuota',
    'Rest': 'Riposo', 'Holiday': 'Ferie', 'Sick': 'Malattia', 'Leave': 'Permesso', 'Absent': 'Assente', 'Rest day': 'Giorno di riposo', 'Pick at least one day': 'Scegli almeno un giorno',
    'Requests': 'Richieste', 'Request day off': 'Richiedi giorno libero', 'Ask a colleague to cover': 'Chiedi a un collega di sostituirti', 'Send request': 'Invia richiesta', 'Request sent ✓': 'Richiesta inviata ✓', 'Waiting for colleague': 'In attesa del collega', 'Waiting for manager': 'In attesa del manager',
    'Declined': 'Rifiutata', 'Cancelled': 'Annullata', 'Accept': 'Accetta', 'To (optional)': 'A (facoltativo)', '🔔 Turn on phone notifications': '🔔 Attiva le notifiche sul telefono', 'Reason (optional)': 'Motivo (facoltativo)',
    'Weekly rota': 'Piano turni settimanale', 'Import timetable': 'Importa piano turni', 'Import weekly timetable': 'Importa piano turni settimanale', 'Week starts on Monday': 'La settimana inizia il lunedì', 'Back to rota': 'Torna al piano turni', 'Import shifts': 'Importa turni', 'Copy previous week': 'Copia la settimana precedente', 'Add shift': 'Aggiungi turno',
    'Tap a cell to add or remove a shift. Staff get an email reminder about an hour before.': 'Tocca una cella per aggiungere o togliere un turno. Il personale riceve un’email circa un’ora prima.',
    'Only the director can edit the rota.': 'Solo il direttore può modificare il piano turni.',
    // admin stock / orders
    'Items': 'Elementi', 'Critical': 'Critico', 'Low': 'Basso', 'Not counted': 'Non contato', 'All': 'Tutti', 'Search stock…': 'Cerca scorte…', 'Import count from photo / PDF / CSV': 'Importa conteggio da foto / PDF / CSV',
    'Import a stock count': 'Importa un conteggio', 'Read file': 'Leggi file', 'Download blank count sheet (CSV)': 'Scarica foglio di conteggio vuoto (CSV)', 'Review': 'Revisione', 'Apply counts to stock': 'Applica conteggi alle scorte',
    'Order list': 'Lista ordine', 'Staff alerts': 'Allerte del personale', 'Send order via WhatsApp': 'Invia ordine via WhatsApp', 'Confirm delivery →': 'Conferma consegna →', 'Confirm delivery': 'Conferma consegna',
    'Confirm & update stock': 'Conferma e aggiorna scorte', 'Mark ordered': 'Segna ordinato', 'Dismiss': 'Ignora', 'No open alerts': 'Nessuna allerta aperta', 'Users': 'Utenti', 'Add user': 'Aggiungi utente', 'Create user': 'Crea utente',
    'Deactivate': 'Disattiva', 'Reactivate': 'Riattiva', 'Password': 'Password', 'First name': 'Nome', 'Last name': 'Cognome', 'Email': 'Email',
  };
  const R = [
    [/^(\d+) items?$/, (m, n) => n + (n === '1' ? ' elemento' : ' elementi')], [/^(\d+(?:\.\d+)?) dose$/, '$1 dosi'], [/^(\d+) shifts?$/, (m, n) => n + (n === '1' ? ' turno' : ' turni')],
    [/^in (\d+) days$/, 'tra $1 giorni'], [/^(\d+) open$/, '$1 aperte'], [/^(\d+) box$/, '$1 cartoni'], [/^(.+) approved$/, '$1 approvate'], [/^saved by (.+)$/, 'salvato da $1'],
    [/^(-?[\d.]+)° to (-?[\d.]+)°C$/, '$1° / $2°C'], [/^Shift saved · (.+) ✓$/, 'Turno salvato · $1 ✓'], [/^(\d+) items updated ✓$/, 'Aggiornati $1 elementi ✓'],
    [/^Approve (\d+) pending shifts in this period\?$/, 'Approvare $1 turni in attesa in questo periodo?'], [/^Not checked yet for: (.+)$/, 'Allergeni non ancora verificati per: $1'],
    [/^Check the temperature for (.+)$/, 'Controlla la temperatura di $1'], [/^Done: (.+)$/, 'Fatto: $1'], [/^Counted (\d+) of (\d+) items$/, 'Contati $1 su $2 articoli'], [/^started by (.+)$/, 'iniziato da $1'], [/^system: (.+)$/, 'sistema: $1'], [/^(\d+) left$/, '$1 da contare'], [/^(\d+) items updated$/, 'Aggiornati $1 articoli'], [/^(\d+) changed ✓$/, '$1 modificati ✓'], [/^In progress: (\d+) counted$/, 'In corso: $1 contati'], [/^Last count: (.+)$/, 'Ultimo conteggio: $1'], [/^Counted (\d+) of (\d+) items · started by (.+)$/, 'Contati $1 di $2 articoli · iniziato da $3'], [/^(\d+) left$/, '$1 rimasti'], [/^system: (.+)$/, 'sistema: $1'], [/^never counted$/, 'mai contato'], [/^Late (\d+) min$/, 'Ritardo $1 min'], [/^Left early (\d+) min$/, 'Uscita anticipata $1 min'], [/^Late arrival: (\d+) min$/, 'Ritardo: $1 min'], [/^Early leave: (\d+) min$/, 'Uscita anticipata: $1 min'], [/^Planned (.+)$/, 'Previsto $1'], [/^Actual (.+)$/, 'Effettivo $1'], [/^Late (\d+)×$/, 'Ritardi $1×'], [/^Early leave (\d+)×$/, 'Uscite anticipate $1×'], [/^excused (\d+)$/, 'giustificati $1'], [/^(\d+) min late in total$/, '$1 min di ritardo totale'], [/^Cover: (.+)$/, 'Sostituzione: $1'], [/^(.+) asks you to cover$/, '$1 ti chiede di sostituirlo/a'], [/^Shelf life: (.+)$/, 'Conservazione: $1'],
  ];
  const one = s => { const k = s.trim(); if (D[k] !== undefined) return D[k]; for (const [re, to] of R) if (re.test(k)) return k.replace(re, to); return k; };
  const tr = s => { const k = s.trim(); if (D[k] !== undefined) return D[k]; return k.includes(' · ') ? k.split(' · ').map(one).join(' · ') : one(k); };
  const skip = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);
  function node(n) {
    if (n.nodeType === 3) { const k = n.nodeValue.trim(); if (k) { const o = tr(k); if (o !== k) n.nodeValue = n.nodeValue.replace(k, o); } }
    else if (n.nodeType === 1 && !skip.has(n.tagName)) {
      for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute(a); if (v) { const o = tr(v); if (o !== v) n.setAttribute(a, o); } }
      n.childNodes.forEach(node);
    }
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(node))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => node(document.body));
})();
