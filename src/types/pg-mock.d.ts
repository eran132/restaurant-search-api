declare module 'pg' {
    interface QueryResult<T = any> {
      rows: T[];
    }
    
    export class Pool {
      query: jest.Mock<Promise<QueryResult<any>>, any[]>;
    }
  }