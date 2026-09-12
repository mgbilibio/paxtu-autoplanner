export const shouldReuseLaunch = (
  existing: { eventId: string } | null | undefined,
  eventId: string,
): existing is { eventId: string } => !!existing && existing.eventId === eventId;
