# Using SQL Server from TypeScript

This lesson connects the two courses: a TypeScript (Node.js) program that reads and writes **SchoolDB** using the **mssql** package.

## 1. Let the app sign in

The `mssql` package's default driver (tedious) uses **SQL Server authentication** (username + password). Set it up once:

1. In SSMS: right-click the server → **Properties → Security** → choose **SQL Server and Windows Authentication mode** → OK. Then restart the SQL Server service (right-click the server → **Restart**).
2. Create a login with only the permissions the app needs:

```sql
USE master;
CREATE LOGIN school_app WITH PASSWORD = N'Choose-A-Long-Passphrase-2026!';
GO
USE SchoolDB;
CREATE USER school_app FOR LOGIN school_app;
ALTER ROLE db_datareader ADD MEMBER school_app;
ALTER ROLE db_datawriter ADD MEMBER school_app;
GRANT EXECUTE ON SCHEMA::dbo TO school_app;    -- run stored procedures
```

## 2. Project setup

```bash
mkdir school-app && cd school-app
npm init -y
npm pkg set type=module
npm install mssql
npm install -D typescript @types/node @types/mssql
```

Create `.env` (and never commit it to Git):

```
DB_SERVER=localhost
DB_NAME=SchoolDB
DB_USER=school_app
DB_PASSWORD=Choose-A-Long-Passphrase-2026!
```

## 3. Connecting with a pool

A **connection pool** keeps a few connections open and reuses them, which is much faster than connecting for every query. Create **one pool** for the whole app:

```typescript
// src/db.ts
import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_SERVER ?? "localhost",
  database: process.env.DB_NAME ?? "SchoolDB",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,                 // TLS
    trustServerCertificate: true,  // OK for a local dev server with a self-signed certificate
  },
  pool: { max: 10, idleTimeoutMillis: 30_000 },
};

export const pool = await new sql.ConnectionPool(config).connect();
export { sql };
```

## 4. Typed queries with parameters

Describe the row shape, then pass it to `query<T>()`:

```typescript
// src/students.ts
import { pool, sql } from "./db.ts";

export interface Student {
  StudentId: number;
  FirstName: string;
  LastName: string;
  Email: string | null;      // the column allows NULL, so the type must too
  City: string;
  DateOfBirth: Date;         // DATE columns arrive as JavaScript Date objects
}

export async function studentsInCity(city: string): Promise<Student[]> {
  const result = await pool.request()
    .input("city", sql.NVarChar(50), city)      // ✅ parameter: safe from SQL injection
    .query<Student>(`
      SELECT StudentId, FirstName, LastName, Email, City, DateOfBirth
      FROM dbo.Students
      WHERE City = @city
      ORDER BY LastName`);
  return result.recordset;
}

export async function getStudent(id: number): Promise<Student | undefined> {
  const result = await pool.request()
    .input("id", sql.Int, id)
    .query<Student>("SELECT StudentId, FirstName, LastName, Email, City, DateOfBirth FROM dbo.Students WHERE StudentId = @id");
  return result.recordset[0];
}
```

> **Never** build SQL with template strings like `` `WHERE City = '${city}'` ``. Always use `.input()` parameters (see *Security and Permissions*).

`query<Student>()` tells TypeScript the row shape. It's an **assumption**: if the SQL selects different columns, TypeScript can't know. Keep the column list and the interface side by side, as above.

## 5. Inserting and getting the new ID

```typescript
export interface NewStudent {
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth: string;   // "YYYY-MM-DD"
  city: string;
}

export async function addStudent(s: NewStudent): Promise<number> {
  const result = await pool.request()
    .input("first", sql.NVarChar(50), s.firstName)
    .input("last", sql.NVarChar(50), s.lastName)
    .input("email", sql.NVarChar(200), s.email ?? null)
    .input("dob", sql.Date, s.dateOfBirth)
    .input("city", sql.NVarChar(50), s.city)
    .query<{ StudentId: number }>(`
      INSERT INTO dbo.Students (FirstName, LastName, Email, DateOfBirth, City)
      OUTPUT inserted.StudentId
      VALUES (@first, @last, @email, @dob, @city)`);
  return result.recordset[0]!.StudentId;
}
```

## 6. Calling a stored procedure

`dbo.EnrollStudent` from the *Stored Procedures* lesson has an `OUTPUT` parameter:

```typescript
export async function enroll(studentId: number, courseCode: string): Promise<number> {
  const result = await pool.request()
    .input("StudentId", sql.Int, studentId)
    .input("CourseCode", sql.VarChar(10), courseCode)
    .output("EnrollmentId", sql.Int)
    .execute("dbo.EnrollStudent");
  return result.output.EnrollmentId as number;
}
```

