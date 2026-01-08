export interface SQLiteColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface CacheRow {
  cache_key: string;
  data: string;
  timestamp: number;
  compressed?: number;
}

export interface ExpoSQLiteDatabase {
  getAllAsync<T = Record<string, unknown>>(sql: string, params?: SQLiteParams): Promise<T[]>;
  runAsync(
    sql: string,
    params?: SQLiteParams
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

export interface RNSQLiteDatabase {
  transaction(
    fn: (tx: SQLiteTransaction) => void,
    errorCallback?: (error: Error) => void,
    successCallback?: () => void
  ): void;
}

export interface SQLiteTransaction {
  executeSql(
    sql: string,
    params?: SQLiteParams,
    successCallback?: (tx: SQLiteTransaction, results: SQLiteResultSet) => void,
    errorCallback?: (tx: SQLiteTransaction, error: Error) => boolean
  ): void;
}

export interface SQLiteResultSet {
  rows: {
    length: number;
    item(index: number): Record<string, unknown>;
  };
  rowsAffected: number;
  insertId?: number;
}

export interface ExpoSQLiteResult<T = Record<string, unknown>> {
  results?: T[];
}

export type SQLiteDatabase = ExpoSQLiteDatabase | RNSQLiteDatabase;

export type SQLiteParams = (string | number | null | boolean)[];

export interface SQLiteRunResult {
  changes: number;
  lastInsertRowId: number;
}

export type SQLiteExecuteResult =
  | SQLiteResultSet
  | ExpoSQLiteResult
  | SQLiteRunResult
  | Record<string, unknown>[];
