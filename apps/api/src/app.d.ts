export type BuildAppOptions = {
    databaseUrl: string;
    corsOrigin: string;
};
export declare function buildApp(_options: BuildAppOptions): Promise<{
    mode: string;
    runtime: string;
    message: string;
    reply: {
        send: boolean;
    };
}>;
