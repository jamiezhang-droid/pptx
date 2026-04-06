---
name: pptx
description: Create and edit PowerPoint presentations (.pptx files) using pptxgenjs. Use when the user wants to generate slides, add content to presentations, or build PowerPoint files programmatically.
---

# PPTX Skill

Create and edit PowerPoint (.pptx) files using the `pptxgenjs` library.

## Workflow

Make a todo list for all tasks in this workflow and work through them one at a time.

### 1. Setup

Check if `pptxgenjs` is installed:

```bash
ls node_modules/pptxgenjs 2>/dev/null || npm install pptxgenjs
```

If there is no `package.json`, initialize first:

```bash
npm init -y && npm install pptxgenjs
```

### 2. Understand the Request

Before writing code:
- Clarify the number of slides and their purpose
- Identify content: text, images, charts, tables, shapes
- Note any branding: colors, fonts, logo
- Determine output filename

### 3. Write the Script

Create a Node.js script (e.g., `create-presentation.js`) using pptxgenjs.

Refer to `pptxgenjs.md` for the API reference and common patterns.
Refer to `editing.md` if the user wants to modify an existing .pptx file.

### 4. Run and Verify

```bash
node create-presentation.js
```

Confirm the `.pptx` file was created and report the output path to the user.

### 5. Iterate if Needed

If the user wants adjustments, modify the script and re-run.

## Key Principles

- Always use `await pptx.writeFile({ fileName: 'output.pptx' })` to save
- Use hex color strings (e.g., `'FF0000'` not `'#FF0000'`)
- Positions and sizes use inches by default
- Slides are 10" × 7.5" by default (widescreen: 13.33" × 7.5")
- Keep scripts simple and readable — one function per slide type if complex
