# Stored Procedures and Functions

A **stored procedure** is a saved T-SQL program you run by name, with parameters. A **function** returns a value or a table and can be used inside queries.

## Creating a stored procedure

```sql
USE SchoolDB;
GO

CREATE OR ALTER PROCEDURE dbo.GetStudentReport
    @StudentId INT
AS
BEGIN
    SET NOCOUNT ON;   -- don't send "(n rows affected)" messages

    SELECT s.FirstName, s.LastName, c.Code, c.Title, e.Marks
    FROM dbo.Enrollments AS e
    JOIN dbo.Students AS s ON s.StudentId = e.StudentId
    JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
    WHERE e.StudentId = @StudentId
    ORDER BY c.Code;
END;
GO

EXEC dbo.GetStudentReport @StudentId = 1;
```

## Parameters with defaults

```sql
CREATE OR ALTER PROCEDURE dbo.SearchStudents
    @City     NVARCHAR(50) = NULL,     -- NULL means "any city"
    @BornFrom DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT StudentId, FirstName, LastName, City, DateOfBirth
    FROM dbo.Students
    WHERE (@City IS NULL OR City = @City)
      AND (@BornFrom IS NULL OR DateOfBirth >= @BornFrom)
    ORDER BY LastName;
END;
GO

EXEC dbo.SearchStudents;                                  -- everyone
EXEC dbo.SearchStudents @City = N'Chennai';
EXEC dbo.SearchStudents @BornFrom = '2005-01-01';
```

## A procedure that changes data, with validation

```sql
CREATE OR ALTER PROCEDURE dbo.EnrollStudent
    @StudentId     INT,
    @CourseCode    VARCHAR(10),
    @EnrollmentId  INT OUTPUT          -- returned to the caller
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CourseId INT = (SELECT CourseId FROM dbo.Courses WHERE Code = @CourseCode);

    IF @CourseId IS NULL
        THROW 50001, 'No course with that code.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Students WHERE StudentId = @StudentId)
        THROW 50002, 'No student with that ID.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Enrollments WHERE StudentId = @StudentId AND CourseId = @CourseId)
        THROW 50003, 'The student is already enrolled in this course.', 1;

    INSERT INTO dbo.Enrollments (StudentId, CourseId, EnrolledOn)
    VALUES (@StudentId, @CourseId, CAST(GETDATE() AS DATE));

    SET @EnrollmentId = SCOPE_IDENTITY();
END;
GO

DECLARE @NewId INT;
EXEC dbo.EnrollStudent @StudentId = 10, @CourseCode = 'CS201', @EnrollmentId = @NewId OUTPUT;
SELECT @NewId AS NewEnrollmentId;
```

`THROW number, message, state` raises an error (user error numbers start at 50000). The caller (or a `TRY...CATCH`, next lesson) receives it.

## Control flow in T-SQL

```sql
DECLARE @Avg DECIMAL(5,2) = (SELECT AVG(Marks) FROM dbo.Enrollments);

IF @Avg >= 75
    PRINT N'The class is doing well: ' + CAST(@Avg AS NVARCHAR(10));
ELSE
BEGIN
    PRINT N'Average is ' + CAST(@Avg AS NVARCHAR(10));
    PRINT N'Consider extra classes.';
END;

DECLARE @i INT = 1;
WHILE @i <= 3
BEGIN
    PRINT CONCAT(N'Round ', @i);
    SET @i += 1;
END;
```

> Loops are fine for scripts, but **query data with set-based SQL**, not loops over rows. It's usually far faster.

## Scalar functions: return one value

```sql
CREATE OR ALTER FUNCTION dbo.GradeFor (@Marks DECIMAL(5,2))
RETURNS NVARCHAR(10)
AS
BEGIN
    RETURN CASE
        WHEN @Marks IS NULL THEN N'Pending'
        WHEN @Marks >= 90 THEN N'A'
        WHEN @Marks >= 75 THEN N'B'
        WHEN @Marks >= 60 THEN N'C'
        WHEN @Marks >= 40 THEN N'D'
        ELSE N'F'
    END;
END;
GO

SELECT StudentId, CourseId, Marks, dbo.GradeFor(Marks) AS Grade
FROM dbo.Enrollments;
```

## Table-valued functions: return a table

An **inline** table-valued function is like a view with parameters:

```sql
CREATE OR ALTER FUNCTION dbo.CourseRoster (@CourseCode VARCHAR(10))
RETURNS TABLE
AS
RETURN
    SELECT s.StudentId, s.FirstName, s.LastName, e.Marks
    FROM dbo.Enrollments AS e
    JOIN dbo.Students AS s ON s.StudentId = e.StudentId
    JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
    WHERE c.Code = @CourseCode;
GO

SELECT * FROM dbo.CourseRoster('CS101') ORDER BY Marks DESC;

-- Use with CROSS APPLY to run it once per course:
SELECT c.Code, r.FirstName, r.Marks
FROM dbo.Courses AS c
CROSS APPLY dbo.CourseRoster(c.Code) AS r;
```

## Procedures vs functions

| | Stored procedure | Function |
|---|---|---|
| Called with | `EXEC` | inside a query (`SELECT dbo.f(x)`) |
| Can change data | ✅ | ❌ |
| Returns | result sets, OUTPUT params, a status code | one value or one table |
| Error handling (`TRY...CATCH`) | ✅ | ❌ |

## Managing them

```sql
SELECT name, type_desc, modify_date FROM sys.objects WHERE type IN ('P', 'FN', 'IF', 'TF');
EXEC sp_helptext 'dbo.EnrollStudent';
DROP PROCEDURE IF EXISTS dbo.SearchStudents;
DROP FUNCTION IF EXISTS dbo.CourseRoster;
```

## Key points

- Procedures package logic with parameters; `EXEC` runs them; `OUTPUT` returns values.
- Validate inputs and `THROW` clear errors.
- Scalar functions return a value; inline table-valued functions are parameterised views.
- Prefer set-based queries to loops.

## Practice

1. Write `dbo.SetMarks @EnrollmentId, @Marks` that rejects marks outside 0–100 with `THROW`.
2. Write `dbo.FullName(@StudentId)` returning "First Last".
3. Write an inline function `dbo.StudentsInCity(@City)` and use it.
