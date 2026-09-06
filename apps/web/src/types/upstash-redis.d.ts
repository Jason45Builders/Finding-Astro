declare module "@upstash/redis" {
  export interface RedisConfig {
    url: string;
    token: string;
  }

  export class Redis {
    constructor(config: RedisConfig);
    incr(key: string): Promise<number>;
    expire(key: string, ttl: number): Promise<number>;
    get<T>(key: string): Promise<T | null>;
    ttl(key: string): Promise<number | null>;
    set(key: string, value: unknown): Promise<string | null>;
    del(key: string): Promise<number>;
  }
}
