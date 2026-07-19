declare module "sql.js" {
  type SQLValue = string | number | null;

  interface Statement {
    bind(params?: SQLValue[] | Record<string, SQLValue>): void;
    step(): boolean;
    free(): void;
    run(params?: SQLValue[] | Record<string, SQLValue>): void;
    getAsObject(): Record<string, unknown>;
  }

  interface Database {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayBuffer | Uint8Array) => Database;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
