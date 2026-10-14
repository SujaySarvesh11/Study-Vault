# Security and Permissions

## Logins vs users

SQL Server has two levels:

| Level | Object | Grants access to |
|---|---|---|
| Server | **Login** | connecting to the SQL Server instance |
| Database | **User** | a specific database, mapped to a login |

Logins can use:
- **Windows authentication**: your Windows account, no separate password (recommended on Windows networks).
- **SQL Server authentication**: a username and password stored in SQL Server (needs "mixed mode" enabled). Apps in Docker or on Linux often use this.

## Creating a login and user

```sql
-- Server level (run in master)
USE master;
CREATE LOGIN report_reader WITH PASSWORD = N'Use-A-Long-Unique-Passphrase-2026!', CHECK_POLICY = ON;
GO

-- Database level
USE SchoolDB;
CREATE USER report_reader FOR LOGIN report_reader;
GO
```

## Granting permissions

Give the **least** access needed:

```sql
GRANT SELECT ON dbo.vTeacherDirectory TO report_reader;     -- one view
GRANT SELECT ON SCHEMA::dbo TO report_reader;               -- every table/view in dbo
GRANT EXECUTE ON dbo.GetStudentReport TO report_reader;     -- one procedure

DENY SELECT ON dbo.Teachers TO report_reader;               -- DENY beats any GRANT
REVOKE SELECT ON SCHEMA::dbo FROM report_reader;            -- remove a GRANT or DENY
```

Check what a user can do:

```sql
EXECUTE AS USER = 'report_reader';
SELECT * FROM fn_my_permissions('dbo.Students', 'OBJECT');
SELECT TOP (1) * FROM dbo.Students;   -- ❌ denied: the REVOKE above removed the schema-wide SELECT
REVERT;                               -- back to yourself
```

## Roles

Assign permissions to **roles**, then add users to roles:

```sql
CREATE ROLE teachers_role;
GRANT SELECT ON dbo.Students TO teachers_role;
GRANT SELECT, UPDATE ON dbo.Enrollments TO teachers_role;
ALTER ROLE teachers_role ADD MEMBER report_reader;
```

Built-in database roles:

| Role | Can |
|---|---|
| `db_datareader` | read all tables |
| `db_datawriter` | insert/update/delete in all tables |
| `db_ddladmin` | create/alter tables etc. |
| `db_owner` | everything in the database |

```sql
ALTER ROLE db_datareader ADD MEMBER report_reader;
```

> Your **application** should connect as a user with only the permissions it needs (often just `EXECUTE` on procedures, or read/write on its tables), never as `sa` or `db_owner`.

## SQL injection: the most important rule

Never build SQL by gluing user input into a string:

```sql
-- ❌ DANGEROUS dynamic SQL
DECLARE @city NVARCHAR(100) = N'Chennai''; DROP TABLE dbo.Students; --';
DECLARE @sql NVARCHAR(MAX) = N'SELECT * FROM dbo.Students WHERE City = ''' + @city + N'''';
-- EXEC (@sql);   -- would run: ... WHERE City = 'Chennai'; DROP TABLE dbo.Students; --'
```

Use **parameters**, so input is always treated as data, never as code:

```sql
-- ✅ Parameterised dynamic SQL
DECLARE @city2 NVARCHAR(100) = N'Chennai''; DROP TABLE dbo.Students; --';
EXEC sp_executesql
     N'SELECT StudentId, FirstName FROM dbo.Students WHERE City = @City',
     N'@City NVARCHAR(100)',
     @City = @city2;          -- simply finds no student from that "city"
```

The same applies in application code. See *Using SQL Server from TypeScript*: always use `.input()` parameters.

If you must insert a table or column **name** dynamically, check it against a list of allowed names and wrap it with `QUOTENAME()`.

## Protecting data

- **Encryption in transit**: connect with `encrypt: true` (TLS).
- **Transparent Data Encryption (TDE)**: encrypts database files on disk.
- **Always Encrypted**: encrypts sensitive columns so even DBAs can't read them.
- **Dynamic Data Masking**: shows masked values (`XXXX`) to unprivileged users:

```sql
ALTER TABLE dbo.Students ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');
GO
-- Users without UNMASK permission now see aXXX@XXXX.com
SELECT name, masking_function FROM sys.masked_columns;
GO
ALTER TABLE dbo.Students ALTER COLUMN Email DROP MASKED;   -- in its own batch: SQL Server checks it before the batch runs
GO
```

- **Row-Level Security**: filter rows per user (e.g. teachers see only their courses).

## Cleaning up

```sql
USE SchoolDB;
ALTER ROLE teachers_role DROP MEMBER report_reader;
ALTER ROLE db_datareader DROP MEMBER report_reader;
DROP ROLE IF EXISTS teachers_role;
DROP USER IF EXISTS report_reader;
USE master;
DROP LOGIN report_reader;
```

## Key points

- Logins connect to the server; users access a database.
- Grant the least privilege; use roles; `DENY` overrides `GRANT`.
- **Always parameterise** SQL. Never concatenate user input.
- Encrypt connections; consider masking and row-level security for sensitive data.

## Practice

1. Create a login and user `student_app` that can only `EXECUTE dbo.EnrollStudent` and `SELECT` from `vStudentResults`.
2. Use `EXECUTE AS USER` to prove it can't read `dbo.Teachers`.
3. Rewrite a concatenated query of your own with `sp_executesql` parameters.
