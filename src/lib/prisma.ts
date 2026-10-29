import { PrismaClient } from "@prisma/client/wasm";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// D1 is only reachable through the request's Cloudflare binding, so the client is created lazily
// (once per binding) instead of at import time. The proxy keeps `prisma.model.method()` call sites unchanged.
const clients = new WeakMap<object, PrismaClient>();

function currentClient() {
  const db = getCloudflareContext().env.DB;
  let client = clients.get(db);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(db) });
    clients.set(db, client);
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
