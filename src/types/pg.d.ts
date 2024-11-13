declare module 'pg' {
    export class Pool {
      query: jest.Mock;
    }
  }