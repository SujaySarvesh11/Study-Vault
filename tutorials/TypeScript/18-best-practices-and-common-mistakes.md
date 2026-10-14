# Best Practices and Common Mistakes

## Best practices

### 1. Turn on `strict` from day one
Adding strictness to a big project later is painful. Starting strict is easy.

### 2. Let inference work
```typescript
// ❌ noisy
const count: number = 0;
const names: string[] = users.map((u: User): string => u.name);

// ✅ clear
const count = 0;
const names = users.map((u) => u.name);
```
Annotate function **parameters**, exported function **return types**, and empty starting values (`const list: Book[] = []`).

### 3. Model data precisely
```typescript
// ❌ allows impossible states: loading AND error AND data at once
interface State { loading: boolean; error?: string; data?: Book[] }

// ✅ exactly one state at a time
type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: Book[] };
```

### 4. Prefer `unknown` to `any`, and validate at the edges
Data from users, files and APIs is `unknown` until checked (zod, type guards).

### 5. One source of truth for types
Put shared types in one module (StudyVault: `src/shared/api.ts`) and derive others with `Pick`, `Omit`, `z.infer`, `ReturnType`.

### 6. Use literal unions instead of magic strings
```typescript
function setRole(role: "owner" | "viewer") { /* ... */ }  // typos become compile errors
```

### 7. Keep functions small and typed at the boundary
A function with clear input and output types is easy to test and reuse.

### 8. Use `readonly` for data you don't intend to change
It documents intent and prevents accidental mutation.

## Common mistakes

### Silencing errors with `any` or `as`
```typescript
const user = JSON.parse(text) as User;  // ❌ no check: wrong data crashes later, far away
const user2 = UserSchema.parse(JSON.parse(text)); // ✅ fails right here with a clear message
```

### The non-null assertion `!`
```typescript
const el = document.getElementById("x")!;   // "trust me, it's not null"
```
If you're wrong, it crashes. Prefer a check or a helper that throws a clear error.

### Forgetting `await`
```typescript
const book = getBook(1);   // Promise<Book>, not Book
if (book) { /* always true: a Promise object is truthy! */ }
```
Turn on the `@typescript-eslint/no-floating-promises` lint rule to catch these.

### Thinking types exist at runtime
```typescript
interface Cat { meow(): void }
if (x instanceof Cat) {}  // ❌ Error: 'Cat' only refers to a type
```
Interfaces vanish. Use `in`, a discriminant property or a type guard instead.

### Mutating while sorting
```typescript
const sorted = marks.sort();          // ❌ sorts the original, and sorts numbers as strings: [100, 9, 85]
const sorted2 = [...marks].sort((a, b) => a - b); // ✅ copy, numeric compare
const sorted3 = marks.toSorted((a, b) => a - b);  // ✅ ES2023
```

### `||` instead of `??`
```typescript
const qty = input.qty || 1;   // ❌ a real 0 becomes 1
const qty2 = input.qty ?? 1;  // ✅ only null/undefined become 1
```

### Object spread doesn't deep-copy
```typescript
const copy = { ...student };          // nested objects are still shared
const deep = structuredClone(student); // ✅ a true deep copy
```

### Comparing objects with `===`
```typescript
console.log({ a: 1 } === { a: 1 }); // ❌ always false: two different objects
```
TypeScript even warns: *This condition will always return 'false' since JavaScript compares objects by reference, not value.* Compare the fields you care about, or IDs.

### Overusing classes and inheritance
Plain objects + interfaces + functions are often simpler. Use classes for things with state and behaviour.

## A checklist before you commit code

- [ ] `npx tsc --noEmit` shows no errors
- [ ] No new `any`, `as` or `!` without a comment explaining why
- [ ] Outside data is validated
- [ ] Tests pass
- [ ] Names are clear; functions are small

## Practice

1. Search StudyVault's code for `as ` and decide whether each one is safe.
2. Rewrite a `{ loading, error, data }` interface as a discriminated union.
3. Find a place where `||` should be `??` in code you've written.
