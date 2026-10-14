# Triggers

A **trigger** is code that runs automatically when data changes (`INSERT`, `UPDATE`, `DELETE`) or when database objects change (DDL triggers).

## The inserted and deleted tables

Inside a DML trigger, two special tables hold the affected rows:

| Statement | `inserted` | `deleted` |
|---|---|---|
| `INSERT` | new rows | empty |
| `DELETE` | empty | old rows |
| `UPDATE` | rows after the change | rows before the change |

> A trigger runs **once per statement**, not once per row. An `UPDATE` touching 500 rows fires it once with 500 rows in `inserted`. Always write triggers that handle many rows.

## Example: an audit log of mark changes

```sql
USE SchoolDB;

DROP TABLE IF EXISTS dbo.MarksAudit;
CREATE TABLE dbo.MarksAudit (
    AuditId      INT IDENTITY PRIMARY KEY,
    EnrollmentId INT NOT NULL,
    OldMarks     DECIMAL(5,2) NULL,
    NewMarks     DECIMAL(5,2) NULL,
    ChangedBy    NVARCHAR(128) NOT NULL DEFAULT SUSER_SNAME(),
    ChangedAt    DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE OR ALTER TRIGGER dbo.trg_Enrollments_MarksAudit
ON dbo.Enrollments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(Marks) RETURN;   -- only care when the Marks column was in the SET list

    INSERT INTO dbo.MarksAudit (EnrollmentId, OldMarks, NewMarks)
    SELECT i.EnrollmentId, d.Marks, i.Marks
    FROM inserted AS i
    JOIN deleted  AS d ON d.EnrollmentId = i.EnrollmentId
    WHERE EXISTS (SELECT i.Marks EXCEPT SELECT d.Marks);  -- really changed (handles NULLs)
END;
GO
```

Try it:

```sql
UPDATE dbo.Enrollments SET Marks = 81 WHERE EnrollmentId = 13;
UPDATE dbo.Enrollments SET Marks = Marks + 1 WHERE CourseId = 1 AND Marks IS NOT NULL;

SELECT * FROM dbo.MarksAudit ORDER BY AuditId;
```

`EXISTS (SELECT a EXCEPT SELECT b)` is a neat trick to compare values when either might be NULL.

## Example: enforcing a business rule

"A student may take at most 4 courses":

```sql
CREATE OR ALTER TRIGGER dbo.trg_Enrollments_MaxCourses
ON dbo.Enrollments
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT e.StudentId
        FROM dbo.Enrollments AS e
        WHERE e.StudentId IN (SELECT StudentId FROM inserted)
        GROUP BY e.StudentId
        HAVING COUNT(*) > 4
    )
    BEGIN
        THROW 50020, 'A student can take at most 4 courses.', 1;   -- also rolls back the statement
    END;
END;
GO
```

## INSTEAD OF triggers

These replace the action. A common use is a "soft delete" that marks rows inactive instead of deleting them:

```sql
ALTER TABLE dbo.Courses ADD IsActive BIT NOT NULL CONSTRAINT DF_Courses_IsActive DEFAULT 1;
GO

CREATE OR ALTER TRIGGER dbo.trg_Courses_SoftDelete
ON dbo.Courses
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET IsActive = 0
    FROM dbo.Courses AS c
    JOIN deleted AS d ON d.CourseId = c.CourseId;
END;
GO

DELETE FROM dbo.Courses WHERE Code = 'MA201';
SELECT Code, IsActive FROM dbo.Courses;   -- MA201 is still there, inactive
```

## Managing triggers

```sql
SELECT name, OBJECT_NAME(parent_id) AS TableName, is_disabled FROM sys.triggers;

DISABLE TRIGGER dbo.trg_Enrollments_MaxCourses ON dbo.Enrollments;
ENABLE TRIGGER dbo.trg_Enrollments_MaxCourses ON dbo.Enrollments;

DROP TRIGGER IF EXISTS dbo.trg_Courses_SoftDelete;
DROP TRIGGER IF EXISTS dbo.trg_Enrollments_MaxCourses;
DROP TRIGGER IF EXISTS dbo.trg_Enrollments_MarksAudit;
DROP TABLE IF EXISTS dbo.MarksAudit;
ALTER TABLE dbo.Courses DROP CONSTRAINT DF_Courses_IsActive;
ALTER TABLE dbo.Courses DROP COLUMN IsActive;
```

## Use triggers sparingly

Triggers are **hidden**: someone running an `UPDATE` may not know extra work happens. They also slow down writes and can cause surprising errors. Good uses: auditing, and rules that must hold no matter which app writes. Prefer constraints (`CHECK`, `FOREIGN KEY`) when they can express the rule, and stored procedures for business workflows.

> For full change history, look at SQL Server's **temporal tables** (`SYSTEM_VERSIONING = ON`), which keep every old version of a row automatically.

## Key points

- Triggers run automatically after (or instead of) `INSERT`/`UPDATE`/`DELETE`.
- `inserted`/`deleted` hold the affected rows. Handle many rows, not one.
- `THROW` inside a trigger rejects the change.
- Prefer constraints when possible; keep triggers small and documented.

## Practice

1. Write an audit trigger for teacher salary changes.
2. Write a trigger that stops `EnrolledOn` from being set to a future date.
3. Drop the triggers and tables you created.
