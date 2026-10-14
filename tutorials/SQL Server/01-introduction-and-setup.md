# Introduction and Setup

**SQL Server** is Microsoft's relational database. A *relational database* stores data in **tables** (rows and columns) that are linked to each other. You talk to it with **SQL** (Structured Query Language). SQL Server's version of SQL is called **T-SQL** (Transact-SQL), which adds variables, loops, error handling and more.

## What is a database, really?

Think of an Excel workbook:

| Excel | Database |
|---|---|
| Workbook | Database |
| Sheet | Table |
| Column header | Column (with a fixed data type) |
| Row | Row (record) |

But unlike a spreadsheet, a database:

- enforces rules (an email must be unique, marks must be 0–100),
- links tables safely (an enrollment must point to a real student),
- lets many users read and write at once without corrupting data,
- answers questions over millions of rows in milliseconds.

## Editions

| Edition | Cost | Use |
|---|---|---|
| **Developer** | Free | Learning and development; all features; not for production |
| **Express** | Free | Small production apps; limited database size and memory |
| Standard / Enterprise | Paid | Production |

This PC already runs **SQL Server 2025 Developer Edition** (version 17) as the default instance, `MSSQLSERVER`.

## Installing (on another PC)

1. Download **SQL Server Developer** from Microsoft's SQL Server downloads page and choose *Basic* install.
2. Install a tool to write queries:
   - **SQL Server Management Studio (SSMS)**, the full Windows tool, or
   - **VS Code** with the **SQL Server (mssql)** extension.
3. `sqlcmd`, a command-line tool, is installed with SQL Server.

With Docker on any OS:

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Your_strong_Pass123" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2025-latest
```

## Connecting

**In SSMS:** Server name `localhost` (or `.`), Authentication *Windows Authentication*, tick *Trust server certificate*, then **Connect**.

**With sqlcmd** (from PowerShell or Command Prompt):

```bash
sqlcmd -S localhost -E -C
```

- `-S localhost`: the server
- `-E`: sign in with your Windows account
- `-C`: trust the server's self-signed certificate (fine on your own PC)

Type a query, then `GO` on its own line to run it; `exit` to quit.

## Your first queries

```sql
SELECT @@VERSION;                       -- which SQL Server is this?
SELECT name, create_date FROM sys.databases;  -- list databases
SELECT 2 + 3 AS Answer, GETDATE() AS RightNow;
```

- `--` starts a comment.
- SQL keywords aren't case-sensitive: `select` = `SELECT`. Writing keywords in CAPITALS is a common style.
- End statements with `;` (good habit; some statements require it).

## How these lessons work

The next two lessons explain tables and data types, then create a sample database, **SchoolDB**, with students, teachers, courses and enrollments. Every later lesson uses it, so you can run each example yourself.

## The `GO` keyword

`GO` isn't SQL. It tells SSMS/sqlcmd "send everything above as one batch". Some statements (like `CREATE VIEW` or `CREATE PROCEDURE`) must be first in their batch, so you'll see `GO` before them.

## Key points

- SQL Server stores data in tables; you query it with T-SQL.
- Developer edition is free for learning.
- Connect with SSMS, VS Code or `sqlcmd -S localhost -E -C`.
- `GO` separates batches in tools; it's not part of SQL.

## Practice

1. Connect with `sqlcmd` and run `SELECT @@VERSION;`.
2. Run `SELECT DB_NAME();` to see which database you're in.
3. Run `SELECT SYSDATETIME(), SUSER_NAME();`. What do they show?
