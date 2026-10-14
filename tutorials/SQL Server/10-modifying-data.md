# Modifying Data: INSERT, UPDATE, DELETE, MERGE

These statements **change data**. Practise on SchoolDB; you can reset it any time by re-running the script from *The Sample Database*.

> **Safety habit:** before an `UPDATE` or `DELETE`, run the same `WHERE` as a `SELECT` to see exactly which rows you'll change.

## INSERT

```sql
USE SchoolDB;

-- One row
INSERT INTO dbo.Students (FirstName, LastName, Email, DateOfBirth, City)
VALUES (N'Nisha', N'Varma', N'nisha.v@mail.com', '2005-06-30', N'Chennai');
-- StudentId (IDENTITY) and EnrolledOn (DEFAULT) are filled in automatically

-- Several rows
INSERT INTO dbo.Students (FirstName, LastName, Email, DateOfBirth, City) VALUES
 (N'Rahul', N'Das',   N'rahul.d@mail.com', '2004-04-04', N'Kolkata'),
 (N'Anita', N'Joshi', N'anita.j@mail.com', '2005-09-19', N'Pune');
```

Always list the columns: the statement keeps working if columns are added later.

> Why not leave Anita's email empty (NULL)? Arun already has a NULL email, and the `UNIQUE` constraint on `Email` allows only **one** NULL, so a second one fails with *Violation of UNIQUE KEY constraint*. The *Indexes* lesson shows a filtered unique index that allows many NULLs.

### Getting the new ID

```sql
INSERT INTO dbo.Courses (Code, Title, Credits, TeacherId)
VALUES ('CS301', N'Cloud Computing', 3, 1);

SELECT SCOPE_IDENTITY() AS NewCourseId;   -- the IDENTITY value just created in this scope
```

Or return it straight from the `INSERT` with `OUTPUT`:

```sql
INSERT INTO dbo.Courses (Code, Title, Credits, TeacherId)
OUTPUT inserted.CourseId, inserted.Code
VALUES ('CS302', N'Machine Learning Basics', 4, 4);
```

### INSERT ... SELECT

Copy rows from a query. "Enroll every Chennai student into Statistics (course 6) if they aren't already":

```sql
INSERT INTO dbo.Enrollments (StudentId, CourseId, EnrolledOn)
SELECT s.StudentId, 6, CAST(GETDATE() AS DATE)
FROM dbo.Students AS s
WHERE s.City = N'Chennai'
  AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId AND e.CourseId = 6);
```

### SELECT ... INTO: make a new table from a query

```sql
SELECT StudentId, FirstName, LastName, City
INTO dbo.StudentsBackup
FROM dbo.Students;

DROP TABLE dbo.StudentsBackup;
```

## UPDATE

```sql
-- Check first:
SELECT * FROM dbo.Students WHERE FirstName = N'Arun' AND LastName = N'Prakash';

UPDATE dbo.Students
SET Email = N'arun.p@mail.com'
WHERE FirstName = N'Arun' AND LastName = N'Prakash';
```

> **Without `WHERE`, every row is updated.** `UPDATE dbo.Students SET City = N'Chennai';` moves *everyone* to Chennai.

Several columns, and values calculated from the current ones:

```sql
UPDATE dbo.Teachers
SET Salary = Salary * 1.05,           -- 5% raise
    Department = N'Computer Science'
WHERE TeacherId = 4;
```

### UPDATE with a JOIN

"Add 5 bonus marks (max 100) for everyone in courses taught by Priya Nair":

```sql
UPDATE e
SET e.Marks = IIF(e.Marks + 5 > 100, 100, e.Marks + 5)
FROM dbo.Enrollments AS e
JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
JOIN dbo.Teachers AS t ON t.TeacherId = c.TeacherId
WHERE t.FullName = N'Priya Nair' AND e.Marks IS NOT NULL;
```

### See what changed with OUTPUT

```sql
UPDATE dbo.Enrollments
SET Marks = 40
OUTPUT deleted.EnrollmentId, deleted.Marks AS OldMarks, inserted.Marks AS NewMarks
WHERE Marks BETWEEN 38 AND 39.99;
```

`deleted` holds the old values, `inserted` the new ones.

## DELETE

```sql
SELECT * FROM dbo.Students WHERE FirstName = N'Anita';   -- check first
DELETE FROM dbo.Students WHERE FirstName = N'Anita';
```

A row that other rows depend on can't be deleted while the foreign key exists:

```sql
DELETE FROM dbo.Students WHERE StudentId = 1;
-- ❌ The DELETE statement conflicted with the REFERENCE constraint "FK_Enrollments_Students".
```

Delete the dependent rows first (or design the key with `ON DELETE CASCADE`, see *Constraints and Keys*).

### DELETE with a JOIN

```sql
-- Remove enrollments of students from Kolkata
DELETE e
FROM dbo.Enrollments AS e
JOIN dbo.Students AS s ON s.StudentId = e.StudentId
WHERE s.City = N'Kolkata';
```

### TRUNCATE TABLE

Removes **all** rows very quickly and resets IDENTITY. It can't have a `WHERE` and fails on tables referenced by foreign keys.

```sql
CREATE TABLE dbo.Scratch (Id INT IDENTITY, Note NVARCHAR(50));
INSERT INTO dbo.Scratch (Note) VALUES (N'a'), (N'b');
TRUNCATE TABLE dbo.Scratch;
DROP TABLE dbo.Scratch;
```

## MERGE: insert, update or delete in one statement

Synchronise a target table with a source ("upsert"):

```sql
-- New marks arrive from an exam system
DECLARE @NewMarks TABLE (StudentId INT, CourseId INT, Marks DECIMAL(5,2));
INSERT INTO @NewMarks VALUES (3, 6, 84), (9, 2, 77), (10, 1, 69);   -- Joseph (10) isn't enrolled yet

MERGE dbo.Enrollments AS target
USING @NewMarks AS source
   ON target.StudentId = source.StudentId AND target.CourseId = source.CourseId
WHEN MATCHED THEN
    UPDATE SET target.Marks = source.Marks
WHEN NOT MATCHED BY TARGET THEN
    INSERT (StudentId, CourseId, EnrolledOn, Marks)
    VALUES (source.StudentId, source.CourseId, CAST(GETDATE() AS DATE), source.Marks)
OUTPUT $action AS WhatHappened, inserted.StudentId, inserted.CourseId, inserted.Marks;
```

`MERGE` must end with `;`. For simple cases, a separate `UPDATE` then `INSERT ... WHERE NOT EXISTS` (inside a transaction) is easier to read and debug.

## Variables

T-SQL scripts can hold values in variables:

```sql
DECLARE @CourseId INT = (SELECT CourseId FROM dbo.Courses WHERE Code = 'CS101');
DECLARE @Today DATE = CAST(GETDATE() AS DATE);

SELECT @CourseId AS CourseId, @Today AS Today;
```

## Key points

- List columns in `INSERT`; get new IDs with `SCOPE_IDENTITY()` or `OUTPUT inserted.Id`.
- `UPDATE` and `DELETE` affect **every row** unless you add `WHERE`. Test with `SELECT` first.
- `OUTPUT` shows exactly what changed. Foreign keys block deleting rows that are still referenced.
- `MERGE` inserts/updates/deletes in one statement.

## Practice

1. Add yourself as a student, then enroll yourself in CS201 using the new ID.
2. Give every graded student in PH101 a 2-mark bonus (never above 100), showing old and new marks.
3. Delete all enrollments that have no marks and were made before 2026.
4. Reset the database by re-running the SchoolDB script.
