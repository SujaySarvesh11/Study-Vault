# Step 4: Add Your Notes and Courses

Your StudyVault is empty. Here's how to fill it.

## Upload files

1. Click **⇪ Upload** at the top.
2. Type a **section** name. A section is like a course or a chapter, for example `Biology` or `Semester 2 Maths`.
3. Drag your files in, or click to choose them.
4. Each file becomes a page in that section, listed in the left sidebar.

**Files you can upload:** Word (`.docx`), Excel (`.xlsx`, `.xls`), PowerPoint (`.pptx`), PDF, CSV, web pages, text, EPUB e-books, plus images, video and audio.

> **Scanned PDFs** (photos of paper pages) contain no real text, so StudyVault can attach them but can't read them. Add your own notes to those pages.

## Write a new page

1. Click **＋ New page**.
2. Give it a title and a section.
3. Write in the editor. A live preview shows how it will look.
4. Press **Ctrl + S** to save.

The editor uses **Markdown**, a simple way to format text:

| Type this | To get |
|---|---|
| `## My heading` | A heading |
| `**important**` | **Bold** text |
| `- item` | A bullet point |
| `1. step` | A numbered list |

Click **Insert file** in the editor to add a picture or video at the cursor.

## Edit, move or share a page

Open a page and click **✎ Edit**. You can rename it, move it to another section, or tick **Share with viewers** so invited viewers can read it.

## Add the built-in courses

StudyVault comes with ready-made courses: **TypeScript**, **SQL Server** and this **StudyVault Guide**. To add them to your site, open Command Prompt and run:

```cmd
cd /d C:\StudyVault
npm run import-tutorials
```

| Command | What it does |
|---|---|
| `npm run import-tutorials` | Adds the courses as private pages (only you see them) |
| `npm run manage import-tutorials --shared` | Adds them as shared pages (viewers see them too) |

Running it again updates the pages instead of making copies. StudyVault can keep running while you do this. Refresh the browser to see the new pages.

## Invite viewers

1. Click **⚙ Settings**.
2. Under viewers, enter a username and password for your friend, then click **Add viewer**.
3. Give them the website address, username and password.

Viewers can only see pages marked **Share with viewers**. To remove one, click **Remove** next to their name.

## Key points

- **⇪ Upload** turns files into pages; **＋ New page** lets you write your own.
- **✎ Edit → Share with viewers** decides who can see a page.
- `npm run import-tutorials` adds the built-in courses.
- Add viewers in **⚙ Settings**.
