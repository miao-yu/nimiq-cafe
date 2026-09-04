// Types for db-config.js, which is hand-written JavaScript so that the plain
// .js scripts and the compiled .ts scripts can share one copy.

export declare function required(name: string): string;

interface Credentials {
    host: string;
    user: string;
    password: string;
}

export declare function poolCredentials<T extends object = {}>(extra?: T): Credentials & T;

export declare function nimiqCredentials<T extends object = {}>(extra?: T): Credentials & T;
