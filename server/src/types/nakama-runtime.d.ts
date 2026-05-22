// Nakama TypeScript runtime type definitions.
// Source: https://github.com/heroiclabs/nakama-common/blob/master/runtime/runtime.d.ts
// Copy the full file from a Nakama release into this directory for complete types.
// This minimal version covers the APIs used by Overworld.

declare namespace nkruntime {
  type ReadPermissionValues = 0 | 1 | 2;
  type WritePermissionValues = 0 | 1;

  interface Context {
    readonly userId: string;
    readonly username: string;
    readonly vars: { [key: string]: string };
    readonly clientIp: string;
    readonly clientPort: string;
    readonly matchId?: string;
    readonly matchNode?: string;
    readonly matchLabel?: string;
    readonly matchTickRate?: number;
  }

  interface Logger {
    info(format: string, ...params: any[]): void;
    warn(format: string, ...params: any[]): void;
    error(format: string, ...params: any[]): void;
    debug(format: string, ...params: any[]): void;
  }

  interface StorageReadRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface StorageWriteRequest {
    collection: string;
    key: string;
    userId: string;
    value: string;
    version?: string;
    permissionRead?: ReadPermissionValues;
    permissionWrite?: WritePermissionValues;
  }

  interface StorageObject {
    collection: string;
    key: string;
    userId: string;
    value: string;
    version: string;
    permissionRead: ReadPermissionValues;
    permissionWrite: WritePermissionValues;
    createTime: number;
    updateTime: number;
  }

  interface NotificationRequest {
    userId: string;
    subject: string;
    content: object;
    code: number;
    sender: string;
    persistent: boolean;
  }

  interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    maxNumScore: number;
    metadata: string;
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  interface Runtime {
    uuidv4(): string;
    storageRead(reads: StorageReadRequest[]): StorageObject[];
    storageWrite(writes: StorageWriteRequest[]): StorageObject[];
    storageDelete(deletes: Array<{ collection: string; key: string; userId: string }>): void;
    notificationsSend(notifications: NotificationRequest[]): void;
    leaderboardCreate(
      id: string,
      authoritative: boolean,
      sortOrder: 'asc' | 'desc',
      operator: 'best' | 'set' | 'incr' | 'decr',
      resetSchedule?: string,
      metadata?: boolean
    ): void;
    leaderboardRecordWrite(
      id: string,
      owner: string,
      score: number,
      subscore: number,
      metadata?: string,
      override?: 'best' | 'set' | 'incr' | 'decr'
    ): LeaderboardRecord;
    leaderboardRecordsList(
      id: string,
      ownerIds: string[],
      limit: number,
      cursor: string | undefined,
      expiry: number
    ): LeaderboardRecordList;
    groupUserJoin(groupId: string, userId: string, username: string): void;
  }

  type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Runtime,
    payload: string
  ) => string | void;

  interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerBeforeRt(id: string, fn: Function): void;
    registerAfterRt(id: string, fn: Function): void;
    registerCron(name: string, fn: Function, cron: string): void;
  }

  type InitModule = (
    ctx: Context,
    logger: Logger,
    nk: Runtime,
    initializer: Initializer
  ) => void;
}
