# Constraints, Keys and Normalization

**Constraints** are rules the database enforces on every insert and update, so bad data can't get in no matter which app (or person) writes it.

## The constraint types

| Constraint | Rule |
|---|---|
| `PRIMARY KEY` | uniquely identifies each row; not NULL; one per table |
| `FOREIGN KEY` | value must exist in another table's key |
| `UNIQUE` | no duplicates (one NULL allowed) |
| `CHECK` | a condition must be true |
| `DEFAULT` | value used when none is given |
| `NOT NULL` | a value is required |

## A worked example

Let's add an **attendance** table to SchoolDB:

```sql
USE SchoolDB;

DROP TABLE IF EXISTS dbo.Attendance;

CREATE TABLE dbo.Attendance (
    AttendanceId INT IDENTITY(1,1) NOT NULL,
    EnrollmentId INT NOT NULL,
    ClassDate    DATE NOT NULL,
    Status       CHAR(1) NOT NULL CONSTRAINT DF_Attendance_Status DEFAULT 'P',
    Note         NVARCHAR(200) NULL,

    CONSTRAINT PK_Attendance PRIMARY KEY (AttendanceId),
    CONSTRAINT FK_Attendance_Enrollments FOREIGN KEY (EnrollmentId)
        REFERENCES dbo.Enrollments (EnrollmentId) ON DELETE CASCADE,
    CONSTRAINT UQ_Attendance_Enrollment_Date UNIQUE (EnrollmentId, ClassDate),
    CONSTRAINT CK_Attendance_Status CHECK (Status IN ('P', 'A', 'L')),   -- Present, Absent, Late
    CONSTRAINT CK_Attendance_Date CHECK (ClassDate >= '2020-01-01')
);
```

Try breaking the rules:

```sql
INSERT INTO dbo.Attendance (EnrollmentId, ClassDate) VALUES (1, '2026-01-05');          -- ✅ Status defaults to 'P'
INSERT INTO dbo.Attendance (EnrollmentId, ClassDate) VALUES (1, '2026-01-05');          -- ❌ UNIQUE: same student-course-date
INSERT INTO dbo.Attendance (EnrollmentId, ClassDate, Status) VALUES (2, '2026-01-05', 'X'); -- ❌ CHECK
INSERT INTO dbo.Attendance (EnrollmentId, ClassDate) VALUES (9999, '2026-01-05');       -- ❌ FOREIGN KEY
```

## Primary keys

- **Surrogate key**: a meaningless number (`INT IDENTITY`). Simple and stable; the usual choice.
- **Natural key**: a real-world value (course code, email). These can change, so make them `UNIQUE` rather than the primary key.
- **Composite key**: several columns together, e.g. `PRIMARY KEY (StudentId, CourseId)`.

## Foreign keys and cascading

What happens to child rows when a parent row is deleted or its key changes?

| Option | Effect on child rows |
|---|---|
| `NO ACTION` (default) | the delete/update is **refused** |
| `CASCADE` | children are deleted/updated too |
| `SET NULL` | child column set to NULL |
| `SET DEFAULT` | child column set to its default |

`ON DELETE CASCADE` above means deleting an enrollment also deletes its attendance. Use cascade carefully: one delete can remove a lot of data.

## Adding and removing constraints later

```sql
ALTER TABLE dbo.Students
  ADD CONSTRAINT CK_Students_DOB CHECK (DateOfBirth BETWEEN '1950-01-01' AND '2015-12-31');

ALTER TABLE dbo.Students DROP CONSTRAINT CK_Students_DOB;

-- List a table's constraints
SELECT name, type_desc FROM sys.objects
WHERE parent_object_id = OBJECT_ID('dbo.Attendance') AND type IN ('PK', 'F', 'UQ', 'C', 'D');
```

This is why naming constraints matters: SQL Server's generated names look like `CK__Students__DateO__3B75D760`.

## Normalization: designing tables well

Normalization means organising tables so each fact is stored **once**. Consider one wide table:

| StudentName | City | CourseCode | CourseTitle | Teacher | TeacherEmail | Marks |
|---|---|---|---|---|---|---|
| Asha | Chennai | CS101 | Intro to Programming | Ramesh | ramesh@... | 92 |
| Ravi | Bengaluru | CS101 | Intro to Programming | Ramesh | ramesh@... | 67 |

Problems:
- **Update anomaly**: if Ramesh's email changes, you must change many rows (and might miss one).
- **Insert anomaly**: you can't add a course until a student takes it.
- **Delete anomaly**: deleting the last student in a course loses the course.

### The normal forms (simplified)

1. **1NF**: each cell holds **one** value (no `"maths, physics"` lists) and each row is unique.
2. **2NF**: every non-key column depends on the **whole** key (in a `(StudentId, CourseId)` table, `CourseTitle` depends only on `CourseId`, so it belongs in `Courses`).
3. **3NF**: non-key columns depend **only on the key**, not on other non-key columns (`TeacherEmail` depends on `Teacher`, so it belongs in `Teachers`).

> "Every column depends on the key, the whole key, and nothing but the key."

SchoolDB is in 3NF: students, teachers and courses each have their own table, and `Enrollments` just links them with the marks.

### When to break the rules

Reporting databases sometimes **denormalise** (store copies) for speed. Do this deliberately, not by accident.

## Key points

- Constraints protect data no matter who writes it; name them.
- Use `INT IDENTITY` primary keys and `UNIQUE` for natural keys.
- Choose foreign key actions deliberately; the default refuses dangerous deletes.
- Normalize to 3NF: store each fact once.

## Practice

1. Add a `CHECK` that a teacher's `HireDate` isn't in the future.
2. Design tables for a library: books, authors (a book can have many authors), members, loans. Which keys and constraints do you need?
3. Drop the `Attendance` table when you're done.
