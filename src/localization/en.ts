// English localization strings
// Organized by component/page for easier maintenance

const en = {
  // Common strings used across multiple components
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
    view: 'View',
    total: 'Total',
    updated: 'Updated',
    ridings: 'ridings',
    retry: 'Retry',
  },

  // Party names
  parties: {
    liberal: 'Liberal',
    conservative: 'Conservative',
    ndp: 'NDP',
    green: 'Green',
    bloc: 'Bloc Quebecois',
  },

  // Page titles
  titles: {
    main: 'Election Map',
    entries: 'Saved Maps',
  },

  // LoadingScreen component
  loadingScreen: {
    ariaLabel: 'Loading maple leaf',
    loadingMap: 'Loading map…',
  },

  // Home/Index page
  home: {
    welcome: 'Welcome',
    viewingMap: 'You are looking at',
    hoverInstructions: 'Hover over a riding to see its name.',
    clickInstructions: 'Click to cycle party colors (or clear).',
    viewOthers: 'Browse everyone\'s saved maps',
    here: 'here',
    unableToLoad: 'Unable to load saved map',
  },

  // CanadaMap component
  canadaMap: {
    nationalSummary: '📊 National Summary',
    undecided: 'undecided',
    undecidedRidings: '📋 Undecided Ridings',
    assignedRidings: '🗺️ Assigned Ridings',
    exportMap: 'Download image',
    exportingMap: 'Preparing image…',
    exportSuccess: 'Map exported successfully',
    exportError: 'Couldn\'t create the image. Please try again.',
    resetZoom: 'Reset view',
    allRidingsAssigned: 'All ridings have been assigned a party!',
    noRidingsAssigned: 'No ridings have been assigned a party yet!',
    setEntireMapTo: 'Set the entire map to:',
    setAllUndecidedTo: 'Set all undecided to:',
    setAllAssignedTo: 'Set all assigned to:',
    clearMap: 'Clear Map',
    clearing: 'Clearing…',
    save: 'Save',
    cancel: 'Cancel',
    created: 'Created',
    setAllRidingsToParty: 'Set all ridings to',
    setAllUndecidedRidingsInProvince: 'Set all undecided ridings in',
    setAllAssignedRidingsInProvince: 'Set all assigned ridings in',
    centerOn: 'Centered on',
    clickToCenterMap: 'Click to center map on',
    confirmReset: 'Are you sure you want to reset the map? This will clear all ridings (and cant be undone)',
    confirmSetAll: 'Are you sure you want to set all ridings to {party}? This will override any existing selections.',
    confirmSetAllUndecided: 'Are you sure you want to set all undecided ridings in {province} to {party}?',
    confirmSetAllAssigned: 'Are you sure you want to set all assigned ridings in {province} to {party}?',
    allRidingsSet: 'All ridings set to {party}',
    allUndecidedSet: 'All undecided ridings in {province} set to {party}',
    allAssignedSet: 'All assigned ridings in {province} set to {party}',
    ridingUpdated: '{riding} updated to {party}',
    ridingUpdatedUndecided: '{riding} updated to "undecided"',
  },

  // Entries page
  entries: {
    title: 'Entries',
    backToMap: '← Back to your map',
    sortBy: 'Sort by:',
    default: 'Default',
    name: 'Name',
    savedAt: 'Date Saved',
    totalRidings: 'Total Ridings',
    viewMap: 'View Map',
    ascending: 'Ascending',
    descending: 'Descending',
    failedToLoad: 'Failed to load entries: ',
    unknownError: 'Unknown error',
  },

  // API error messages
  api: {
    methodNotAllowed: 'Method Not Allowed',
    internalServerError: 'Internal Server Error',
  },
};

export default en;
