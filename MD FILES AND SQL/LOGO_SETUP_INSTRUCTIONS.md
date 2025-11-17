# 🎨 Logo & Favicon Setup Instructions

## ✅ What's Already Done

I've already:
1. ✅ Created `src/assets/` folder for your logo
2. ✅ Created `public/` folder for favicons
3. ✅ Created `Logo.tsx` component (reusable logo)
4. ✅ Updated `index.html` with favicon links
5. ✅ Updated Navbar to use the logo
6. ✅ Updated SignIn page with logo
7. ✅ Updated SignUp page with logo

## 📋 What You Need to Do

### Step 1: Copy Your Logo File

```bash
# Copy your logo to the assets folder
# Replace "path/to/your/logo.png" with the actual path to your logo file

cp path/to/your/logo.png frontend/src/assets/logo.png
```

**Supported formats:** `.png`, `.svg`, `.jpg`, `.jpeg`

### Step 2: Copy Your Favicon Files

```bash
# Copy all favicon files from your favicons folder to the public folder
# Replace "path/to/your/favicons" with the actual path

cp path/to/your/favicons/* frontend/public/
```

**Required files in public folder:**
- `favicon.ico` - Main favicon
- `favicon-16x16.png` - 16x16 icon
- `favicon-32x32.png` - 32x32 icon
- `apple-touch-icon.png` - 180x180 Apple touch icon
- `android-chrome-192x192.png` - Android icon
- `android-chrome-512x512.png` - Android icon

### Step 3: Update Logo Component (Optional)

If you want to use your actual logo image instead of the icon-based logo, update `src/components/Logo.tsx`:

```typescript
import logo from '@/assets/logo.png';  // Add this import

// Replace the icon-based logo with your image
<img src={logo} alt="LearnSynth" className={`${classes.icon}`} />
```

## 🎯 Result

After completing these steps, your LearnSynth app will have:
- ✅ Your custom logo in the navbar
- ✅ Your custom logo on SignIn page
- ✅ Your custom logo on SignUp page
- ✅ Your favicon in the browser tab
- ✅ Your icons for bookmarks and app shortcuts

## 🚀 Start the App

```bash
# Start the backend (Terminal 1)
cd backend
npm run dev

# Start the frontend (Terminal 2)
cd frontend
npm run dev
```

Visit: http://localhost:5173

## 🎨 Customization

You can customize the logo appearance in `src/components/Logo.tsx`:
- Change colors
- Adjust sizes (sm, md, lg)
- Add animations
- Modify gradients
