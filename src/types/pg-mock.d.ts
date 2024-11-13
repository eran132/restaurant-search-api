declare module 'pg-mock' {
  interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
  }

  interface Client {
    query<T>(query: string, values: unknown[]): Promise<QueryResult<T>>;
  }
}