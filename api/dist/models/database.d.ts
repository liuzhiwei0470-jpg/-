import { Client } from '@libsql/client';
export declare function getDb(): Client;
export interface RunResult {
    lastInsertRowid: number;
    changes: number;
}
export declare function getRow(sql: string, ...args: any[]): Promise<any>;
export declare function getAllRows(sql: string, ...args: any[]): Promise<any[]>;
export declare function runSql(sql: string, ...args: any[]): Promise<RunResult>;
export declare function initDatabase(): Promise<void>;
declare const _default: {
    getDb: typeof getDb;
    getRow: typeof getRow;
    getAllRows: typeof getAllRows;
    runSql: typeof runSql;
    initDatabase: typeof initDatabase;
};
export default _default;
//# sourceMappingURL=database.d.ts.map