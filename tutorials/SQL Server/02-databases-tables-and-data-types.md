# Databases, Tables and Data Types

## Creating a database

```sql
CREATE DATABASE PracticeDB;
GO
USE PracticeDB;   -- switch to it; later statements run here
GO
```

## Creating a table

Every column has a **name**, a **data type** and usually a rule about empty values:

```sql
CREATE TABLE dbo.Products (
    ProductId   INT IDENTITY(1,1) PRIMARY KEY,   -- 1, 2, 3... assigned automatically
    Name        NVARCHAR(100)  NOT NULL,          -- text, required
    Price       DECIMAL(10,2)  NOT NULL,          -- exact money: up to 99,999,999.99
    InStock     BIT            NOT NULL DEFAULT 1,-- true/false, defaults to true
    AddedOn     DATETIME2(0)   NOT NULL DEFAULT SYSDATETIME(),
    Description NVARCHAR(MAX)  NULL               -- optional, any length
);
```

- `dbo` is the default **schema** (a folder for tables). `dbo.Products` is the full name.
- `IDENTITY(1,1)` numbers rows automatically, starting at 1, going up by 1.
- `PRIMARY KEY` uniquely identifies each row (more in *Constraints and Keys*).
- `NULL` means "no value / unknown". `NOT NULL` makes the column required.

## Data types you'll use most

### Numbers

| Type | Holds | Use for |
|---|---|---|
| `INT` | whole numbers ±2.1 billion | IDs, counts |
| `BIGINT` | whole numbers ±9.2 quintillion | very large counts |
| `SMALLINT` / `TINYINT` | ±32,767 / 0–255 | small ranges (age, rating) |
| `DECIMAL(p,s)` | exact decimals: `p` digits total, `s` after the point | **money**, marks |
| `FLOAT` / `REAL` | approximate decimals | science measurements |
| `BIT` | 0, 1 or NULL | yes/no flags |

> Never store money in `FLOAT`: `0.1 + 0.2` isn't exactly `0.3` in floating point. Use `DECIMAL`.

### Text

| Type | Holds |
|---|---|
| `NVARCHAR(n)` | Unicode text up to `n` characters (Tamil, Hindi, emoji ✅) |
| `NVARCHAR(MAX)` | Unicode text up to 2 GB |
| `VARCHAR(n)` | Text in the database's code page (mostly English) |
| `NCHAR(n)` / `CHAR(n)` | Fixed length, padded with spaces (codes like `'IN'`) |

Unicode string literals start with **`N`**: `N'வணக்கம்'`. Without the `N`, non-English characters can turn into `?`.

### Dates and times

| Type | Example | Notes |
|---|---|---|
| `DATE` | `2026-10-14` | date only |
| `TIME(0)` | `14:30:00` | time only |
| `DATETIME2(0)` | `2026-10-14 14:30:00` | **preferred** date + time |
| `DATETIMEOFFSET` | `2026-10-14 14:30:00 +05:30` | includes the time-zone offset |
| `DATETIME` | older type | less precise; avoid in new tables |

Write dates as `'YYYY-MM-DD'` (for example `'2026-10-14'`). That format is understood the same way on every server.

### Other useful types

| Type | Use |
|---|---|
| `UNIQUEIDENTIFIER` | GUIDs, e.g. `NEWID()` |
| `VARBINARY(MAX)` | files, images (usually better stored outside the DB) |
| `NVARCHAR(MAX)` + JSON functions | JSON documents |

## Changing a table

```sql
ALTER TABLE dbo.Products ADD Category NVARCHAR(50) NULL;          -- add a column
ALTER TABLE dbo.Products ALTER COLUMN Name NVARCHAR(150) NOT NULL; -- change a column
ALTER TABLE dbo.Products DROP COLUMN Category;                     -- remove a column
EXEC sp_rename 'dbo.Products.Description', 'Details', 'COLUMN';   -- rename a column
```

## Looking at a table's structure

```sql
EXEC sp_help 'dbo.Products';

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Products';
```

## Deleting

```sql
DROP TABLE IF EXISTS dbo.Products;   -- the table and all its data, permanently
GO
USE master;
GO
DROP DATABASE IF EXISTS PracticeDB;  -- the whole database
```

> `DROP` can't be undone (unless you have a backup). Double-check which database you're in: `SELECT DB_NAME();`.

## Naming conventions

- Tables: plural nouns in PascalCase (`Students`, `CourseEnrollments`).
- Columns: PascalCase (`FirstName`, `CreatedOn`); IDs as `TableNameId` (`StudentId`).
- Avoid spaces and reserved words (`Order`, `User`). If you must, wrap them in brackets: `[Order]`.

## Key points

- `CREATE TABLE` defines columns with types and `NULL`/`NOT NULL`.
- Use `INT IDENTITY` for IDs, `NVARCHAR` for text, `DECIMAL` for money, `DATE`/`DATETIME2` for dates.
- Prefix Unicode text with `N'...'`; write dates as `'YYYY-MM-DD'`.
- `ALTER TABLE` changes structure; `DROP` deletes permanently.

## Practice

1. Create a `Books` table: `BookId`, `Title` (required), `Author`, `Price`, `PublishedOn` (date), `Pages`.
2. Add an `Isbn CHAR(13)` column with `ALTER TABLE`.
3. Look at its structure with `sp_help`, then drop it.
