# Enums and Literal Types

You often need a fixed set of named values: days of the week, order statuses, user roles. TypeScript has two ways to do this.

## Enums

```typescript
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right,   // 3
}

let move: Direction = Direction.Up;
```

String enums are easier to read when debugging:

```typescript
enum Status {
  Active = "ACTIVE",
  Suspended = "SUSPENDED",
}
console.log(Status.Active); // "ACTIVE"
```

### Why many projects avoid enums

- Enums are one of the few TypeScript features that **produce JavaScript code**; they are not just types. Node.js's built-in TypeScript support only *strips* types, so `node file.ts` **can't run enums** unless you pass `--experimental-transform-types`. StudyVault's `tsconfig.json` sets `"erasableSyntaxOnly": true`, which forbids them for this reason.
- Numeric enums accept any number: `let d: Direction = 99` is allowed.

## The modern alternative: literal unions

```typescript
type Direction = "up" | "down" | "left" | "right";

function go(d: Direction) { /* ... */ }
go("up");     // ✅ autocompleted
go("north");  // ❌ Error
```

It costs nothing at runtime, gives the same safety and autocomplete, and the values are readable strings in logs and JSON.

## A constant object + type (when you also need the values at runtime)

```typescript
const Status = {
  Active: "ACTIVE",
  Suspended: "SUSPENDED",
} as const;

type Status = (typeof Status)[keyof typeof Status]; // "ACTIVE" | "SUSPENDED"

function setStatus(s: Status) { /* ... */ }
setStatus(Status.Active); // ✅ reads like an enum
setStatus("ACTIVE");      // ✅ the plain value works too

// You can loop over the values at runtime:
for (const value of Object.values(Status)) console.log(value);
```

`keyof typeof Status` is `"Active" | "Suspended"` (the keys); indexing with it gives the values. See *Advanced Types* for `keyof` and `typeof`.

## Arrays of allowed values

```typescript
const ROLES = ["owner", "viewer"] as const;
type Role = (typeof ROLES)[number];   // "owner" | "viewer"

function isRole(x: string): x is Role {
  return (ROLES as readonly string[]).includes(x);
}
```

This is handy for validating input: the list is available at runtime, and the type comes from the same list.

## Key points

- Prefer **literal unions** (`"a" | "b"`) for fixed sets of values.
- Use an `as const` object or array when you need the values at runtime too.
- Enums work but emit JavaScript, aren't supported by Node's type stripping, and numeric enums are loosely checked.

## Practice

1. Model traffic-light colours as a literal union and write `next(light)`.
2. Create `const Weekday = {...} as const` and derive a `Weekday` type.
3. Write `isWeekday(x: string): x is Weekday`.
