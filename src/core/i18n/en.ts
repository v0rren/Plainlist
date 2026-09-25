import type { Messages } from './it'

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

export const en: Messages = {
  common: {
    add: 'Add',
    cancel: 'Cancel',
    close: 'Close',
    closeEsc: 'Close (Esc)',
    complete: 'Complete',
    completed: 'Completed',
    delete: 'Delete',
    none: 'None',
    noneMasculine: 'None',
    open: 'Open',
    remove: 'Remove',
    reopen: 'Reopen',
    save: 'Save',
    undo: 'Undo',
    today: 'Today',
    tomorrow: 'Tomorrow',
    copied: 'Copied to clipboard',
    copyFailed: (error) => `Couldn't copy: ${error}`,
    addToMyDay: 'Add to My Day',
    removeFromMyDay: 'Remove from My Day',
    waiting: 'waiting'
  },

  dates: {
    today: 'today',
    tomorrow: 'tomorrow',
    yesterday: 'yesterday'
  },

  priority: {
    label: { 3: 'High', 2: 'Medium', 1: 'Low' },
    lower: { 3: 'high', 2: 'medium', 1: 'low' },
    named: (label) => `${label} priority`,
    change: 'Change priority',
    filter: (label) => `${label.charAt(0).toUpperCase()}${label.slice(1)} priority`
  },

  groups: {
    overdue: 'Overdue',
    today: 'Today',
    upcoming: 'Next 7 days',
    later: 'Later',
    noDue: 'No due date',
    completed: 'Completed'
  },

  recurrence: {
    weekdayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    weekdayInitials: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    join: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`),
    workdays: 'every weekday',
    onWeekdays: (days) => `every ${days}`,
    daily: (n) => (n === 1 ? 'every day' : `every ${n} days`),
    weekly: (n) => (n === 1 ? 'every week' : `every ${n} weeks`),
    monthly: (n) => (n === 1 ? 'every month' : `every ${n} months`),
    monthlyLastDay: (n) => (n === 1 ? 'every month on the last day' : `every ${n} months on the last day`),
    monthlyOnDay: (base, day) => `${base} on the ${ordinal(day)}`,
    yearly: (n) => (n === 1 ? 'every year' : `every ${n} years`),
    fromCompletion: (text) => `${text} after completion`
  },

  summary: {
    noDue: 'no due date',
    overdueBy: (days) => `overdue by ${days} ${plural(days, 'day', 'days')}`,
    dueToday: 'due today',
    dueTodayAt: (time) => `due today at ${time}`,
    dueOn: (due) => `due ${due}`
  },

  text: {
    highPriority: 'high priority',
    filters: (list) => `Filters: ${list}`,
    noOpenTasks: 'No open tasks.',
    overdue: (n) => `Overdue (${n})`,
    today: (n) => `Today (${n})`,
    upcoming: 'Next 7 days',
    noDue: 'No due date',
    waiting: 'Waiting',
    stale: 'Stalled',
    startWith: (title, reason) => `Start with: ${title} (${reason}).`,
    then: (titles) => `Then: ${titles}.`,
    oneOnOne: (name, date) => `1:1 with ${name} · ${date}`,
    waitingOn: (name) => `Waiting on ${name}`,
    recentlyDone: 'Recently completed',
    nothingWith: (name) => `Nothing open with ${name}.`
  },

  parser: {
    invalidDate: 'Invalid date',
    invalidTime: 'Invalid time',
    estimateNoUnit: 'Estimate without a unit (use m or h)',
    invalidEstimate: 'Invalid estimate',
    pastDate: 'Date in the past',
    startAfterDue: 'The start date is after the due date',
    duplicate: {
      date: 'More than one date, ignored',
      time: 'More than one time, ignored',
      priority: 'More than one priority, ignored',
      area: 'More than one area, ignored',
      recurrence: 'More than one repetition, ignored',
      start: 'More than one start date, ignored',
      estimate: 'More than one estimate, ignored'
    }
  },

  errors: {
    titleRequired: 'A title is required',
    invalidPriority: 'Invalid priority',
    invalidDate: (value) => `Invalid date: ${value}`,
    invalidTime: (value) => `Invalid time: ${value}`,
    invalidStartDate: (value) => `Invalid start date: ${value}`,
    timeNeedsDate: 'Set a date before setting a time',
    invalidEstimate: 'Invalid estimate',
    areaMissing: "That area doesn't exist",
    areaNameRequired: 'An area needs a name',
    areaNotFound: 'Area not found',
    areaExists: (name) => `An area called "${name}" already exists`,
    taskNotFound: 'Task not found',
    parentMissing: "Parent task doesn't exist",
    nothingToRestore: 'No deleted task to restore',
    invalidJson: "The selected file isn't valid JSON",
    untrustedSender: 'Unauthorized sender',
    schemaTooNew: (found, supported) =>
      `The database was created by a newer version of Plainlist (schema ${found}, this version supports up to ${supported}). ` +
      "Install the latest version: your data hasn't been touched.",
    backupFailed: (folder, error) => `Backup to ${folder} failed: ${error}`,
    hotkeyUnavailable: (keys) => `The shortcut ${keys} isn't available: another program already uses it, or it isn't valid.`
  },

  backupFile: {
    invalid: (detail) => `Invalid backup file: ${detail}`,
    notObject: 'not a JSON object',
    unknownFormat: 'unknown format',
    unsupportedVersion: (v) => `version ${v} is not supported`,
    missingAreasOrTasks: 'areas or tasks are missing',
    invalidArea: 'invalid area',
    duplicateArea: (id) => `duplicate area ${id}`,
    taskWithoutId: 'task without an id',
    task: (id) => `task ${id}`,
    duplicate: 'duplicated',
    missingTitle: 'missing title',
    invalidStatus: 'invalid status',
    invalidPriority: 'invalid priority',
    missingArea: 'area does not exist',
    invalidDate: 'invalid date',
    invalidTime: 'invalid time',
    invalidSystemDates: 'invalid system dates',
    invalidCompletedAt: 'invalid completion date',
    invalidText: 'invalid text fields',
    invalidPeopleOrTags: 'invalid people or tags',
    invalidHistory: 'invalid history',
    invalidStartDate: 'invalid start date',
    invalidMyDay: 'invalid "My Day" date',
    invalidEstimate: 'invalid estimate',
    invalidRecurrence: 'invalid repetition',
    recurringNeedsDue: 'a recurring task needs a due date',
    missingParent: 'parent task does not exist',
    invalidSettings: 'invalid settings'
  },

  system: {
    trayOpen: 'Open Plainlist',
    trayMyDay: 'My Day',
    trayQuickAdd: 'Quick add',
    trayUpdate: "Today's update",
    traySettings: 'Settings',
    trayQuit: 'Quit',
    trayCounts: (overdue, today) =>
      [overdue && `${overdue} overdue`, today && `${today} today`].filter(Boolean).join(', '),
    digestTitle: 'Your day at a glance',
    digestAllClear: 'All clear',
    digestOverdue: (n) => `${n} overdue ${plural(n, 'task', 'tasks')}`,
    digestToday: (n) => `${n} due today`,
    digestJoin: ' and ',
    digestNothing: 'Nothing overdue or due today.',
    digestStartWith: (title) => `Start with: ${title}`,
    dueNow: (time) => `It's time: ${time}`,
    dueIn: (minutes) => `In ${minutes} minutes`,
    backupFailedTitle: 'Automatic backup failed',
    hotkeyUnavailableTitle: 'Shortcut unavailable',
    cannotOpenData: "Plainlist can't open its data",
    dataFolder: (path) => `Data folder: ${path}`,
    exportTitle: 'Export data',
    importTitle: 'Import data',
    backupFilter: 'Plainlist backup',
    backupFolderTitle: 'Folder for automatic backups',
    backupFolderName: 'Plainlist Backup',
    quickAddTitle: 'Quick add',
    defaultAreas: ['work', 'home', 'personal']
  },

  app: {
    added: (title) => `Added: ${title}`,
    deleted: (title) => `"${title}" deleted`
  },

  sidebar: {
    search: 'Search  (Ctrl+F)',
    clearSearch: 'Clear search',
    myDay: 'My Day',
    myDayHint: 'Plan your day. Drag a task here to add it',
    views: {
      all: 'All',
      today: 'Today',
      tomorrow: 'Tomorrow',
      upcoming: 'Next 7 days',
      noDue: 'No due date',
      waiting: 'Waiting',
      scheduled: 'Scheduled'
    },
    dropHint: (view) => `Drag a task here to move it to ${view.toLowerCase()}`,
    update: 'Update',
    updateHint: 'Summary (Ctrl+U)',
    completed: 'Completed',
    areas: 'Areas',
    people: 'People',
    personHint: (name) => `Everything about ${name}`,
    priority: 'Priority',
    clearFilters: 'Clear filters',
    settings: 'Settings',
    shortcuts: 'Ctrl+N new · Ctrl+U update'
  },

  list: {
    titles: {
      all: 'All tasks',
      today: 'Today',
      tomorrow: 'Tomorrow',
      upcoming: 'Next 7 days',
      noDue: 'No due date',
      waiting: 'Waiting on others',
      scheduled: 'Scheduled'
    },
    waitingHint: "Tasks you delegated or are waiting on (+waiting). They don't show up in suggestions of what to do.",
    scheduledHint: 'Tasks hidden until a date ("from monday", "starting 15/10"). They come back on their own that day.',
    removeFilter: 'Remove filter',
    newTask: 'New',
    newTaskHint: 'New task with all fields (Ctrl+Shift+N)',
    empty: 'Nothing to show here.',
    emptyFiltered: 'Try removing the filters.',
    emptyHint: 'Type a task in the box at the top and press Enter.',
    listLabel: 'Tasks'
  },

  quick: {
    placeholder: 'What do you need to do? e.g. Send quote to @Marco friday at 12 #work !high',
    addHint: 'Add (Enter)',
    missingTitle: 'Missing title',
    visibleFrom: (date) => `visible from ${date}`,
    isNew: '(new)',
    isDefault: '(default)',
    notRecognised: 'not recognised, stays in the title',
    ignored: 'ignored, stays in the title'
  },

  row: {
    hiddenUntil: 'Hidden until this date',
    from: (date) => `from ${date}`,
    toTomorrow: 'Move to tomorrow',
    toNextWeek: 'Move to next week',
    deleteHint: 'Delete (Del)'
  },

  detail: {
    events: {
      created: 'Created',
      updated: 'Edited',
      completed: 'Completed',
      reopened: 'Reopened',
      rescheduled: 'Due date changed',
      deleted: 'Deleted',
      restored: 'Restored'
    },
    todo: 'To do',
    enteredAs: 'Entered as',
    history: 'History',
    noDate: 'none',
    completedOn: (when) => `Completed on ${when}`
  },

  fields: {
    title: 'Title',
    notes: 'Notes',
    due: 'Due',
    time: 'Time (optional)',
    setDateFirst: 'Set a date first',
    nextMonday: 'Next Monday',
    repeat: 'Repeat',
    visibleFrom: 'Visible from',
    visibleFromHint: 'The task stays hidden until this date (you can find it in Scheduled)',
    alwaysVisible: 'Always visible',
    priority: 'Priority',
    estimate: 'Estimate',
    area: 'Area',
    people: 'People',
    addPerson: 'Add a person',
    waitingHint: "Delegated or waiting on someone else: won't show up in suggestions of what to do",
    waitingOn: 'Waiting on others',
    markWaiting: 'Mark as waiting',
    tags: 'Tags',
    addTag: 'Add a tag',
    repeatOptions: {
      none: "Doesn't repeat",
      daily: 'Every day',
      workdays: 'Weekdays',
      weekly: 'Every week',
      monthly: 'Every month',
      yearly: 'Every year'
    },
    every: 'every',
    units: { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' },
    onDay: 'on day',
    lastDayOfMonth: 'last day of the month',
    restartOnCompletion: 'Count from the day you complete it',
    repeatSummary: (description) =>
      `${description.charAt(0).toUpperCase()}${description.slice(1)}. Completing the task creates the next one.`
  },

  newTask: {
    title: 'New task',
    saveHint: 'Ctrl+Enter'
  },

  myDay: {
    title: 'My Day',
    estimated: (time) => `~${time} estimated`,
    noEstimate: 'No estimates',
    available: (time) => `of ${time} available`,
    alreadyDone: (time) => `· ${time} already done`,
    over: (time) => `over by ${time}`,
    unestimated: (n) => `${n} ${plural(n, 'task has', 'tasks have')} no estimate: add ~30m or ~1h for a better total.`,
    addAll: 'Add all',
    emptyTitle: 'Nothing planned for today.',
    emptyBefore: 'Add tasks from the suggestions, with the',
    emptyAfter: 'icon on any task, or by dragging them onto "My Day".',
    doneToday: 'Done today',
    suggestions: 'Suggestions',
    overdue: 'Overdue',
    dueToday: 'Due today',
    tomorrow: 'Tomorrow',
    highPriority: 'High priority',
    nothingUrgent: 'Nothing urgent to suggest.'
  },

  person: {
    counts: (open, waiting) => `${open} open · ${waiting} waiting`,
    overdue: (n) => ` · ${n} overdue`,
    copy: 'Copy for 1:1',
    copyHint: 'Copy a summary to paste into your 1:1 notes',
    copied: (name) => `1:1 summary for ${name} copied`,
    empty: (name, handle) => `No tasks with ${name}. Type @${handle} in the box at the top to link one.`,
    waitingOn: (name) => `Waiting on ${name}`,
    recentlyDone: 'Completed in the last 14 days'
  },

  update: {
    allAreas: 'All areas',
    allPeople: 'All people',
    copy: 'Copy',
    copyHint: 'Copy the summary as text, to paste into Teams or an email',
    copied: 'Update copied to clipboard',
    empty: 'No open tasks. Nice work.',
    counts: (c) =>
      `${c.overdue} overdue · ${c.today} today · ${c.upcoming} in the next days · ${c.noDue} with no due date · ` +
      `${c.waiting} waiting · ${c.stale} stalled`,
    overdue: (n) => `${n} overdue`,
    today: 'Today',
    estimated: (time) => ` · ~${time} estimated`,
    nothingToday: 'Nothing due today.',
    upcoming: 'Next 7 days',
    noDue: 'No due date',
    waiting: 'Waiting on others',
    stale: (days) => `Stalled for more than ${days} days`,
    staleFor: (days) => `stalled for ${days} days`,
    startWith: 'Where to start',
    then: (titles) => `Then: ${titles}.`
  },

  history: {
    title: 'Completed',
    search: 'Search completed tasks',
    empty: 'No completed tasks.',
    emptySearch: 'No completed tasks found.',
    showMore: 'Show more'
  },

  settings: {
    title: 'Settings',
    general: 'General',
    language: 'Language',
    languageHint: 'Language of the interface and of quick entry',
    languageChanged: 'Language changed. Date fields update after a restart.',
    restart: 'Restart',
    autostart: 'Start with Windows',
    autostartHint: 'When you sign in, the app starts minimized in the notification area',
    theme: 'Theme',
    themes: { system: 'Same as Windows', light: 'Light', dark: 'Dark' },
    defaultArea: 'Default area',
    defaultAreaHint: "Used by quick entry when you don't type #area",
    tour: 'Welcome tour',
    tourHint: 'A quick look at the main features',
    tourAgain: 'Show the tour',
    hotkey: 'Global shortcut',
    hotkeyHint: 'Opens quick add from any program. Click, then press the keys.',
    hotkeyRecording: 'Press the keys…',
    spaceKey: 'Space',
    notifications: 'Notifications',
    notificationsOn: 'Notifications on',
    startupDigest: 'Summary at startup',
    startupDigestHint: 'How many tasks are overdue or due today',
    unlockDigest: 'Summary at the first unlock of the day',
    dueAlerts: "Alert at the task's time",
    remindBefore: 'Early reminder',
    minutesBefore: (m) => `${m} minutes before`,
    listAndSummary: 'List and summary',
    upcomingDays: 'Days in "Next days"',
    staleDays: 'Tasks are stalled after (days)',
    workHours: 'Working hours per day',
    workHoursHint: 'For the My Day workload',
    undoSeconds: 'Time to undo a delete (seconds)',
    areas: 'Areas',
    color: 'Colour',
    restoreArea: 'Restore',
    archiveArea: 'Archive (hides the area without touching its tasks)',
    newArea: 'New area',
    deleteAreaTitle: 'Delete this area?',
    deleteAreaBefore: 'The area',
    deleteAreaAfter: 'will be deleted. Its tasks stay, without an area. To just hide it, use "Archive".',
    backup: 'Automatic backup',
    dailyBackup: 'Daily backup',
    dailyBackupHint: 'Once a day, saves all your data as JSON (the same format as Export)',
    folder: 'Folder',
    folderHint: 'Documents\\Plainlist Backup. If you pick a folder inside OneDrive, OneDrive syncs the backups.',
    choose: 'Choose…',
    keep: 'Backups to keep',
    keepHint: 'Older ones are deleted',
    lastBackup: 'Last backup',
    neverRun: 'Not run yet',
    runNow: 'Run now',
    backupSaved: (path) => `Backup saved to ${path}`,
    data: 'Data',
    export: 'Export',
    exportHint: 'Saves all tasks, areas and settings to a JSON file',
    exportButton: 'Export JSON',
    import: 'Import',
    importHint: 'Replaces all current data with the file (a copy is saved first)',
    importButton: 'Import JSON',
    imported: (tasks, areas, path) => `Imported ${tasks} tasks and ${areas} areas. Copy of the previous data: ${path}`,
    dataFolder: 'Data folder',
    footer: (version) => `Plainlist ${version} · works offline, your data stays on this PC`,
    importTitle: 'Import a backup?',
    importMessage:
      'All current tasks, areas and settings will be replaced with the ones in the file. A copy of your current data is saved automatically before importing.',
    chooseFile: 'Choose the file…'
  },

  tour: {
    welcome: 'Welcome',
    welcomeTitle: 'Welcome to Plainlist',
    welcomeBody: 'Your to-dos, offline. Want a quick look at the main features? It takes about a minute.',
    welcomeLater: 'You can see it again from Settings.',
    skip: 'Skip',
    start: 'Start the tour',
    stepOf: (step, total) => `${step} of ${total}`,
    close: 'Close the tour (Esc)',
    tryExample: 'Try an example',
    tryExampleHint: 'Types the example in the box at the top, without saving it',
    back: 'Back (←)',
    next: 'Next',
    nextHint: 'Next (→)',
    finish: 'Get started'
  }
}
