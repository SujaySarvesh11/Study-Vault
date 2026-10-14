# Utility Types

TypeScript ships with ready-made generic types that transform other types. They save you from writing near-duplicate interfaces.

We'll use this type in the examples:

```typescript
interface Student {
  id: number;
  name: string;
  email: string;
  phone?: string;
}
```

## `Partial<T>`: everything optional

Useful for updates, where only some fields are sent:

```typescript
function updateStudent(id: number, changes: Partial<Student>) { /* ... */ }
updateStudent(1, { email: "asha@school.in" }); // ✅ other fields can be left out
```

## `Required<T>`: nothing optional

```typescript
type CompleteStudent = Required<Student>; // phone is now required too
```

## `Readonly<T>`: nothing can be changed

```typescript
const s: Readonly<Student> = { id: 1, name: "Asha", email: "a@x.in" };
s.name = "Ravi"; // ❌ Error: read-only
```

## `Pick<T, Keys>` and `Omit<T, Keys>`

```typescript
type StudentCard = Pick<Student, "id" | "name">;   // { id; name }
type NewStudent = Omit<Student, "id">;             // everything except id (the database assigns it)
```

StudyVault's editor uses `Pick<Page, "title" | "section" | "content_md" | "shared">` for a page that hasn't been saved yet.

## `Record<Keys, Value>`

An object type with the given keys and value type:

```typescript
type Subject = "maths" | "physics" | "chemistry";
const marks: Record<Subject, number> = { maths: 95, physics: 88, chemistry: 91 }; // all three required

const counts: Record<string, number> = {}; // any string key
```

## `Exclude`, `Extract` and `NonNullable` (for unions)

```typescript
type Status = "draft" | "published" | "archived";

type Visible = Exclude<Status, "archived">;            // "draft" | "published"
type Done = Extract<Status, "published" | "archived">; // "published" | "archived"
type Name = NonNullable<string | null | undefined>;    // string
```

## `ReturnType`, `Parameters` and `Awaited` (for functions)

```typescript
function createUser(name: string, age: number) {
  return { id: Date.now(), name, age };
}

type User = ReturnType<typeof createUser>;     // { id: number; name: string; age: number }
type Args = Parameters<typeof createUser>;     // [name: string, age: number]

async function loadUser() { return { id: 1, name: "Asha" }; }
type Loaded = Awaited<ReturnType<typeof loadUser>>; // { id: number; name: string } (not the Promise)
```

These let one function be the "source of truth": change it and dependent types update automatically.

## Combining utility types

```typescript
// Everything optional except id:
type StudentPatch = Partial<Omit<Student, "id">> & Pick<Student, "id">;

const patch: StudentPatch = { id: 3, phone: "98400 00000" };
```

## Quick reference

| Utility | Result |
|---|---|
| `Partial<T>` | all properties optional |
| `Required<T>` | all properties required |
| `Readonly<T>` | all properties read-only |
| `Pick<T, K>` | only keys K |
| `Omit<T, K>` | all keys except K |
| `Record<K, V>` | object with keys K and values V |
| `Exclude<U, X>` | remove X from union U |
| `Extract<U, X>` | keep only X from union U |
| `NonNullable<T>` | remove `null` and `undefined` |
| `ReturnType<F>` | what function F returns |
| `Parameters<F>` | F's parameters as a tuple |
| `Awaited<P>` | the value inside a Promise |

## Key points

- Utility types derive new types from existing ones, so you don't repeat yourself.
- `Partial`/`Pick`/`Omit` are the everyday ones for API inputs and outputs.
- `ReturnType`/`Parameters` let types follow your functions automatically.

## Practice

1. Define `type CreateBook = Omit<Book, "id">` and `type UpdateBook = Partial<CreateBook>`.
2. Use `Record<Weekday, string[]>` for a weekly timetable.
3. Given a function `getStats()`, get its return type without writing it by hand.
