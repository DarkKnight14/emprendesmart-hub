// Cliente de datos: en modo nube usa la base en la nube; en modo local imita la misma
// sintaxis (.from().select().eq()...) y habla con el servidor local (npm run server:local).
import { supabase } from "@/integrations/supabase/client";
import { IS_LOCAL, localFetch } from "./local";

type Res = { data: any; error: Error | null };

class LocalQuery implements PromiseLike<Res> {
  private q: Record<string, any>;
  constructor(table: string) {
    this.q = { table, op: "select", cols: "*", filters: [] as unknown[] };
  }
  select(cols = "*") { if (this.q.op === "select") this.q.cols = cols; return this; }
  insert(values: unknown) { this.q.op = "insert"; this.q.values = Array.isArray(values) ? values : [values]; return this; }
  update(patch: unknown) { this.q.op = "update"; this.q.patch = patch; return this; }
  delete() { this.q.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.q.filters.push([c, "=", v]); return this; }
  gte(c: string, v: unknown) { this.q.filters.push([c, ">=", v]); return this; }
  lte(c: string, v: unknown) { this.q.filters.push([c, "<=", v]); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.q.order = [c, o?.ascending === false ? "DESC" : "ASC"]; return this; }
  limit(n: number) { this.q.limit = n; return this; }
  then<A = Res, B = never>(ok?: ((v: Res) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return localFetch<any[]>("/db", "POST", this.q)
      .then((data) => ({ data, error: null }), (e: Error) => ({ data: null, error: e }))
      .then(ok, bad);
  }
}

const localDb = {
  from: (t: string) => new LocalQuery(t),
  auth: {
    getUser: async () => {
      try {
        const u = await localFetch<{ id: string; email: string }>("/auth/me");
        return { data: { user: u }, error: null };
      } catch (e) {
        return { data: { user: null }, error: e as Error };
      }
    },
  },
};

export const db: any = IS_LOCAL ? localDb : supabase;
