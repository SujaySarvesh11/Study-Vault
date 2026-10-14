# Generics

Generics let you write code that works with **many types** while keeping full type safety. Think of a generic type parameter as a *variable for a type*.

## The problem

```typescript
function firstNumber(arr: number[]): number | undefined { return arr[0]; }
function firstString(arr: string[]): string | undefined { return arr[0]; }
// ...one copy per type? Using `any` would lose the type completely.
```

## A generic function

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([10, 20, 30]);     // T = number → n: number | undefined
const s = first(["a", "b"]);       // T = string → s: string | undefined
const x = first<boolean>([true]);  // you can also pass T explicitly
```

`<T>` declares the type parameter. TypeScript usually **infers** it from the arguments.

## Multiple type parameters

```typescript
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}
const p = pair("maths", 95);  // [string, number]

function mapValues<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}
const lengths = mapValues(["a", "abc"], (s) => s.length); // number[]
```

## Constraints with `extends`

Limit what `T` can be, so you can safely use its properties:

```typescript
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest("apple", "fig");   // ✅ strings have length
longest([1, 2], [3]);      // ✅ arrays have length
longest(10, 20);           // ❌ Error: number has no 'length'
```

## `keyof` constraints

```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const student = { name: "Asha", rollNo: 12 };
const name = getProp(student, "name");    // string
const roll = getProp(student, "rollNo");  // number
getProp(student, "age");                  // ❌ Error: "age" is not a key of student
```

`T[K]` is an *indexed access type*: "the type of property K of T".

## Generic interfaces and types

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}

type Student = { name: string; rollNo: number };
const res: ApiResponse<Student[]> = { ok: true, data: [{ name: "Asha", rollNo: 12 }] };

type Maybe<T> = T | null;
```

## Generic classes

```typescript
class Stack<T> {
  #items: T[] = [];
  push(item: T): void { this.#items.push(item); }
  pop(): T | undefined { return this.#items.pop(); }
  get size(): number { return this.#items.length; }
}

const books = new Stack<string>();
books.push("TypeScript Basics");
books.push(42); // ❌ Error
```

## Default type parameters

```typescript
interface Box<T = string> { value: T }
const b: Box = { value: "hi" };        // T defaults to string
const c: Box<number> = { value: 7 };
```

## A real example from StudyVault

`src/server/db.ts` uses a generic so each query says what rows it returns:

```typescript
export function one<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

const page = one<Page>("SELECT * FROM pages WHERE id=?", 5); // page: Page | undefined
```

And the browser code fetches typed JSON:

```typescript
const getJSON = async <T>(path: string): Promise<T> => (await api(path)).json() as Promise<T>;
const pages = await getJSON<PageSummary[]>("/api/pages");
```

## When not to use generics

If a type parameter appears only once, you probably don't need it:

```typescript
function bad<T>(x: T): void { console.log(x); }   // T adds nothing
function good(x: unknown): void { console.log(x); }
```

## Key points

- `<T>` is a placeholder for a type, usually inferred from arguments.
- `T extends X` constrains it; `K extends keyof T` + `T[K]` gives type-safe property access.
- Interfaces, type aliases and classes can all be generic.

## Practice

1. Write `last<T>(arr: T[]): T | undefined`.
2. Write `groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]>`.
3. Write a generic `Queue<T>` class with `enqueue`, `dequeue` and `peek`.
