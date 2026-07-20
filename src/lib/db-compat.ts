export enum OperationType {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  LIST = 'LIST',
  GET = 'GET'
}

export const handleDatabaseError = (_err: any, _type: any, _module: any) => {};
