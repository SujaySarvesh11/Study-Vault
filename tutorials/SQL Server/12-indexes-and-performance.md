# Indexes and Performance

An **index** is like a book's index: instead of reading every page (row), SQL Server jumps straight to what it needs. With 10 rows it doesn't matter; with 10 million it's the difference between 5 ms and 50 seconds.

## Clustered and nonclustered indexes

- **Clustered index**: the table's rows are *stored* in this order. One per table. The primary key is clustered by default.
- **Nonclustered index**: a separate sorted list of key values with pointers to the rows. Many per table.

```sql
USE SchoolDB;

-- Speed up searches by city
CREATE NONCLUSTERED INDEX IX_Students_City ON dbo.Students (City);

-- Speed up "all enrollments for a course", and carry Marks along
CREATE INDEX IX_Enrollments_CourseId ON dbo.Enrollments (CourseId) INCLUDE (Marks);
```

`INCLUDE` adds extra columns to the index so a query can be answered from the index alone (a **covering index**).

## Composite indexes: column order matters

```sql
CREATE INDEX IX_Students_LastName_FirstName ON dbo.Students (LastName, FirstName);
```

This helps `WHERE LastName = ...` and `WHERE LastName = ... AND FirstName = ...`, but **not** `WHERE FirstName = ...` alone, just as a phone book sorted by surname can't find all "Ravi"s quickly.

## Unique and filtered indexes

```sql
-- Unique emails, but allow many NULLs (a UNIQUE constraint allows only one NULL)
DROP INDEX IF EXISTS UX_Students_Email_NotNull ON dbo.Students;
CREATE UNIQUE INDEX UX_Students_Email_NotNull ON dbo.Students (Email) WHERE Email IS NOT NULL;

-- Index only ungraded enrollments (small and fast for a "to grade" screen)
CREATE INDEX IX_Enrollments_Ungraded ON dbo.Enrollments (CourseId) WHERE Marks IS NULL;
```

## Seeing how a query runs

In SSMS, press **Ctrl+M** (*Include Actual Execution Plan*) and run a query. Look for:

| Plan operator | Meaning |
|---|---|
| **Index Seek** | jumped straight to the rows ✅ |
| **Index Scan / Table Scan** | read everything ⚠️ (fine for small tables) |
| **Key Lookup** | found the row in an index, then fetched more columns from the table. Consider `INCLUDE` |

Measure work done:

```sql
SET STATISTICS IO, TIME ON;
SELECT FirstName, LastName FROM dbo.Students WHERE City = N'Chennai';
SET STATISTICS IO, TIME OFF;
```

The *Messages* tab shows "logical reads". Fewer is better.

## Writing index-friendly queries ("SARGable")

An index on a column can't be used for seeking if you wrap the column in a function:

```sql
-- ❌ Can't seek: YEAR() runs on every row
SELECT * FROM dbo.Students WHERE YEAR(EnrolledOn) = 2024;

-- ✅ Can seek on an index on EnrolledOn
SELECT * FROM dbo.Students WHERE EnrolledOn >= '2024-01-01' AND EnrolledOn < '2025-01-01';
```

Similarly:
- `WHERE Email LIKE N'asha%'` ✅ can seek; `LIKE N'%asha'` ❌ can't.
- Compare columns to the **same type**. `NVARCHAR` column = `N'...'` literal, to avoid hidden conversions.

## The cost of indexes

Indexes speed up reads but **slow down writes** (every insert/update/delete must update each index) and use disk space. Guidelines:

- Index **foreign key** columns (used in joins) and columns often in `WHERE`/`ORDER BY`.
- Don't index tiny tables or columns with very few distinct values (like a `BIT`), unless filtered.
- Remove indexes nobody uses.

## Finding missing and unused indexes

```sql
-- Indexes on a table
EXEC sp_helpindex 'dbo.Enrollments';

-- How often each index is used (since the last restart)
SELECT OBJECT_NAME(s.object_id) AS TableName, i.name AS IndexName,
       s.user_seeks, s.user_scans, s.user_lookups, s.user_updates
FROM sys.dm_db_index_usage_stats AS s
JOIN sys.indexes AS i ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE s.database_id = DB_ID();
```

SQL Server also suggests indexes in `sys.dm_db_missing_index_details`. Treat these as hints, not orders.

## Other performance tips

- Select only the columns you need (no `SELECT *` in apps).
- Use **parameters** in application queries so plans are reused (see *Using SQL Server from TypeScript*).
- Avoid row-by-row loops (cursors); write set-based SQL.
- Keep statistics fresh: `UPDATE STATISTICS dbo.Students;` (SQL Server does this automatically by default).

## Cleaning up

```sql
DROP INDEX IF EXISTS IX_Students_City ON dbo.Students;
DROP INDEX IF EXISTS IX_Enrollments_CourseId ON dbo.Enrollments;
DROP INDEX IF EXISTS IX_Students_LastName_FirstName ON dbo.Students;
DROP INDEX IF EXISTS UX_Students_Email_NotNull ON dbo.Students;
DROP INDEX IF EXISTS IX_Enrollments_Ungraded ON dbo.Enrollments;
```

## Key points

- Clustered = table order (usually the PK); nonclustered = extra lookup structures.
- Composite index column order matters; `INCLUDE` makes covering indexes.
- Read execution plans: seeks are good, scans on big tables are suspicious.
- Don't wrap indexed columns in functions in `WHERE`. Every index costs write speed.

## Practice

1. Create an index that helps `SELECT * FROM Enrollments WHERE StudentId = 3`.
2. Rewrite `WHERE MONTH(DateOfBirth) = 3 AND YEAR(DateOfBirth) = 2005` to be SARGable.
3. Turn on the actual execution plan and compare a query before and after adding an index.
