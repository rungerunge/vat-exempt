import { Session } from '@shopify/shopify-api';

export function setupAppSession(redis) {
  return {
    storeSession: async (session) => {
      await redis.set(session.id, JSON.stringify(session));
      return true;
    },
    loadSession: async (id) => {
      const sessionData = await redis.get(id);
      if (sessionData) {
        const session = new Session(JSON.parse(sessionData));
        return session;
      }
      return undefined;
    },
    deleteSession: async (id) => {
      await redis.del(id);
      return true;
    },
  };
} 