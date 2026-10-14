# Practice Exercises with Solutions

Try each exercise yourself first. Check with `npx tsc --noEmit`, then compare with the solution.

## Exercise 1: Grade calculator (basics)

Write `grade(marks: number): "A" | "B" | "C" | "D" | "F"`: 90+ A, 75+ B, 60+ C, 40+ D, else F. Throw an error for marks outside 0–100.

<details><summary>Solution</summary>

```typescript
type Grade = "A" | "B" | "C" | "D" | "F";

function grade(marks: number): Grade {
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) throw new RangeError("Marks must be 0-100");
  if (marks >= 90) return "A";
  if (marks >= 75) return "B";
  if (marks >= 60) return "C";
  if (marks >= 40) return "D";
  return "F";
}
```
</details>

## Exercise 2: Class report (objects and arrays)

Given `interface Result { name: string; marks: number }`, write `report(results: Result[])` returning `{ average: number; topper: string | null; passed: string[] }` (pass = 40+).

<details><summary>Solution</summary>

```typescript
interface Result { name: string; marks: number }

interface Report { average: number; topper: string | null; passed: string[] }

function report(results: readonly Result[]): Report {
  if (results.length === 0) return { average: 0, topper: null, passed: [] };
  const total = results.reduce((sum, r) => sum + r.marks, 0);
  const best = results.reduce((a, b) => (b.marks > a.marks ? b : a));
  return {
    average: Math.round((total / results.length) * 100) / 100,
    topper: best.name,
    passed: results.filter((r) => r.marks >= 40).map((r) => r.name),
  };
}
```
</details>

## Exercise 3: Shapes (discriminated unions)

Model `circle`, `rectangle` and `triangle` (base, height). Write `area(shape)` with an exhaustiveness check.

<details><summary>Solution</summary>

```typescript
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "rectangle"; w: number; h: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "rectangle": return s.w * s.h;
    case "triangle": return 0.5 * s.base * s.height;
    default: {
      const unreachable: never = s;
      throw new Error(`Unknown shape ${JSON.stringify(unreachable)}`);
    }
  }
}
```
</details>

## Exercise 4: groupBy (generics)

Write `groupBy<T, K extends PropertyKey>(items: T[], key: (item: T) => K): Record<K, T[]>`.

<details><summary>Solution</summary>

```typescript
function groupBy<T, K extends PropertyKey>(items: readonly T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

const byGrade = groupBy([{ n: "Asha", g: "A" }, { n: "Ravi", g: "B" }, { n: "Meena", g: "A" }], (s) => s.g);
// { A: [Asha, Meena], B: [Ravi] }
```
</details>

## Exercise 5: Typed event emitter (advanced generics)

Build `Emitter<Events>` so that `on("login", (user) => ...)` knows `user`'s type from a map of event names to payloads.

<details><summary>Solution</summary>

```typescript
class Emitter<Events extends Record<string, unknown>> {
  #handlers: { [E in keyof Events]?: ((payload: Events[E]) => void)[] } = {};

  on<E extends keyof Events>(event: E, fn: (payload: Events[E]) => void): void {
    (this.#handlers[event] ??= []).push(fn);
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    for (const fn of this.#handlers[event] ?? []) fn(payload);
  }
}

type AppEvents = { login: { username: string }; logout: undefined; error: Error };

const bus = new Emitter<AppEvents>();
bus.on("login", (u) => console.log(`Welcome ${u.username}`)); // u: { username: string }
bus.emit("login", { username: "asha" });
bus.emit("login", { name: "asha" }); // ❌ Error: wrong payload shape
```
</details>

## Exercise 6: Safe config loader (unknown + validation)

Read `PORT`, `HOST` and `DEBUG` from `process.env` into a typed `Config`, with defaults 3000 / "localhost" / false, and throw a clear error if `PORT` isn't a valid port.

<details><summary>Solution</summary>

```typescript
interface Config { port: number; host: string; debug: boolean }

function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a number from 1 to 65535, got "${env.PORT}"`);
  }
  return {
    port,
    host: env.HOST || "localhost",
    debug: env.DEBUG?.toLowerCase() === "true",
  };
}
```
</details>

## Exercise 7: Fetch with retry (async)

Write `fetchJson<T>(url: string, retries = 2): Promise<T>` that retries on network errors or 5xx responses, waiting 500 ms × attempt between tries.

<details><summary>Solution</summary>

```typescript
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.status >= 500) throw new Error(`Server error ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { retry: false });
      return (await res.json()) as T;
    } catch (err) {
      const canRetry = !(err instanceof Error && "retry" in err) && attempt < retries;
      if (!canRetry) throw err;
      await sleep(500 * (attempt + 1));
    }
  }
}
```
</details>

## Mini project: Library manager

Combine everything:

1. `types.ts`: `Book`, `Member`, `Loan` interfaces and a `LoanStatus` literal union.
2. `library.ts`: a `Library` class with `addBook`, `addMember`, `lend(bookId, memberId)`, `giveBack(loanId)`, using a `Result` type for failures ("book already lent", "member has 3 books").
3. `server.ts`: an Express API over the class, validating input with zod.
4. `library.test.ts`: tests for lending rules with `node:test`.
5. Store data in SQL Server: see the SQL Server lesson *Using SQL Server from TypeScript*.
