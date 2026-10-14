# Classes

Classes bundle data and the functions that work on it. TypeScript adds types and access control to JavaScript classes.

## A basic class

```typescript
class BankAccount {
  owner: string;
  balance: number;

  constructor(owner: string, balance = 0) {
    this.owner = owner;
    this.balance = balance;
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("Amount must be positive");
    this.balance += amount;
  }
}

const acc = new BankAccount("Asha", 500);
acc.deposit(250);
console.log(acc.balance); // 750
```

## Access modifiers

| Modifier | Who can use it |
|---|---|
| `public` (default) | everyone |
| `private` | only code inside this class |
| `protected` | this class and classes that extend it |
| `readonly` | can be set only in the constructor |

```typescript
class Account {
  readonly id: string;
  private balance = 0;

  constructor(id: string) {
    this.id = id;
  }

  getBalance(): number { return this.balance; }
}

const a = new Account("AC-1");
a.balance = 1_000_000; // ❌ Error: Property 'balance' is private.
a.id = "AC-2";         // ❌ Error: Cannot assign to 'id' because it is a read-only property.
```

`private` is checked only by TypeScript. JavaScript's own **`#private`** fields are private even at runtime:

```typescript
class Safe {
  #pin = "1234";
  check(pin: string) { return pin === this.#pin; }
}
```

## Getters and setters

```typescript
class Temperature {
  #celsius = 0;

  get fahrenheit(): number { return this.#celsius * 9 / 5 + 32; }
  set fahrenheit(f: number) { this.#celsius = (f - 32) * 5 / 9; }
}

const t = new Temperature();
t.fahrenheit = 98.6;
```

## Inheritance

```typescript
class Person {
  constructor(name: string) { this.name = name; }
  name: string;
  describe(): string { return `I am ${this.name}`; }
}

class Teacher extends Person {
  subject: string;
  constructor(name: string, subject: string) {
    super(name);              // must call the parent constructor first
    this.subject = subject;
  }
  override describe(): string {   // "override" makes sure the parent really has this method
    return `${super.describe()} and I teach ${this.subject}`;
  }
}
```

## Abstract classes

An abstract class can't be created directly; it is a template for subclasses:

```typescript
abstract class Shape {
  abstract area(): number;                       // subclasses must implement this
  describe() { return `Area: ${this.area().toFixed(2)}`; }
}

class Circle extends Shape {
  constructor(private r: number) { super(); }    // see note on parameter properties below
  area() { return Math.PI * this.r ** 2; }
}
```

## Implementing interfaces

```typescript
interface Printable { print(): string }

class Invoice implements Printable {
  constructor(public total: number) {}
  print() { return `Total: ₹${this.total}`; }
}
```

`implements` only *checks* that the class fits the interface; it adds nothing.

## Parameter properties

`constructor(private r: number)` declares **and** assigns `this.r` in one go. It's a TypeScript-only shortcut that generates JavaScript, so it's not allowed with `erasableSyntaxOnly` (as in StudyVault). Write the property and assignment out by hand there.

## Static members

```typescript
class IdGenerator {
  static #next = 1;
  static nextId(): number { return IdGenerator.#next++; }
}
IdGenerator.nextId(); // 1
```

## `this` and callbacks

```typescript
class Timer {
  seconds = 0;
  start() {
    setInterval(() => this.seconds++, 1000); // ✅ arrow function keeps "this"
    // setInterval(function () { this.seconds++ }, 1000); ❌ "this" is not the Timer
  }
}
```

## When to use classes

Classes suit things with **state and behaviour together** (a shopping cart, a game character, a database connection). For plain data that travels as JSON, use interfaces and functions. StudyVault uses one class (`HttpError`) and plain objects everywhere else.

## Key points

- `private`/`protected`/`readonly` control access; `#field` is private at runtime too.
- `extends` + `super(...)` for inheritance; mark overriding methods with `override`.
- `abstract` classes define templates; `implements` checks a class against an interface.

## Practice

1. Write a `Stack<T>`-like class for numbers with `push`, `pop` and a `size` getter.
2. Create `abstract class Employee` with `abstract salary(): number`, and two subclasses.
3. Make a `Counter` class whose count can't go below zero.
