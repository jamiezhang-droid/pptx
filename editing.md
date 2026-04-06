# Editing Existing PPTX Files

To read and modify existing `.pptx` files in Node.js, use the `pptx-parser` or `officegen` libraries. However, the most reliable approach for editing existing presentations is to use **python-pptx** (Python) or to **re-generate** the file with pptxgenjs.

## Option A: Re-generate with pptxgenjs (Recommended)

If you have the source data, re-create the presentation from scratch using pptxgenjs. This is the most predictable approach.

See `pptxgenjs.md` for the full API.

## Option B: Edit with python-pptx (Python)

`python-pptx` provides robust read/write support for existing `.pptx` files.

### Installation

```bash
pip install python-pptx
```

### Read an Existing Presentation

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation('existing.pptx')

# Inspect slides
for i, slide in enumerate(prs.slides):
    print(f'Slide {i+1}: {len(slide.shapes)} shapes')
    for shape in slide.shapes:
        if shape.has_text_frame:
            print(f'  Text: {shape.text_frame.text}')
```

### Modify Text in Existing Slides

```python
from pptx import Presentation

prs = Presentation('existing.pptx')

for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    if 'old text' in run.text:
                        run.text = run.text.replace('old text', 'new text')

prs.save('modified.pptx')
```

### Add a Slide to an Existing Presentation

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation('existing.pptx')

# Use a blank layout (index varies by template)
blank_layout = prs.slide_layouts[6]  # 6 = blank
slide = prs.slides.add_slide(blank_layout)

# Add a text box
txBox = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(8), Inches(2))
tf = txBox.text_frame
tf.text = 'New slide content'

prs.save('updated.pptx')
```

### Change Images

```python
from pptx import Presentation
from pptx.util import Inches
from pptx.enum.shapes import MSO_SHAPE_TYPE

prs = Presentation('existing.pptx')

for slide in prs.slides:
    for shape in slide.shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            # Replace image in-place (keep position/size)
            sp = shape._element
            # Note: direct image replacement requires xml manipulation;
            # easier to delete and re-add at same position
            left, top, width, height = shape.left, shape.top, shape.width, shape.height
            sp.getparent().remove(sp)
            slide.shapes.add_picture('new_image.png', left, top, width, height)
            break

prs.save('updated.pptx')
```

### Slide Layout Reference (python-pptx)

```python
# List available layouts
prs = Presentation('file.pptx')
for i, layout in enumerate(prs.slide_layouts):
    print(i, layout.name)

# Common indices for default Office theme:
# 0 = Title Slide
# 1 = Title and Content
# 2 = Section Header
# 5 = Title Only
# 6 = Blank
```

### Color and Font Utilities

```python
from pptx.util import Pt, Inches, Emu
from pptx.dml.color import RGBColor

# Font styling
run.font.size = Pt(24)
run.font.bold = True
run.font.italic = False
run.font.color.rgb = RGBColor(0x00, 0x33, 0x66)

# Positioning
shape.left   = Inches(1)
shape.top    = Inches(2)
shape.width  = Inches(6)
shape.height = Inches(1.5)
```

## Option C: Use a Conversion Pipeline

Convert `.pptx` → edit as text/images → convert back:

```bash
# Install LibreOffice for conversions
libreoffice --headless --convert-to pdf existing.pptx
```

This is useful for inspecting content but not for programmatic editing.

## Choosing an Approach

| Scenario | Recommended Tool |
|---|---|
| Create new presentation | pptxgenjs (Node.js) |
| Modify text/content in existing file | python-pptx |
| Add/remove slides | python-pptx |
| Template-based generation | python-pptx |
| Browser-based generation | pptxgenjs |
