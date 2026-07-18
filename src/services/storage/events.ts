export const DATA_EVENTS = {
  GROUPS_UPDATED: 'paxtu:groups_updated',
  SECTIONS_UPDATED: 'paxtu:sections_updated',
  USERS_UPDATED: 'paxtu:users_updated',
  MEMBERS_UPDATED: 'paxtu:members_updated',
  CATALOG_UPDATED: 'paxtu:catalog_updated',
  CALENDAR_UPDATED: 'paxtu:calendar_updated',
  PROGRESS_LAUNCHES_UPDATED: 'paxtu:progress_launches_updated',
};

export const dispatchDataEvent = (eventName: string): void => {
  window.dispatchEvent(new Event(eventName));
};
