export const NOTIFICATION_TERRITORY_UPDATE = 100;
export const NOTIFICATION_FACTION_WAR      = 101;
export const NOTIFICATION_NEARBY_PLAYER    = 102;
export const NOTIFICATION_MISSION_COMPLETE = 103;
export const NOTIFICATION_LOOT_RECEIVED    = 104;
export const NOTIFICATION_ENCOUNTER_READY  = 105;

export function sendNotification(
  nk: nkruntime.Runtime,
  userId: string,
  code: number,
  subject: string,
  content: object,
  persistent: boolean = false
): void {
  nk.notificationsSend([{
    userId,
    subject,
    content,
    code,
    sender: '',
    persistent,
  }]);
}
