# Avatar Creation Guide

This guide will help you create avatar assets from a single image.

## Overview

You need to split your avatar image into layers:
1. **Base head** (without mouth)
2. **9 mouth shapes** (for phonemes A-H, X)
3. **2 eye states** (open and closed)

## Tools You'll Need

Choose one:
- **Photoshop** (Professional, paid)
- **GIMP** (Free, cross-platform)
- **Krita** (Free, artist-friendly)
- **Photopea** (Free, browser-based - [photopea.com](https://photopea.com))

## Step-by-Step Process

### Step 1: Prepare Your Base Image

1. Open your avatar image
2. If it has a background, remove it:
   - Use magic wand or lasso tool
   - Delete background
   - Save as PNG with transparency
3. Recommended size: 512x512px or 1024x1024px

### Step 2: Create the Head Layer

1. **Duplicate your image layer**
2. **Select the mouth area**
   - Use lasso or selection tool
   - Draw around the entire mouth region
   - Include area from nose to chin
3. **Delete the mouth area**
   - Press Delete to make it transparent
4. **Save as:** `head.png`

### Step 3: Create Mouth Shapes

For each mouth shape, you'll create a separate image:

#### Mouth A - Wide Open (ah, I)
- Jaw dropped
- Mouth wide open
- Teeth visible
- Use for vowels "ah", "eye"
- **Save as:** `mouth-A.png`

#### Mouth B - Lips Together (m, b, p)
- Lips pressed together
- No teeth visible
- Neutral or slight smile shape
- Use for "m", "b", "p" sounds
- **Save as:** `mouth-B.png`

#### Mouth C - Slightly Open (eh)
- Small opening
- Relaxed jaw
- Use for "e" sounds
- **Save as:** `mouth-C.png`

#### Mouth D - Teeth Visible (t, d, s)
- Tongue at teeth
- Slight opening
- Teeth showing
- Use for "t", "d", "s", "z"
- **Save as:** `mouth-D.png`

#### Mouth E - Rounded (oh)
- Lips rounded/pursed
- Moderate opening
- Use for "oh", "oo" sounds
- **Save as:** `mouth-E.png`

#### Mouth F - Lower Lip Under Teeth (f, v)
- Lower lip touches upper teeth
- Distinctive F/V shape
- **Save as:** `mouth-F.png`

#### Mouth G - Throat/Back (k, g)
- Similar to slightly open
- Can be same as mouth C
- Use for "k", "g" sounds
- **Save as:** `mouth-G.png`

#### Mouth H - Aspirated (h)
- Gentle opening
- Relaxed
- Use for "h" sounds
- **Save as:** `mouth-H.png`

#### Mouth X - Rest/Closed
- Neutral closed mouth
- Relaxed expression
- Use for silence/pauses
- **Save as:** `mouth-X.png`

### Step 4: Create Eye Layers

#### Eyes Open
1. Duplicate original image
2. Delete everything except eyes
3. Keep eyeballs, eyelids, lashes
4. **Save as:** `eyes-open.png`

#### Eyes Closed
1. Draw closed eyelids over eyes
2. Or use selection + transform to close eyes
3. Should look natural when blinking
4. **Save as:** `eyes-closed.png`

### Step 5: Verify Your Assets

Create this folder structure:

```
public/
└── avatars/
    └── default/
        ├── head.png
        ├── eyes-open.png
        ├── eyes-closed.png
        ├── mouth-A.png
        ├── mouth-B.png
        ├── mouth-C.png
        ├── mouth-D.png
        ├── mouth-E.png
        ├── mouth-F.png
        ├── mouth-G.png
        ├── mouth-H.png
        └── mouth-X.png
```

## Tips for Better Results

### Alignment
- All images must be the same size
- Layers should align perfectly when overlaid
- Use guides/grids to ensure consistency

### Transparency
- All PNGs must have transparent backgrounds
- Only the specific part (mouth, eyes, etc.) should be visible
- Check edges for any white/background remnants

### Consistency
- Maintain the same lighting across all layers
- Keep the same style and detail level
- Ensure shadows and highlights match

### Quality
- Save at high resolution (at least 512px)
- Use PNG format (never JPG)
- Don't over-compress - quality matters

## Quick Method: AI-Generated Variations

If you have an AI image generator (Midjourney, DALL-E, Stable Diffusion):

### 1. Generate Base Image
```
Prompt: "Professional avatar portrait, neutral expression,
transparent background, front-facing, digital art style"
```

### 2. Generate Each Mouth Shape
```
Prompts for each phoneme:
- "Same character, mouth wide open saying 'ah'"
- "Same character, lips pressed together saying 'mmm'"
- "Same character, mouth slightly open"
- etc.
```

### 3. Extract and Combine
- Use the base as your head layer
- Extract each mouth from the variations
- Ensure consistent positioning

## Alternative: 3D Avatar Tools

For more advanced avatars:

1. **Ready Player Me** - Web-based 3D avatar creator
2. **VRoid Studio** - Free 3D character creator
3. **Blender** - Full 3D modeling (advanced)

Export as 2D renders from different angles.

## Testing Your Avatar

1. Place all files in `public/avatars/default/`
2. Run the dev server: `pnpm dev`
3. Connect to a LiveKit room
4. Speak into your microphone
5. Watch the mouth shapes change

If something looks wrong:
- Check browser console for missing files
- Verify all images are the same size
- Ensure transparency is correct
- Test each mouth shape individually

## Example Workflow (GIMP)

1. **Open image** → File → Open
2. **Remove background** → Select → By Color → Delete
3. **Duplicate layer** → Layer → Duplicate
4. **Select mouth** → Free Select tool (F)
5. **Delete selection** → Edit → Cut
6. **Export** → File → Export As → PNG
7. **Repeat for each mouth shape**

## Advanced: Adding Eyebrows

For emotion expressions, add eyebrow layers:

```
eyebrows/
├── neutral.png
├── happy.png    (slightly raised)
├── sad.png      (slightly lowered)
├── angry.png    (furrowed)
└── surprised.png (very raised)
```

Update the code to load and render eyebrows based on emotion.

## Resources

- [Rhubarb Lip Sync Reference](https://github.com/DanielSWolf/rhubarb-lip-sync) - Official phoneme shapes
- [Preston Blair Animation](http://www.johnkstuff.blogspot.com/2009/10/preston-blair-mouth-charts.html) - Classic mouth chart
- [Photopea](https://photopea.com) - Free online photo editor

## Need Help?

If you're stuck:
1. Start simple - just 3 mouth shapes (open, closed, smile)
2. Test with those before creating all 9
3. Use reference images from animation
4. Don't worry about perfection - iteration is key

Your first avatar won't be perfect, and that's okay. You can always refine the mouth shapes after testing how they look during speech.
