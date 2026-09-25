// Testi in italiano: sono la fonte del tipo `Messages`, quindi ogni altra lingua deve avere le stesse chiavi.

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

export const it = {
  common: {
    add: 'Aggiungi',
    cancel: 'Annulla',
    close: 'Chiudi',
    closeEsc: 'Chiudi (Esc)',
    complete: 'Completa',
    completed: 'Completato',
    delete: 'Elimina',
    none: 'Nessuna',
    noneMasculine: 'Nessuno',
    open: 'Apri',
    remove: 'Rimuovi',
    reopen: 'Riapri',
    save: 'Salva',
    undo: 'Annulla',
    today: 'Oggi',
    tomorrow: 'Domani',
    copied: 'Copiato negli appunti',
    copyFailed: (error: string) => `Impossibile copiare: ${error}`,
    addToMyDay: 'Aggiungi a Il mio giorno',
    removeFromMyDay: 'Togli da Il mio giorno',
    waiting: 'in attesa'
  },

  dates: {
    today: 'oggi',
    tomorrow: 'domani',
    yesterday: 'ieri'
  },

  priority: {
    label: { 3: 'Alta', 2: 'Media', 1: 'Bassa' },
    lower: { 3: 'alta', 2: 'media', 1: 'bassa' },
    named: (label: string) => `priorità ${label}`,
    change: 'Cambia priorità',
    filter: (label: string) => `Priorità ${label}`
  },

  groups: {
    overdue: 'Scaduti',
    today: 'Oggi',
    upcoming: 'Prossimi 7 giorni',
    later: 'Più avanti',
    noDue: 'Senza scadenza',
    completed: 'Completati'
  },

  recurrence: {
    weekdayNames: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
    weekdayInitials: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
    join: (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`),
    workdays: 'ogni giorno lavorativo',
    onWeekdays: (days: string) => `ogni ${days}`,
    daily: (n: number) => (n === 1 ? 'ogni giorno' : `ogni ${n} giorni`),
    weekly: (n: number) => (n === 1 ? 'ogni settimana' : `ogni ${n} settimane`),
    monthly: (n: number) => (n === 1 ? 'ogni mese' : `ogni ${n} mesi`),
    monthlyLastDay: (n: number) => (n === 1 ? 'ogni fine mese' : `ogni ${n} mesi a fine mese`),
    monthlyOnDay: (base: string, day: number) => `${base} il ${day}`,
    yearly: (n: number) => (n === 1 ? 'ogni anno' : `ogni ${n} anni`),
    fromCompletion: (text: string) => `${text} dal completamento`
  },

  summary: {
    noDue: 'senza scadenza',
    overdueBy: (days: number) => `scaduto da ${days} ${plural(days, 'giorno', 'giorni')}`,
    dueToday: 'in scadenza oggi',
    dueTodayAt: (time: string) => `in scadenza oggi alle ${time}`,
    dueOn: (due: string) => `scadenza ${due}`
  },

  text: {
    highPriority: 'priorità alta',
    filters: (list: string) => `Filtri: ${list}`,
    noOpenTasks: 'Nessun task aperto.',
    overdue: (n: number) => `Scaduti (${n})`,
    today: (n: number) => `Oggi (${n})`,
    upcoming: 'Prossimi 7 giorni',
    noDue: 'Senza scadenza',
    waiting: 'In attesa',
    stale: 'Fermi',
    startWith: (title: string, reason: string) => `Da dove iniziare: ${title} (${reason}).`,
    then: (titles: string) => `Poi: ${titles}.`,
    oneOnOne: (name: string, date: string) => `1:1 con ${name} · ${date}`,
    waitingOn: (name: string) => `In attesa da ${name}`,
    recentlyDone: 'Completati di recente',
    nothingWith: (name: string) => `Niente di aperto con ${name}.`
  },

  parser: {
    invalidDate: 'Data non valida',
    invalidTime: 'Orario non valido',
    estimateNoUnit: 'Stima senza unità (usa m oppure h)',
    invalidEstimate: 'Stima non valida',
    pastDate: 'Data nel passato',
    startAfterDue: 'La data di inizio è dopo la scadenza',
    duplicate: {
      date: 'Più di una data, ignorata',
      time: 'Più di un orario, ignorato',
      priority: 'Più di una priorità, ignorata',
      area: "Più di un'area, ignorata",
      recurrence: 'Più di una ripetizione, ignorata',
      start: 'Più di una data di inizio, ignorata',
      estimate: 'Più di una stima, ignorata'
    } as Record<string, string>
  },

  errors: {
    titleRequired: 'Il titolo è obbligatorio',
    invalidPriority: 'Priorità non valida',
    invalidDate: (value: string) => `Data non valida: ${value}`,
    invalidTime: (value: string) => `Orario non valido: ${value}`,
    invalidStartDate: (value: string) => `Data di inizio non valida: ${value}`,
    timeNeedsDate: 'Per impostare un orario serve una data',
    invalidEstimate: 'Stima non valida',
    areaMissing: 'Area inesistente',
    areaNameRequired: "Il nome dell'area è obbligatorio",
    areaNotFound: 'Area non trovata',
    areaExists: (name: string) => `Esiste già un'area "${name}"`,
    taskNotFound: 'Task non trovato',
    parentMissing: 'Task padre inesistente',
    nothingToRestore: 'Nessun task eliminato da ripristinare',
    invalidJson: 'Il file selezionato non è un JSON valido',
    untrustedSender: 'Mittente non autorizzato',
    schemaTooNew: (found: number, supported: number) =>
      `Il database è stato creato da una versione più recente di Plainlist (schema ${found}, questa versione arriva al ${supported}). ` +
      'Installa la versione più recente: i dati non sono stati toccati.',
    backupFailed: (folder: string, error: string) => `Backup non riuscito in ${folder}: ${error}`,
    hotkeyUnavailable: (keys: string) =>
      `La scorciatoia ${keys} non è disponibile: è già usata da un altro programma o non è valida.`
  },

  backupFile: {
    invalid: (detail: string) => `File di backup non valido: ${detail}`,
    notObject: 'non è un oggetto JSON',
    unknownFormat: 'formato sconosciuto',
    unsupportedVersion: (v: string) => `versione ${v} non supportata`,
    missingAreasOrTasks: 'mancano aree o task',
    invalidArea: 'area non valida',
    duplicateArea: (id: string) => `area duplicata ${id}`,
    taskWithoutId: 'task senza id',
    task: (id: string) => `task ${id}`,
    duplicate: 'duplicato',
    missingTitle: 'titolo mancante',
    invalidStatus: 'stato non valido',
    invalidPriority: 'priorità non valida',
    missingArea: 'area inesistente',
    invalidDate: 'data non valida',
    invalidTime: 'orario non valido',
    invalidSystemDates: 'date di sistema non valide',
    invalidCompletedAt: 'data di completamento non valida',
    invalidText: 'campi di testo non validi',
    invalidPeopleOrTags: 'persone o tag non validi',
    invalidHistory: 'storico non valido',
    invalidStartDate: 'data di inizio non valida',
    invalidMyDay: 'data "Il mio giorno" non valida',
    invalidEstimate: 'stima non valida',
    invalidRecurrence: 'ripetizione non valida',
    recurringNeedsDue: 'un task ricorrente deve avere una scadenza',
    missingParent: 'task padre inesistente',
    invalidSettings: 'impostazioni non valide'
  },

  system: {
    trayOpen: 'Apri Plainlist',
    trayMyDay: 'Il mio giorno',
    trayQuickAdd: 'Aggiunta rapida',
    trayUpdate: 'Update di oggi',
    traySettings: 'Impostazioni',
    trayQuit: 'Esci',
    trayCounts: (overdue: number, today: number) =>
      [overdue && `${overdue} ${plural(overdue, 'scaduto', 'scaduti')}`, today && `${today} oggi`].filter(Boolean).join(', '),
    digestTitle: 'Il punto di oggi',
    digestAllClear: 'Tutto in ordine',
    digestOverdue: (n: number) => `${n} ${plural(n, 'task scaduto', 'task scaduti')}`,
    digestToday: (n: number) => `${n} in scadenza oggi`,
    digestJoin: ' e ',
    digestNothing: 'Nessun task scaduto o in scadenza oggi.',
    digestStartWith: (title: string) => `Inizia da: ${title}`,
    dueNow: (time: string) => `È l'ora: ${time}`,
    dueIn: (minutes: number) => `Tra ${minutes} minuti`,
    backupFailedTitle: 'Backup automatico non riuscito',
    hotkeyUnavailableTitle: 'Scorciatoia non disponibile',
    cannotOpenData: 'Plainlist non può aprire i dati',
    dataFolder: (path: string) => `Cartella dei dati: ${path}`,
    exportTitle: 'Esporta i dati',
    importTitle: 'Importa i dati',
    backupFilter: 'Backup Plainlist',
    backupFolderTitle: 'Cartella per i backup automatici',
    backupFolderName: 'Plainlist Backup',
    quickAddTitle: 'Aggiunta rapida',
    defaultAreas: ['lavoro', 'casa', 'personale']
  },

  app: {
    added: (title: string) => `Aggiunto: ${title}`,
    deleted: (title: string) => `"${title}" eliminato`
  },

  sidebar: {
    search: 'Cerca  (Ctrl+F)',
    clearSearch: 'Cancella ricerca',
    myDay: 'Il mio giorno',
    myDayHint: 'Pianifica la giornata. Trascina qui un task per aggiungerlo',
    views: {
      all: 'Tutti',
      today: 'Oggi',
      tomorrow: 'Domani',
      upcoming: 'Prossimi 7 giorni',
      noDue: 'Senza scadenza',
      waiting: 'In attesa',
      scheduled: 'Programmati'
    },
    dropHint: (view: string) => `Trascina qui un task per spostarlo a ${view.toLowerCase()}`,
    update: 'Update',
    updateHint: 'Riepilogo (Ctrl+U)',
    completed: 'Completati',
    areas: 'Aree',
    people: 'Persone',
    personHint: (name: string) => `Tutto ciò che riguarda ${name}`,
    priority: 'Priorità',
    clearFilters: 'Rimuovi filtri',
    settings: 'Impostazioni',
    shortcuts: 'Ctrl+N nuovo · Ctrl+U update'
  },

  list: {
    titles: {
      all: 'Tutti i task',
      today: 'Oggi',
      tomorrow: 'Domani',
      upcoming: 'Prossimi 7 giorni',
      noDue: 'Senza scadenza',
      waiting: 'In attesa di altri',
      scheduled: 'Programmati'
    },
    waitingHint: 'Task delegati o in attesa di qualcun altro (+attesa). Non compaiono nei suggerimenti su cosa fare.',
    scheduledHint: 'Task nascosti fino a una data ("da lunedì", "dal 15/10"). Ricompaiono da soli quel giorno.',
    removeFilter: 'Rimuovi filtro',
    newTask: 'Nuovo',
    newTaskHint: 'Nuovo task con tutti i campi (Ctrl+Shift+N)',
    empty: 'Niente da mostrare qui.',
    emptyFiltered: 'Prova a rimuovere i filtri.',
    emptyHint: 'Scrivi un task nel campo in alto e premi Invio.',
    listLabel: 'Task'
  },

  quick: {
    placeholder: 'Cosa devi fare? es. Mandare preventivo @Marco venerdì alle 12 #lavoro !alta',
    addHint: 'Aggiungi (Invio)',
    missingTitle: 'Titolo mancante',
    visibleFrom: (date: string) => `visibile dal ${date}`,
    isNew: '(nuova)',
    isDefault: '(predefinita)',
    notRecognised: 'non riconosciuto, resta nel titolo',
    ignored: 'ignorato, resta nel titolo'
  },

  row: {
    hiddenUntil: 'Nascosto fino a questa data',
    from: (date: string) => `dal ${date}`,
    toTomorrow: 'Rimanda a domani',
    toNextWeek: 'Rimanda alla settimana prossima',
    deleteHint: 'Elimina (Canc)'
  },

  detail: {
    events: {
      created: 'Creato',
      updated: 'Modificato',
      completed: 'Completato',
      reopened: 'Riaperto',
      rescheduled: 'Scadenza cambiata',
      deleted: 'Eliminato',
      restored: 'Ripristinato'
    },
    todo: 'Da fare',
    enteredAs: 'Inserito come',
    history: 'Storico',
    noDate: 'nessuna',
    completedOn: (when: string) => `Completato il ${when}`
  },

  fields: {
    title: 'Titolo',
    notes: 'Note',
    due: 'Scadenza',
    time: 'Orario (facoltativo)',
    setDateFirst: 'Imposta prima una data',
    nextMonday: 'Lunedì prossimo',
    repeat: 'Ripetizione',
    visibleFrom: 'Visibile dal',
    visibleFromHint: 'Fino a questa data il task resta nascosto (lo trovi in Programmati)',
    alwaysVisible: 'Sempre visibile',
    priority: 'Priorità',
    estimate: 'Stima',
    area: 'Area',
    people: 'Persone',
    addPerson: 'Aggiungi una persona',
    waitingHint: 'Delegato o in attesa di qualcun altro: non compare nei suggerimenti su cosa fare',
    waitingOn: 'In attesa di altri',
    markWaiting: 'Segna come in attesa',
    tags: 'Tag',
    addTag: 'Aggiungi un tag',
    repeatOptions: {
      none: 'Non si ripete',
      daily: 'Ogni giorno',
      workdays: 'Giorni lavorativi',
      weekly: 'Ogni settimana',
      monthly: 'Ogni mese',
      yearly: 'Ogni anno'
    },
    every: 'ogni',
    units: { daily: 'giorni', weekly: 'settimane', monthly: 'mesi', yearly: 'anni' },
    onDay: 'il giorno',
    lastDayOfMonth: 'ultimo del mese',
    restartOnCompletion: 'Riparti dal giorno in cui lo completi',
    repeatSummary: (description: string) => `${description}. Completando il task compare il successivo.`
  },

  newTask: {
    title: 'Nuovo task',
    saveHint: 'Ctrl+Invio'
  },

  myDay: {
    title: 'Il mio giorno',
    estimated: (time: string) => `~${time} stimati`,
    noEstimate: 'Nessuna stima',
    available: (time: string) => `su ${time} disponibili`,
    alreadyDone: (time: string) => `· ${time} già fatti`,
    over: (time: string) => `oltre di ${time}`,
    unestimated: (n: number) => `${n} task senza stima: aggiungi ~30m o ~1h per un conto più preciso.`,
    addAll: 'Aggiungi tutti',
    emptyTitle: 'Nessun task pianificato per oggi.',
    emptyBefore: "Aggiungili dai suggerimenti, con l'icona",
    emptyAfter: 'su ogni task o trascinandoli su "Il mio giorno".',
    doneToday: 'Fatti oggi',
    suggestions: 'Suggerimenti',
    overdue: 'Scaduti',
    dueToday: 'In scadenza oggi',
    tomorrow: 'Domani',
    highPriority: 'Priorità alta',
    nothingUrgent: 'Niente di urgente da proporre.'
  },

  person: {
    counts: (open: number, waiting: number) => `${open} aperti · ${waiting} in attesa`,
    overdue: (n: number) => ` · ${n} scaduti`,
    copy: 'Copia per il 1:1',
    copyHint: 'Copia un riepilogo da incollare negli appunti del 1:1',
    copied: (name: string) => `Riepilogo per il 1:1 con ${name} copiato`,
    empty: (name: string, handle: string) =>
      `Nessun task con ${name}. Scrivi @${handle} nel campo in alto per collegarne uno.`,
    waitingOn: (name: string) => `In attesa da ${name}`,
    recentlyDone: 'Completati negli ultimi 14 giorni'
  },

  update: {
    allAreas: 'Tutte le aree',
    allPeople: 'Tutte le persone',
    copy: 'Copia',
    copyHint: 'Copia il riepilogo come testo, da incollare in Teams o in una mail',
    copied: 'Update copiato negli appunti',
    empty: 'Nessun task aperto. Ottimo lavoro.',
    counts: (c: { overdue: number; today: number; upcoming: number; noDue: number; waiting: number; stale: number }) =>
      `${c.overdue} ${plural(c.overdue, 'scaduto', 'scaduti')} · ${c.today} per oggi · ${c.upcoming} nei prossimi giorni · ` +
      `${c.noDue} senza scadenza · ${c.waiting} in attesa · ${c.stale} ${plural(c.stale, 'fermo', 'fermi')}`,
    overdue: (n: number) => `${n} ${plural(n, 'scaduto', 'scaduti')}`,
    today: 'Oggi',
    estimated: (time: string) => ` · ~${time} stimati`,
    nothingToday: 'Niente in scadenza oggi.',
    upcoming: 'Prossimi 7 giorni',
    noDue: 'Senza scadenza',
    waiting: 'In attesa di altri',
    stale: (days: number) => `Fermi da più di ${days} giorni`,
    staleFor: (days: number) => `fermo da ${days} giorni`,
    startWith: 'Da dove iniziare',
    then: (titles: string) => `Poi: ${titles}.`
  },

  history: {
    title: 'Completati',
    search: 'Cerca nei completati',
    empty: 'Nessun task completato.',
    emptySearch: 'Nessun task completato trovato.',
    showMore: 'Mostra altri'
  },

  settings: {
    title: 'Impostazioni',
    general: 'Generale',
    language: 'Lingua',
    languageHint: "Lingua dell'interfaccia e dell'inserimento rapido",
    languageChanged: 'Lingua cambiata. I campi data si aggiornano al riavvio.',
    restart: 'Riavvia',
    autostart: 'Avvia con Windows',
    autostartHint: "All'accesso l'app parte ridotta nell'area di notifica",
    theme: 'Tema',
    themes: { system: 'Come Windows', light: 'Chiaro', dark: 'Scuro' },
    defaultArea: 'Area predefinita',
    defaultAreaHint: "Usata dall'inserimento rapido quando non scrivi #area",
    tour: 'Tour di benvenuto',
    tourHint: 'Un giro veloce delle funzioni principali',
    tourAgain: 'Rivedi il tour',
    hotkey: 'Scorciatoia globale',
    hotkeyHint: "Apre l'aggiunta rapida da qualunque programma. Clicca e premi i tasti.",
    hotkeyRecording: 'Premi la combinazione…',
    spaceKey: 'Spazio',
    notifications: 'Notifiche',
    notificationsOn: 'Notifiche attive',
    startupDigest: "Riepilogo all'avvio",
    startupDigestHint: 'Numero di task scaduti e in scadenza oggi',
    unlockDigest: 'Riepilogo al primo sblocco del giorno',
    dueAlerts: "Avviso all'orario del task",
    remindBefore: 'Preavviso',
    minutesBefore: (m: number) => `${m} minuti prima`,
    listAndSummary: 'Elenco e riepilogo',
    upcomingDays: 'Giorni in "Prossimi giorni"',
    staleDays: 'Task fermi dopo (giorni)',
    workHours: 'Ore di lavoro al giorno',
    workHoursHint: 'Per il carico di Il mio giorno',
    undoSeconds: "Tempo per annullare un'eliminazione (secondi)",
    areas: 'Aree',
    color: 'Colore',
    restoreArea: 'Ripristina',
    archiveArea: "Archivia (nasconde l'area senza toccare i task)",
    newArea: 'Nuova area',
    deleteAreaTitle: "Eliminare l'area?",
    deleteAreaBefore: "L'area",
    deleteAreaAfter: 'verrà eliminata. I suoi task restano, ma senza area. Se vuoi solo nasconderla, usa "Archivia".',
    backup: 'Backup automatico',
    dailyBackup: 'Backup giornaliero',
    dailyBackupHint: 'Una volta al giorno salva tutti i dati in JSON (lo stesso formato di Esporta)',
    folder: 'Cartella',
    folderHint: 'Documenti\\Plainlist Backup. Se scegli una cartella dentro OneDrive, i backup vengono sincronizzati da OneDrive.',
    choose: 'Scegli…',
    keep: 'Backup da conservare',
    keepHint: 'I più vecchi vengono eliminati',
    lastBackup: 'Ultimo backup',
    neverRun: 'Non ancora eseguito',
    runNow: 'Esegui ora',
    backupSaved: (path: string) => `Backup salvato in ${path}`,
    data: 'Dati',
    export: 'Esporta',
    exportHint: 'Salva tutti i task, le aree e le impostazioni in un file JSON',
    exportButton: 'Esporta JSON',
    import: 'Importa',
    importHint: 'Sostituisce tutti i dati attuali con quelli del file (prima ne salva una copia)',
    importButton: 'Importa JSON',
    imported: (tasks: number, areas: number, path: string) =>
      `Importati ${tasks} task e ${areas} aree. Copia dei dati precedenti: ${path}`,
    dataFolder: 'Cartella dei dati',
    footer: (version: string) => `Plainlist ${version} · funziona offline, i dati restano su questo PC`,
    importTitle: 'Importare un backup?',
    importMessage:
      "Tutti i task, le aree e le impostazioni attuali verranno sostituiti con quelli del file. Prima dell'import viene salvata automaticamente una copia dei dati attuali.",
    chooseFile: 'Scegli il file…'
  },

  tour: {
    welcome: 'Benvenuto',
    welcomeTitle: 'Benvenuto in Plainlist',
    welcomeBody: 'Le tue cose da fare, offline e in italiano. Vuoi un giro veloce delle funzioni principali? Ci vuole circa un minuto.',
    welcomeLater: 'Puoi rivederlo da Impostazioni.',
    skip: 'Salta',
    start: 'Inizia il tour',
    stepOf: (step: number, total: number) => `${step} di ${total}`,
    close: 'Chiudi il tour (Esc)',
    tryExample: 'Prova un esempio',
    tryExampleHint: "Scrive l'esempio nel campo in alto, senza salvarlo",
    back: 'Indietro (←)',
    next: 'Avanti',
    nextHint: 'Avanti (→)',
    finish: 'Inizia'
  }
}

export type Messages = typeof it
