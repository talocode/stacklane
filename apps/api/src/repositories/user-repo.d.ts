import type { UserRecord } from '../types';
export declare function findUserByEmail(email: string): Promise<UserRecord>;
export declare function findUserById(id: string): Promise<UserRecord>;
export declare function touchUserLogin(id: string): Promise<void>;
