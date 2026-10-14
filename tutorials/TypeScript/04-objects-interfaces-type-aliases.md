# Objects, Interfaces and Type Aliases

Real programs pass around objects: users, products, exam results. This lesson shows how to describe their **shape**.

## Object types

```typescript
const student: { name: string; rollNo: number } = { name: "Asha", rollNo: 12 };
```

Writing the shape inline gets long, so give it a name.

## Interfaces

```typescript
interface Student {
  name: string;
  rollNo: number;
  email?: string;              // optional property
  readonly admittedOn: Date;   // can't be changed after creation
}

const asha: Student = { name: "Asha", rollNo: 12, admittedOn: new Date() };

asha.name = "Asha K";         // ✅
asha.admittedOn = new Date(); // ❌ Error: Cannot assign to 'admittedOn' because it is a read-only property.
asha.age = 19;                // ❌ Error: Property 'age' does not exist on type 'Student'.
```

## Type aliases

`type` gives a name to **any** type, not just objects:

```typescript
type Student2 = {
  name: string;
  rollNo: number;
};

type ID = number | string;            // a union (interfaces can't do this)
type Point = [x: number, y: number];  // a tuple
```

## Interface or type?

Both describe objects equally well. A simple rule:

- Use **`interface`** for object shapes, especially ones other code may extend.
- Use **`type`** for unions, tuples, function types and anything built from other types.

Consistency matters more than the choice.

## Extending

```typescript
interface Person {
  name: string;
}

interface Teacher extends Person {   // has name + subject
  subject: string;
}

// The same with types, using an intersection (&):
type Teacher2 = Person & { subject: string };

const t: Teacher = { name: "Mr. Kumar", subject: "Physics" };
```

## Methods in object types

```typescript
interface Counter {
  count: number;
  increment(): void;
  add(by: number): number;
}
```

## Index signatures: objects used as dictionaries

When the keys aren't known in advance:

```typescript
const marks: { [subject: string]: number } = {};
marks["maths"] = 95;
marks["physics"] = 88;

// Same thing using the built-in Record type:
const marks2: Record<string, number> = { maths: 95 };
```

With `"noUncheckedIndexedAccess": true` in `tsconfig.json`, `marks["chemistry"]` has type `number | undefined`. That reminds you the key may not exist, which is a common real bug.

## Excess property checks

TypeScript flags extra properties in object **literals**, which catches typos:

```typescript
interface Options { color: string; size: number }
const o: Options = { color: "red", szie: 10 }; // ❌ 'szie' does not exist... Did you mean 'size'?
```

## Structural typing

TypeScript compares types by **shape**, not by name. If an object has the right properties, it fits:

```typescript
interface HasName { name: string }

function hello(x: HasName) { return `Hi ${x.name}`; }

const teacher = { name: "Mr. Kumar", subject: "Physics" };
hello(teacher); // ✅ teacher has a name, so it fits HasName
```

## Nested objects and arrays of objects

```typescript
interface Course {
  code: string;
  title: string;
  teacher: { name: string; email: string };
  students: Student[];
}
```

## Key points

- Describe object shapes with `interface` or `type`.
- `?` marks optional properties, `readonly` stops changes.
- `extends` / `&` build bigger types from smaller ones.
- Types are compared by structure, not by name.

## Practice

1. Write an `interface Book` with `title`, `author`, `year` and optional `isbn`.
2. Write `interface Ebook extends Book` that adds `fileSizeMb`.
3. Write `function oldest(books: Book[]): Book | undefined`.