## 7. Handling database errors

```typescript
try {
  await enroll(1, "CS201");
} catch (err) {
  if (err instanceof sql.RequestError) {
    // err.number is the SQL Server error number
    if (err.number === 50003) console.log("Already enrolled");
    else if (err.number === 2627 || err.number === 2601) console.log("Duplicate value");
    else if (err.number === 547) console.log("Constraint check failed (foreign key or CHECK)");
    else throw err;
  } else {
    throw err;
  }
}
```

## 8. Transactions

```typescript
export async function transferMarks(fromEnrollment: number, toEnrollment: number): Promise<void> {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const moved = await new sql.Request(tx)
      .input("id", sql.Int, fromEnrollment)
      .query<{ Marks: number | null }>("SELECT Marks FROM dbo.Enrollments WHERE EnrollmentId = @id");
    const marks = moved.recordset[0]?.Marks ?? null;

    await new sql.Request(tx).input("id", sql.Int, toEnrollment).input("m", sql.Decimal(5, 2), marks)
      .query("UPDATE dbo.Enrollments SET Marks = @m WHERE EnrollmentId = @id");
    await new sql.Request(tx).input("id", sql.Int, fromEnrollment)
      .query("UPDATE dbo.Enrollments SET Marks = NULL WHERE EnrollmentId = @id");

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
```

## 9. Putting it in an Express API

```typescript
// src/server.ts
import express from "express";
import { z } from "zod";
import { addStudent, getStudent, studentsInCity } from "./students.ts";

const app = express();
app.use(express.json());

app.get("/api/students", async (req, res) => {
  res.json(await studentsInCity(String(req.query.city ?? "Chennai")));
});

app.get("/api/students/:id", async (req, res) => {
  const s = await getStudent(Number(req.params.id));
  if (!s) return void res.status(404).json({ detail: "Not found" });
  res.json(s);
});

const NewStudentIn = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email().optional(),
  dateOfBirth: z.iso.date(),
  city: z.string().min(1).max(50),
});

app.post("/api/students", async (req, res) => {
  const parsed = NewStudentIn.safeParse(req.body);
  if (!parsed.success) return void res.status(422).json({ detail: parsed.error.issues[0]?.message });
  res.status(201).json({ id: await addStudent(parsed.data) });
});

app.listen(3000, () => console.log("http://localhost:3000/api/students?city=Chennai"));
```

Run it (with `npm install express zod` and `npm install -D @types/express`):

```bash
node --env-file=.env src/server.ts
```

## Windows authentication instead of a password (optional)

To sign in with your Windows account, use the `msnodesqlv8` driver (Windows only; needs Microsoft's ODBC Driver for SQL Server):

```bash
npm install msnodesqlv8
```

```typescript
import sql from "mssql/msnodesqlv8";

const pool = await new sql.ConnectionPool({
  connectionString: "Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=SchoolDB;Trusted_Connection=yes;TrustServerCertificate=yes;",
}).connect();
```

## Type mapping cheat sheet

| SQL Server | `sql.` type for inputs | Arrives in JS as |
|---|---|---|
| `INT`, `SMALLINT`, `TINYINT` | `sql.Int`, `sql.SmallInt`, `sql.TinyInt` | `number` |
| `BIGINT` | `sql.BigInt` | `string` (to avoid losing precision) |
| `DECIMAL(p,s)` | `sql.Decimal(p, s)` | `number` |
| `BIT` | `sql.Bit` | `boolean` |
| `NVARCHAR(n)` | `sql.NVarChar(n)` | `string` |
| `DATE`, `DATETIME2` | `sql.Date`, `sql.DateTime2` | `Date` |
| `UNIQUEIDENTIFIER` | `sql.UniqueIdentifier` | `string` |
| `NULL` | (any) `null` | `null` |

## Key points

- Use one shared **connection pool**; configure it from environment variables.
- **Always** pass values with `.input()` parameters.
- Type rows with `query<T>()` and keep interfaces in sync with the selected columns; NULL-able columns need `| null`.
- Wrap multi-step changes in `sql.Transaction`; handle `sql.RequestError` by `number`.

## Practice

1. Add `GET /api/courses/:code/roster` that calls `dbo.CourseRoster`.
2. Add `POST /api/enrollments` that calls `dbo.EnrollStudent` and returns 409 if already enrolled.
3. Write a test with `node:test` that adds a student, reads it back and deletes it.
