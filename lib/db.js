import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function redisStore() {
  const redis = new Redis({ url, token });
  return {
    async hgetall(key) {
      const r = (await redis.hgetall(key)) || {};
      return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, parse(v)]));
    },
    async hset(key, field, value) {
      await redis.hset(key, { [field]: JSON.stringify(value) });
    },
    async hdel(key, field) {
      await redis.hdel(key, field);
    },
    async sadd(key, value) {
      return redis.sadd(key, value);
    },
    async smembers(key) {
      return (await redis.smembers(key)) || [];
    },
    async srem(key, value) {
      await redis.srem(key, value);
    },
    async keys(pattern) {
      return (await redis.keys(pattern)) || [];
    },
  };
}

function memoryStore() {
  const g = globalThis;
  g.__mem ??= { h: {}, s: {} };
  const m = g.__mem;
  return {
    async hgetall(key) {
      return structuredClone(m.h[key] || {});
    },
    async hset(key, field, value) {
      (m.h[key] ??= {})[field] = structuredClone(value);
    },
    async hdel(key, field) {
      if (m.h[key]) delete m.h[key][field];
    },
    async sadd(key, value) {
      const set = (m.s[key] ??= new Set());
      if (set.has(value)) return 0;
      set.add(value);
      return 1;
    },
    async smembers(key) {
      return [...(m.s[key] || [])];
    },
    async srem(key, value) {
      m.s[key]?.delete(value);
    },
    async keys(pattern) {
      const prefix = pattern.replace(/\*$/, '');
      return Object.keys(m.h).filter((k) => k.startsWith(prefix));
    },
  };
}

export const store = url && token ? redisStore() : memoryStore();
export const usingMemory = !(url && token);
