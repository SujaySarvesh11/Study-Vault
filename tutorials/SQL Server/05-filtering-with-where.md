# Filtering with WHERE

`WHERE` keeps only the rows where a condition is true.

```sql
USE SchoolDB;

SELECT FirstName, City
FROM dbo.Students
WHERE City = N'Chennai';
```

## Comparison operators

| Operator | Meaning |
|---|---|
| `=` | equal |
| `<>` or `!=` | not equal |
| `>`, `>=`, `<`, `<=` | greater / less than |

```sql
SELECT StudentId, CourseId, Marks FROM dbo.Enrollments WHERE Marks >= 85;
SELECT FirstName, DateOfBirth FROM dbo.Students WHERE DateOfBirth < '2004-01-01';
```

## AND, OR, NOT

```sql
SELECT FirstName, City, EnrolledOn
FROM dbo.Students
WHERE City = N'Chennai' AND EnrolledOn >= '2024-01-01';

SELECT FirstName, City
FROM dbo.Students
WHERE City = N'Chennai' OR City = N'Bengaluru';
```

`AND` is evaluated before `OR`. **Use brackets** to make your meaning clear:

```sql
-- Students from Chennai or Kochi who enrolled in 2023 or later
SELECT FirstName, City, EnrolledOn
FROM dbo.Students
WHERE (City = N'Chennai' OR City = N'Kochi')
  AND EnrolledOn >= '2023-01-01';
```

## IN

A shorter way to write many `OR`s:

```sql
SELECT FirstName, City FROM dbo.Students WHERE City IN (N'Chennai', N'Bengaluru', N'Kochi');
SELECT FirstName, City FROM dbo.Students WHERE City NOT IN (N'Chennai', N'Delhi');
```

## BETWEEN

Inclusive at both ends:

```sql
SELECT StudentId, Marks FROM dbo.Enrollments WHERE Marks BETWEEN 60 AND 80;   -- 60 and 80 included
```

For date-times, prefer `>= start AND < next day` so you don't miss times late in the last day:

```sql
SELECT * FROM dbo.Enrollments
WHERE EnrolledOn >= '2026-01-01' AND EnrolledOn < '2027-01-01';   -- all of 2026
```

## LIKE: pattern matching

| Wildcard | Matches |
|---|---|
| `%` | any number of characters (including none) |
| `_` | exactly one character |
| `[abc]` | one of a, b, c |
| `[^abc]` | one character that is not a, b or c |

```sql
SELECT FirstName FROM dbo.Students WHERE FirstName LIKE N'A%';       -- starts with A
SELECT Email FROM dbo.Students WHERE Email LIKE N'%@mail.com';       -- ends with @mail.com
SELECT Code FROM dbo.Courses WHERE Code LIKE 'CS2__';                -- CS2 + two characters
SELECT FirstName FROM dbo.Students WHERE FirstName LIKE N'[AEIOU]%'; -- starts with a vowel
```

Text comparisons are usually **case-insensitive** in SQL Server (it depends on the database's *collation*), so `'asha' = 'Asha'` is true by default.

## NULL: the special "unknown" value

`NULL` is not zero and not an empty string; it means "no value / unknown". **Nothing equals NULL, not even NULL**, so `= NULL` never matches:

```sql
SELECT FirstName FROM dbo.Students WHERE Email = NULL;   -- ❌ returns nothing, always
SELECT FirstName FROM dbo.Students WHERE Email IS NULL;  -- ✅ Arun
SELECT StudentId, CourseId FROM dbo.Enrollments WHERE Marks IS NOT NULL;
```

NULL also affects `NOT IN` and `<>`: rows where the column is NULL are **not** returned by `WHERE Marks <> 50`. To include them:

```sql
SELECT StudentId, CourseId, Marks
FROM dbo.Enrollments
WHERE Marks <> 50 OR Marks IS NULL;
```

## Replacing NULL in output

```sql
SELECT FirstName,
       ISNULL(Email, N'(no email)') AS Email,
       COALESCE(Email, N'missing') AS Email2    -- COALESCE takes many values: first non-NULL wins
FROM dbo.Students;
```

## EXISTS (preview)

Students who have at least one enrollment:

```sql
SELECT s.FirstName
FROM dbo.Students AS s
WHERE EXISTS (SELECT 1 FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId);
```

More on this in *Subqueries and CTEs*.

## Key points

- `WHERE` filters rows; combine conditions with `AND`/`OR` and **brackets**.
- `IN`, `BETWEEN` (inclusive) and `LIKE` (`%`, `_`) shorten common filters.
- Use `IS NULL` / `IS NOT NULL`, never `= NULL`.
- `ISNULL`/`COALESCE` replace NULLs in results.

## Practice

1. Students born in 2005, sorted by birthday.
2. Enrollments that are not graded yet.
3. Courses whose title contains the word "with".
4. Students whose last name has exactly 4 letters (`LIKE '____'`).
5. Teachers in Computer Science earning more than 65,000.
