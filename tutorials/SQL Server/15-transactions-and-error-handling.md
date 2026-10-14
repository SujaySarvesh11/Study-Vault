# Transactions and Error Handling

A **transaction** groups several changes so they **all happen or none do**. The classic example is a bank transfer: taking money from one account and adding it to another must never half-happen.

## ACID

| Property | Meaning |
|---|---|
| **A**tomic | all or nothing |
| **C**onsistent | constraints hold before and after |
| **I**solated | other users don't see half-finished work |
| **D**urable | once committed, it survives a crash |

## BEGIN, COMMIT, ROLLBACK

```sql
USE SchoolDB;

BEGIN TRANSACTION;

UPDATE dbo.Teachers SET Salary = Salary - 5000 WHERE TeacherId = 3;
UPDATE dbo.Teachers SET Salary = Salary + 5000 WHERE TeacherId = 4;

SELECT TeacherId, Salary FROM dbo.Teachers WHERE TeacherId IN (3, 4);  -- you see the changes

ROLLBACK TRANSACTION;   -- undo both; use COMMIT TRANSACTION to keep them

SELECT TeacherId, Salary FROM dbo.Teachers WHERE TeacherId IN (3, 4);  -- back to the original values
```

Until `COMMIT`, other sessions can't see your changes, and the changed rows stay **locked**, so keep transactions short.

## TRY...CATCH

```sql
BEGIN TRY
    SELECT 10 / 0 AS Boom;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER()    AS Number,
           ERROR_MESSAGE()   AS Message,
           ERROR_LINE()      AS Line,
           ERROR_PROCEDURE() AS InProcedure;
END CATCH;
```

## The safe pattern: transaction + TRY...CATCH

```sql
CREATE OR ALTER PROCEDURE dbo.TransferStudent
    @StudentId    INT,
    @FromCourse   VARCHAR(10),
    @ToCourse     VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- any error rolls back the whole transaction automatically

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @From INT = (SELECT CourseId FROM dbo.Courses WHERE Code = @FromCourse);
        DECLARE @To   INT = (SELECT CourseId FROM dbo.Courses WHERE Code = @ToCourse);
        IF @From IS NULL OR @To IS NULL THROW 50010, 'Unknown course code.', 1;

        DELETE FROM dbo.Enrollments WHERE StudentId = @StudentId AND CourseId = @From;
        IF @@ROWCOUNT = 0 THROW 50011, 'The student is not in the course to leave.', 1;

        INSERT INTO dbo.Enrollments (StudentId, CourseId, EnrolledOn)
        VALUES (@StudentId, @To, CAST(GETDATE() AS DATE));   -- fails if already enrolled (UNIQUE)

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;   -- re-raise the original error to the caller
    END CATCH;
END;
GO

EXEC dbo.TransferStudent @StudentId = 6, @FromCourse = 'CS101', @ToCourse = 'CS201';  -- ✅ Arun moves
EXEC dbo.TransferStudent @StudentId = 1, @FromCourse = 'CS101', @ToCourse = 'CS201';  -- ❌ Asha is already in CS201: nothing changes
```

The second call deletes Asha's CS101 enrollment, then the insert fails, so the **whole** transaction is rolled back and her CS101 enrollment comes back.

Remember this template:
1. `SET XACT_ABORT ON;`
2. `BEGIN TRY` → `BEGIN TRANSACTION` → work → `COMMIT`
3. `BEGIN CATCH` → `IF @@TRANCOUNT > 0 ROLLBACK` → `THROW`

## Concurrency and isolation levels

When many users work at once, isolation levels choose between **consistency** and **waiting**:

| Level | Prevents | Notes |
|---|---|---|
| `READ UNCOMMITTED` | nothing | can read uncommitted ("dirty") data. Avoid (`NOLOCK` does this) |
| `READ COMMITTED` (default) | dirty reads | readers may wait for writers |
| `REPEATABLE READ` | rows you read can't change | more blocking |
| `SERIALIZABLE` | also new rows appearing in your range | most blocking |
| `SNAPSHOT` | reads a consistent snapshot without blocking writers | needs to be enabled on the database |

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;
    -- e.g. check seats left, then enroll, with no one sneaking in between
COMMIT;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

Many teams turn on **READ_COMMITTED_SNAPSHOT** so readers never block writers:

```sql
ALTER DATABASE SchoolDB SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
```

## Deadlocks

Two transactions each wait for a lock the other holds; SQL Server kills one (error **1205**). To reduce them:
- Keep transactions short.
- Access tables in the same order everywhere.
- Retry the victim transaction in your application.

## Key points

- Transactions make several changes all-or-nothing: `BEGIN TRAN` / `COMMIT` / `ROLLBACK`.
- Use `SET XACT_ABORT ON` + `TRY...CATCH` + `THROW` as the standard pattern.
- `@@ROWCOUNT` tells you how many rows the last statement changed.
- Keep transactions short; choose isolation levels deliberately.

## Practice

1. In a transaction, delete all enrollments, check the count, then roll back.
2. Write `dbo.RaiseSalary @Department, @Percent` that rejects percentages over 20 and runs in a transaction.
3. Call `TransferStudent` with an unknown course code and read the error.
