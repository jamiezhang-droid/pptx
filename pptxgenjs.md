# pptxgenjs API Reference

Library docs: https://gitbrent.github.io/PptxGenJS/

## Installation

```bash
npm install pptxgenjs
```

## Basic Structure

```js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

// Optional: set presentation properties
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5" (default is 10" x 7.5")
pptx.title = 'My Presentation';
pptx.author = 'Author Name';

// Add slides
const slide = pptx.addSlide();

// Save
await pptx.writeFile({ fileName: 'presentation.pptx' });
```

## Slide Layouts

```js
pptx.layout = 'LAYOUT_16x9';  // 10" x 5.625"
pptx.layout = 'LAYOUT_16x10'; // 10" x 6.25"
pptx.layout = 'LAYOUT_4x3';   // 10" x 7.5"
pptx.layout = 'LAYOUT_WIDE';  // 13.33" x 7.5"
```

## Adding Text

```js
slide.addText('Hello World', {
  x: 1, y: 1, w: 8, h: 1.5,
  fontSize: 36,
  bold: true,
  color: '363636',
  align: 'center',  // 'left' | 'center' | 'right'
  fontFace: 'Arial',
});

// Multi-run text (mixed formatting)
slide.addText([
  { text: 'Bold ', options: { bold: true } },
  { text: 'and italic', options: { italic: true } },
], { x: 1, y: 3, w: 8, h: 1 });
```

## Adding Images

```js
// From file path
slide.addImage({ path: './logo.png', x: 0.5, y: 0.5, w: 2, h: 1 });

// From URL
slide.addImage({ path: 'https://example.com/img.png', x: 1, y: 1, w: 4, h: 3 });

// From base64
slide.addImage({ data: 'image/png;base64,ABC123...', x: 1, y: 1, w: 4, h: 3 });
```

## Adding Shapes

```js
// Rectangle
slide.addShape(pptx.ShapeType.rect, {
  x: 1, y: 1, w: 4, h: 2,
  fill: { color: '0088CC' },
  line: { color: '004488', width: 2 },
});

// Common shape types
pptx.ShapeType.rect
pptx.ShapeType.roundRect
pptx.ShapeType.ellipse
pptx.ShapeType.triangle
pptx.ShapeType.line
pptx.ShapeType.rightArrow
```

## Adding Tables

```js
const rows = [
  [
    { text: 'Name', options: { bold: true, fill: { color: '003366' }, color: 'FFFFFF' } },
    { text: 'Value', options: { bold: true, fill: { color: '003366' }, color: 'FFFFFF' } },
  ],
  ['Alpha', '100'],
  ['Beta', '200'],
];

slide.addTable(rows, {
  x: 1, y: 2, w: 8,
  colW: [4, 4],
  border: { type: 'solid', color: 'CFCFCF' },
  fontSize: 14,
});
```

## Adding Charts

```js
// Bar chart
slide.addChart(pptx.ChartType.bar, [
  {
    name: 'Revenue',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    values: [100, 150, 130, 200],
  },
], {
  x: 1, y: 1, w: 8, h: 5,
  chartColors: ['0088CC'],
  showLegend: true,
  legendPos: 'b',
  title: 'Quarterly Revenue',
  showTitle: true,
});

// Chart types
pptx.ChartType.bar
pptx.ChartType.bar3d
pptx.ChartType.line
pptx.ChartType.pie
pptx.ChartType.doughnut
pptx.ChartType.area
pptx.ChartType.scatter
```

## Slide Backgrounds

```js
// Solid color
slide.background = { color: 'F0F0F0' };

// Image background
slide.background = { path: './bg.jpg' };
```

## Slide Master / Branding

```js
pptx.defineSlideMaster({
  title: 'MASTER_SLIDE',
  background: { color: 'FFFFFF' },
  objects: [
    { rect: { x: 0, y: 6.9, w: '100%', h: 0.6, fill: { color: '003366' } } },
    { text: { text: 'Company Name', options: { x: 0.5, y: 6.95, w: 5, h: 0.5, color: 'FFFFFF', fontSize: 12 } } },
  ],
});

// Use master when adding slides
const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
```

## Notes

```js
slide.addNotes('Speaker notes go here.');
```

## Common Color Reference (no # prefix)

```
'FFFFFF' // white
'000000' // black
'FF0000' // red
'003366' // dark blue
'0088CC' // medium blue
'F0F0F0' // light gray
'363636' // dark gray
```

## Save Options

```js
// Save to file (Node.js)
await pptx.writeFile({ fileName: 'output.pptx' });

// Get as buffer
const buffer = await pptx.write({ outputType: 'nodebuffer' });

// Get as base64 string
const b64 = await pptx.write({ outputType: 'base64' });
```
