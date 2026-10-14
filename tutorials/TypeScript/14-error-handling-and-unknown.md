# Error Handling and unknown

TypeScript checks your code, but it **cannot** check data that arrives while the program runs: form input, JSON from an API, files, environment variables. This lesson covers handling errors and checking that data.

## Throwing and catching

```typescript
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Cannot divide by zero");
  return a / b;
}

try {
  divide(10, 0);
} catch (err) {          // err is `unknown`: anything can be thrown in JavaScript
  if (err instanceof Error) console.error(err.message);
  else console.error("Unknown error", err);
}
```

`throw "oops"` and `throw 42` are legal JavaScript, so TypeScript can't assume `err` is an `Error`. Always check.

## Custom error classes

```typescript
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

try {
  throw new HttpError(404, "Page not found");
} catch (err) {
  if (err instanceof HttpError && err.status === 404) {
    console.log("Show a friendly 404 page");
  }
}
```

StudyVault's server throws `HttpError` anywhere in a route, and one error handler turns it into `{ detail: "..." }` JSON.

## Errors as values: the Result pattern

Instead of throwing, return success or failure as a discriminated union. The caller *must* handle both:

```typescript
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parseAge(text: string): Result<number> {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > 130) return { ok: false, error: "Not a valid age" };
  return { ok: true, value: n };
}

const r = parseAge("19");
if (r.ok) console.log(r.value + 1);   // r.value only exists when ok is true
else console.log(r.error);
```

Use throwing for unexpected failures, and `Result` for expected ones (like invalid input).

## Validating unknown data by hand

```typescript
interface Student { name: string; marks: number[] }

function parseStudent(data: unknown): Student {
  if (typeof data !== "object" || data === null) throw new Error("Expected an object");
  const d = data as Record<string, unknown>;
  if (typeof d.name !== "string") throw new Error("name must be a string");
  if (!Array.isArray(d.marks) || !d.marks.every((m) => typeof m === "number")) {
    throw new Error("marks must be numbers");
  }
  return { name: d.name, marks: d.marks };
}

const student = parseStudent(JSON.parse('{"name":"Asha","marks":[90,85]}'));
```

This works but gets long. A validation library does it better.

## Validating with zod

[zod](https://zod.dev) checks data at runtime **and** gives you the TypeScript type from the same definition:

```bash
npm install zod
```

```typescript
import { z } from "zod";

const StudentSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  marks: z.array(z.number().min(0).max(100)),
  phone: z.string().optional(),
});

type Student = z.infer<typeof StudentSchema>;  // the type is derived from the schema

const result = StudentSchema.safeParse(JSON.parse(input));
if (!result.success) {
  console.log(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
} else {
  const s: Student = result.data;  // fully checked
}
```

StudyVault's server validates every request body with zod (see `PageIn`, `ChatIn` in `src/server/app.ts`).

## Where to validate

Validate at the **edges** of your program, where data comes in:

- HTTP request bodies, query strings and route parameters
- responses from other APIs
- files, `localStorage`, environment variables

Once validated, the rest of the code can trust the types.

## Optional chaining and nullish coalescing

```typescript
const city = user.address?.city ?? "Unknown";   // no crash if address is missing
const len = items?.length ?? 0;
const n = Number(process.env.PORT ?? 8000);
```

- `a?.b` gives `undefined` instead of crashing if `a` is null/undefined.
- `a ?? b` uses `b` only when `a` is `null` or `undefined` (unlike `||`, which also replaces `0` and `""`).

## `finally`

```typescript
const conn = await openConnection();
try {
  await conn.query("...");
} finally {
  await conn.close(); // runs whether the query worked or threw
}
```

## Key points

- Caught errors are `unknown`: check with `instanceof Error` before using `.message`.
- Custom error classes carry extra info (like an HTTP status).
- Return a `Result` union for expected failures.
- Validate all outside data at the edges, ideally with zod, and get types from the schema.

## Practice

1. Write `class ValidationError extends Error` with a `field` property.
2. Write `parseNumberList(text: string): Result<number[]>` for input like `"1, 2, 3"`.
3. Define a zod schema for a `Book` and derive its type with `z.infer`.
