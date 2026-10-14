# TypeScript with Node.js and Express

This lesson builds a small typed REST API: the same pattern StudyVault's server uses.

## Project setup

```bash
mkdir books-api && cd books-api
npm init -y
npm pkg set type=module
npm install express zod
npm install -D typescript @types/node @types/express
```

`tsconfig.json` for Node running `.ts` directly:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "types": ["node"]
  }
}
```

Scripts in `package.json`:

```json
"scripts": {
  "start": "node src/server.ts",
  "dev": "node --watch src/server.ts",
  "typecheck": "tsc"
}
```

## Shared types

```typescript
// src/types.ts
export interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
}
```

## A typed Express server

```typescript
// src/server.ts
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { Book } from "./types.ts";

const app = express();
app.use(express.json());

const books: Book[] = [{ id: 1, title: "Learning TypeScript", author: "J. Goldberg", year: 2022 }];
let nextId = 2;

// The shape of a valid request body, checked at runtime.
const BookInput = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1),
  year: z.number().int().min(1450).max(2100),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function findBook(id: number): Book {
  const book = books.find((b) => b.id === id);
  if (!book) throw new HttpError(404, "Book not found");
  return book;
}

app.get("/api/books", (_req, res) => {
  res.json(books);
});

app.get("/api/books/:id", (req, res) => {
  res.json(findBook(Number(req.params.id)));
});

app.post("/api/books", (req, res) => {
  const parsed = BookInput.safeParse(req.body);
  if (!parsed.success) throw new HttpError(422, parsed.error.issues[0]?.message ?? "Invalid book");
  const book: Book = { id: nextId++, ...parsed.data };
  books.push(book);
  res.status(201).json(book);
});

app.delete("/api/books/:id", (req, res) => {
  const book = findBook(Number(req.params.id));
  books.splice(books.indexOf(book), 1);
  res.status(204).end();
});

// Error handler: has FOUR parameters, so Express knows it handles errors.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ detail: err.message });
  console.error(err);
  res.status(500).json({ detail: "Server error" });
});

app.listen(3000, () => console.log("http://localhost:3000"));
```

Express 5 passes errors thrown in **async** handlers to the error handler automatically.

## Try it

```bash
npm run dev
curl http://localhost:3000/api/books
curl -X POST http://localhost:3000/api/books -H "Content-Type: application/json" -d "{\"title\":\"Clean Code\",\"author\":\"R. Martin\",\"year\":2008}"
```

## Typed route parameters and query strings

```typescript
app.get("/api/search", (req, res) => {
  const q = String(req.query.q ?? "").slice(0, 100);
  res.json(books.filter((b) => b.title.toLowerCase().includes(q.toLowerCase())));
});
```

Query values arrive as strings (or arrays, or undefined). Convert and validate them, for example with `z.coerce.number()`.

## Typed middleware

```typescript
function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  if (req.get("x-api-key") !== process.env.API_KEY) throw new HttpError(401, "Missing API key");
  next();
}

app.delete("/api/books/:id", requireApiKey, (req, res) => { /* ... */ });
```

## Environment variables

```typescript
const PORT = Number(process.env.PORT ?? 3000);   // process.env values are string | undefined
```

Node can load a `.env` file for you: `node --env-file=.env src/server.ts`.

## Using Node's built-ins

```typescript
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(import.meta.dirname, "books.json");
const saved = JSON.parse(await readFile(file, "utf8")) as unknown; // validate before trusting!
await writeFile(file, JSON.stringify(books, null, 2));
```

## Testing with node:test

```typescript
// tests/books.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

test("adds two numbers", () => {
  assert.equal(1 + 1, 2);
});
```

```bash
node --test "tests/*.test.ts"
```

StudyVault's `tests/api.test.ts` starts the real server and calls it with `fetch`. Read it for a full example.

## Key points

- Node 24 runs `.ts` directly; `tsc` only checks types.
- Validate every request body with zod; derive types from schemas or shared interfaces.
- Throw `HttpError`s and convert them in one error-handling middleware.
- Query strings and `process.env` are always strings or `undefined`: convert them.

## Practice

1. Add `PUT /api/books/:id` that updates a book (use `BookInput.partial()`).
2. Save books to `books.json` so they survive restarts.
3. Write tests for `GET` and `POST` using `node:test` and `fetch`.
