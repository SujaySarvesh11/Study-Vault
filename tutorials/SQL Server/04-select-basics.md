# SELECT Basics

`SELECT` reads data. It never changes anything, so experiment freely. (All examples use **SchoolDB**: run `USE SchoolDB;` first.)

## All columns, all rows

```sql
SELECT * FROM dbo.Students;
```

`*` is handy for exploring, but in real code **list the columns you need**: it's faster and won't break when columns are added.

## Chosen columns

```sql
SELECT FirstName, LastName, City
FROM dbo.Students;
```

## Calculated columns and aliases

```sql
SELECT FirstName + N' ' + LastName AS FullName,
       City,
       DATEDIFF(YEAR, DateOfBirth, GETDATE()) AS ApproxAge
FROM dbo.Students;
```

`AS` gives a column a name (an **alias**). `DATEDIFF(YEAR, ...)` counts year boundaries, so it's approximate (the *Built-in Functions* lesson shows an exact age).

## Sorting with ORDER BY

```sql
SELECT FirstName, City, DateOfBirth
FROM dbo.Students
ORDER BY City ASC, DateOfBirth DESC;   -- by city A→Z, then youngest first within a city
```

Without `ORDER BY`, SQL Server returns rows in **no guaranteed order**, even if it looks sorted today.

You can sort by an alias or a column that isn't selected:

```sql
SELECT FirstName + N' ' + LastName AS FullName
FROM dbo.Students
ORDER BY FullName;
```

## Removing duplicates with DISTINCT

```sql
SELECT DISTINCT City FROM dbo.Students ORDER BY City;
```

## Limiting rows: TOP

```sql
SELECT TOP (3) StudentId, CourseId, Marks
FROM dbo.Enrollments
ORDER BY Marks DESC;               -- the 3 highest marks

SELECT TOP (3) WITH TIES StudentId, Marks
FROM dbo.Enrollments
ORDER BY Marks DESC;               -- includes rows tied with the 3rd

SELECT TOP (20) PERCENT * FROM dbo.Students ORDER BY StudentId;
```

## Paging: OFFSET / FETCH

Show results one page at a time (page size 4):

```sql
-- Page 1
SELECT StudentId, FirstName FROM dbo.Students
ORDER BY StudentId
OFFSET 0 ROWS FETCH NEXT 4 ROWS ONLY;

-- Page 2
SELECT StudentId, FirstName FROM dbo.Students
ORDER BY StudentId
OFFSET 4 ROWS FETCH NEXT 4 ROWS ONLY;
```

`OFFSET` requires `ORDER BY`.

## Literal values and expressions

```sql
SELECT N'SchoolDB' AS AppName, 10 * 1.18 AS PriceWithTax, GETDATE() AS Now;
```

`SELECT` without `FROM` is a quick calculator.

## The order SQL actually runs a query

You **write**: `SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY`

SQL Server **evaluates**: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → TOP/OFFSET`

That's why you can use a `SELECT` alias in `ORDER BY` but **not** in `WHERE`.

## Key points

- `SELECT columns FROM table` reads data; list the columns you need.
- `AS` names calculated columns.
- Only `ORDER BY` guarantees order. `TOP` and `OFFSET/FETCH` limit rows.
- `DISTINCT` removes duplicate rows.

## Practice

1. List all courses: code, title and credits, highest credits first, then by code.
2. Show each student's full name and email, sorted by last name.
3. Show the 5 most recent enrollments (by `EnrolledOn`), including ties.
4. Show students 6–10 ordered by `StudentId` using `OFFSET`.
