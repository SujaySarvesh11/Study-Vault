# Built-in Functions

T-SQL has hundreds of functions. These are the ones you'll use every week. (Database: **SchoolDB**.)

## Text functions

```sql
USE SchoolDB;

SELECT FirstName,
       UPPER(FirstName)                     AS Upper,
       LOWER(LastName)                      AS Lower,
       LEN(FirstName)                       AS Letters,
       LEFT(LastName, 3)                    AS First3,
       RIGHT(Email, 8)                      AS Last8,
       SUBSTRING(LastName, 2, 3)            AS Middle,        -- start at 2nd char, take 3
       CHARINDEX(N'@', Email)               AS AtPosition,     -- 0 if not found
       REPLACE(Email, N'@mail.com', N'@school.edu') AS NewEmail,
       CONCAT(FirstName, N' ', LastName)    AS FullName,       -- NULLs become ''
       CONCAT_WS(N', ', LastName, FirstName, City) AS Listing  -- with a separator
FROM dbo.Students;
```

More:

```sql
SELECT TRIM(N'   spaces   ')           AS Trimmed,
       LTRIM(N'   left')               AS NoLeft,
       REVERSE(N'SQL')                 AS Reversed,
       REPLICATE(N'*', 5)              AS Stars,
       FORMAT(1234567.891, N'N2')      AS WithCommas;   -- "1,234,567.89"
```

`STRING_AGG` joins values from many rows into one string:

```sql
SELECT City, STRING_AGG(FirstName, N', ') WITHIN GROUP (ORDER BY FirstName) AS Students
FROM dbo.Students
GROUP BY City;
```

And `STRING_SPLIT` does the opposite:

```sql
SELECT value FROM STRING_SPLIT(N'maths,physics,chemistry', N',');
```

> `+` with a NULL gives NULL: `N'Hi ' + NULL` is NULL. `CONCAT` treats NULL as empty text.

## Number functions

```sql
SELECT ROUND(87.456, 1)   AS Rounded,    -- 87.500
       CEILING(87.1)      AS Up,         -- 88
       FLOOR(87.9)        AS Down,       -- 87
       ABS(-12)           AS Absolute,   -- 12
       POWER(2, 10)       AS TwoToTen,   -- 1024
       SQRT(144)          AS Root,       -- 12
       17 % 5             AS Remainder,  -- 2
       17 / 5             AS IntDivide,  -- 3 (both are integers!)
       17 / 5.0           AS RealDivide; -- 3.400000
```

> Integer ÷ integer drops the decimals. Multiply by `1.0` or use `CAST(x AS DECIMAL(10,2))` first.

## Date functions

```sql
SELECT GETDATE()                           AS NowDateTime,
       SYSDATETIME()                       AS NowPrecise,
       CAST(GETDATE() AS DATE)             AS Today,
       YEAR(GETDATE())                     AS ThisYear,
       MONTH(GETDATE())                    AS ThisMonth,
       DATENAME(WEEKDAY, GETDATE())        AS DayName,
       DATEADD(DAY, 30, GETDATE())         AS In30Days,
       DATEADD(MONTH, -1, GETDATE())       AS OneMonthAgo,
       EOMONTH(GETDATE())                  AS EndOfMonth,
       DATEFROMPARTS(2026, 12, 25)         AS Christmas,
       DATEDIFF(DAY, '2026-01-01', GETDATE()) AS DaysThisYear;
```

Exact age in years (`DATEDIFF(YEAR, ...)` alone counts year boundaries, so it is off by one before the birthday):

```sql
SELECT FirstName, DateOfBirth,
       DATEDIFF(YEAR, DateOfBirth, GETDATE())
         - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, DateOfBirth, GETDATE()), DateOfBirth) > GETDATE()
                THEN 1 ELSE 0 END AS Age
FROM dbo.Students;
```

Formatting dates for display:

```sql
SELECT FORMAT(GETDATE(), N'dd MMM yyyy')   AS Pretty,   -- 14 Oct 2026
       CONVERT(VARCHAR(10), GETDATE(), 103) AS Indian;  -- dd/mm/yyyy
```

`FORMAT` is flexible but slow on large result sets; format in your application when you can.

## Converting types

```sql
SELECT CAST('42' AS INT)                AS Number,
       CAST(92.5 AS INT)                AS Truncated,     -- 92
       CONVERT(DECIMAL(5,1), 87.456)    AS OneDecimal,    -- 87.5
       TRY_CAST('abc' AS INT)           AS Bad,           -- NULL instead of an error
       TRY_CONVERT(DATE, '2026-02-30')  AS BadDate;       -- NULL (no 30 February)
```

Use `TRY_CAST`/`TRY_CONVERT` when data may be messy.

## Conditional logic: CASE and IIF

```sql
SELECT StudentId, CourseId, Marks,
       CASE
         WHEN Marks IS NULL THEN N'Pending'
         WHEN Marks >= 90 THEN N'A'
         WHEN Marks >= 75 THEN N'B'
         WHEN Marks >= 60 THEN N'C'
         WHEN Marks >= 40 THEN N'D'
         ELSE N'F'
       END AS Grade,
       IIF(Marks >= 40, N'Pass', N'Fail') AS Result   -- shorthand for a 2-way CASE
FROM dbo.Enrollments;
```

`CASE` checks conditions top to bottom and stops at the first true one.

## NULL helpers

```sql
SELECT ISNULL(NULL, 0)                 AS IsNullResult,   -- 0
       COALESCE(NULL, NULL, N'third')  AS CoalesceResult, -- 'third'
       NULLIF(10, 10)                  AS NullIfResult;   -- NULL (handy to avoid divide-by-zero: x / NULLIF(y, 0))
```

## GREATEST and LEAST (SQL Server 2022+)

```sql
SELECT GREATEST(72, 95, 88) AS Highest, LEAST(72, 95, 88) AS Lowest;
```

## JSON functions

```sql
DECLARE @json NVARCHAR(MAX) = N'{"name":"Asha","marks":[92,88,79],"city":"Chennai"}';

SELECT JSON_VALUE(@json, '$.name')      AS Name,
       JSON_VALUE(@json, '$.marks[0]')  AS FirstMark,
       ISJSON(@json)                    AS IsValid;

SELECT StudentId, FirstName, City FROM dbo.Students
WHERE City = N'Chennai'
FOR JSON PATH;                          -- turn rows into JSON
```

## Key points

- Text: `LEN`, `LEFT`, `SUBSTRING`, `REPLACE`, `CONCAT`, `TRIM`, `STRING_AGG`.
- Dates: `GETDATE`, `DATEADD`, `DATEDIFF`, `EOMONTH`, `FORMAT`.
- Conversion: `CAST`, `CONVERT`, and the safe `TRY_CAST`/`TRY_CONVERT`.
- Logic: `CASE`, `IIF`, `COALESCE`, `NULLIF`.

## Practice

1. Show each student's initials (e.g. "A.K.") and email domain (text after `@`).
2. Show each enrollment with its grade letter and Pass/Fail/Pending.
3. List students whose birthday is in the current month.
4. Show the number of days since each student enrolled.
