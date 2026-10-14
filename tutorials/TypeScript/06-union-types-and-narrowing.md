# Union Types and Narrowing

## Union types

A **union** (`A | B`) means "either A or B":

```typescript
let id: number | string;
id = 101;      // ✅
id = "S-101";  // ✅
id = true;     // ❌ Error
```

Combine unions with literal types to allow only specific values:

```typescript
type Grade = "A" | "B" | "C" | "F";
type Status = "loading" | "success" | "error";

let s: Status = "success";
s = "done"; // ❌ Error: Type '"done"' is not assignable to type 'Status'.
```

The editor even autocompletes the allowed values.

## Narrowing

With a union you may only use what **all** members have. To use something specific, **narrow** the type with a check. TypeScript follows your `if`s and knows the type inside each branch.

### `typeof`

```typescript
function show(id: number | string): string {
  if (typeof id === "number") {
    return id.toFixed(0);       // id: number here
  }
  return id.toUpperCase();      // id: string here
}
```

### Truthiness and equality

```typescript
function greet(name: string | null | undefined) {
  if (!name) return "Hello, stranger";  // null, undefined or ""
  return `Hello, ${name}`;              // name: string
}
```

### `in`

```typescript
interface Fish { swim(): void }
interface Bird { fly(): void }

function move(animal: Fish | Bird) {
  if ("swim" in animal) animal.swim();  // animal: Fish
  else animal.fly();                    // animal: Bird
}
```

### `instanceof`

```typescript
function when(d: Date | string) {
  return d instanceof Date ? d.toISOString() : d;
}
```

### `Array.isArray`

```typescript
function all(x: string | string[]): string[] {
  return Array.isArray(x) ? x : [x];
}
```

## Discriminated unions

This is one of the most useful patterns in TypeScript. Give every member a common property with a **literal** value (the "tag"), then switch on it:

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":    return Math.PI * s.radius ** 2;   // s is the circle member here
    case "rectangle": return s.width * s.height;
    case "square":    return s.side ** 2;
  }
}
```

A real example from StudyVault (`src/shared/api.ts`), the events streamed by the AI assistant:

```typescript
type ChatEvent =
  | { sources: ChatSource[] }
  | { t: string }
  | { error: string }
  | { done: true };
```

## Exhaustiveness checking with `never`

If someone adds a new shape later, make TypeScript point at every `switch` that forgot it:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function perimeter(s: Shape): number {
  switch (s.kind) {
    case "circle":    return 2 * Math.PI * s.radius;
    case "rectangle": return 2 * (s.width + s.height);
    case "square":    return 4 * s.side;
    default:          return assertNever(s); // ❌ compile error here if a case is missing
  }
}
```

## Custom type guards

A function returning `x is Type` teaches TypeScript a new check:

```typescript
interface Student { name: string; rollNo: number }

function isStudent(x: unknown): x is Student {
  return typeof x === "object" && x !== null
    && typeof (x as Student).name === "string"
    && typeof (x as Student).rollNo === "number";
}

const data: unknown = JSON.parse('{"name":"Asha","rollNo":12}');
if (isStudent(data)) {
  console.log(data.rollNo); // data: Student
}
```

## Intersection types

`A & B` means "both A and B at once":

```typescript
type Timestamped = { createdAt: Date };
type Note = { text: string } & Timestamped;   // has text AND createdAt
```

## Key points

- `A | B`: one of them. Narrow with `typeof`, `in`, `instanceof`, equality or truthiness.
- Literal unions (`"a" | "b"`) replace "magic strings".
- Discriminated unions + `switch` + `never` give safe, complete handling of every case.
- `x is T` functions are reusable checks.

## Practice

1. Write `type Result = { ok: true; value: number } | { ok: false; error: string }` and a function that prints either.
2. Add a `"triangle"` shape and see where the compiler complains.
3. Write a type guard `isStringArray(x: unknown): x is string[]`.
