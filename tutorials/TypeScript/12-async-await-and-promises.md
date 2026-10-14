# Async, Await and Promises

Reading files, calling APIs and querying databases take time. JavaScript doesn't wait (block) for them; it continues and handles the result later. TypeScript types that "later" value as a **`Promise<T>`**.

## Promises

A `Promise<T>` is a box that will eventually contain a `T`, or an error.

```typescript
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rollDice(): Promise<number> {
  return new Promise((resolve, reject) => {
    const n = Math.ceil(Math.random() * 6);
    n > 0 ? resolve(n) : reject(new Error("impossible"));
  });
}
```

## `async` and `await`

`await` pauses the *function* (not the whole program) until the promise settles. An `async` function always returns a `Promise`:

```typescript
async function play(): Promise<string> {
  await wait(500);
  const n = await rollDice();   // n: number (not Promise<number>)
  return `You rolled ${n}`;
}

play().then((msg) => console.log(msg));
```

In an ES module you can use `await` at the top level:

```typescript
const msg = await play();
```

## Fetching JSON with types

`fetch` returns a `Response`, and `response.json()` returns `Promise<any>`. Give it a type, but remember **this is an assumption, not a check**:

```typescript
interface Todo { id: number; title: string; completed: boolean }

async function getTodo(id: number): Promise<Todo> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Todo;
}
```

For data you don't control, validate it at runtime (for example with **zod**, see *Error Handling and unknown*).

## Error handling

```typescript
async function safeGetTodo(id: number): Promise<Todo | null> {
  try {
    return await getTodo(id);
  } catch (err) {               // err: unknown
    console.error("Failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
```

Use `return await` inside `try` so the error is caught there.

## Running things in parallel

```typescript
// One after another (slow): ~2 seconds
const a = await getTodo(1);
const b = await getTodo(2);

// At the same time (fast): ~1 second
const [x, y] = await Promise.all([getTodo(1), getTodo(2)]); // [Todo, Todo]
```

| Helper | Resolves when | Rejects when |
|---|---|---|
| `Promise.all` | all succeed | any fails |
| `Promise.allSettled` | all finish (each `fulfilled` or `rejected`) | never |
| `Promise.race` | the first one settles | the first one fails |
| `Promise.any` | the first one succeeds | all fail |

```typescript
const results = await Promise.allSettled([getTodo(1), getTodo(9999)]);
for (const r of results) {
  if (r.status === "fulfilled") console.log(r.value.title);   // narrowing by status
  else console.log("failed:", r.reason);
}
```

## Timeouts

```typescript
const res = await fetch(url, { signal: AbortSignal.timeout(5000) }); // give up after 5 s
```

## Async loops

```typescript
for (const id of [1, 2, 3]) {
  const todo = await getTodo(id);   // one at a time, in order
  console.log(todo.title);
}
```

`array.forEach(async ...)` does **not** wait; use `for...of` or `Promise.all(array.map(...))`.

## Async generators (streams)

An `async function*` produces values over time. StudyVault streams AI answers this way (`src/server/ai.ts`):

```typescript
async function* countdown(from: number): AsyncGenerator<number> {
  for (let i = from; i > 0; i--) {
    await wait(1000);
    yield i;
  }
}

for await (const n of countdown(3)) console.log(n); // 3, 2, 1
```

## Common mistakes

```typescript
const todo = getTodo(1);        // ❌ forgot await: todo is Promise<Todo>
console.log(todo.title);        // ❌ Error: Property 'title' does not exist on type 'Promise<Todo>'.
```

TypeScript catches the forgotten `await` because the types don't match: another reason to use it.

## Key points

- `Promise<T>` = a `T` later. `await` unwraps it inside `async` functions.
- Wrap `await` in `try/catch`; caught errors are `unknown`.
- Use `Promise.all` for parallel work and `for...of` for sequential work.
- Types on `res.json()` are assumptions; validate external data.

## Practice

1. Write `async function retry<T>(fn: () => Promise<T>, times: number): Promise<T>`.
2. Fetch todos 1–5 in parallel and print the titles of the completed ones.
3. Write `withTimeout<T>(p: Promise<T>, ms: number): Promise<T>` using `Promise.race`.
