# 🎓 ACS Higher Secondary School Website

A modern, responsive school website built with **Vite + React** featuring a complete admin panel and student portal.

## ✨ Features

- **6 Core Pages**: Home, About, Faculty, Facilities, Contact, Login
- **Student Portal**: View grades, attendance, and class schedule
- **Admin Dashboard**: Manage school information and content
- **Fully Responsive**: Optimized for mobile, tablet, and desktop
- **Modern Design**: Premium UI with smooth animations
- **Fast Performance**: Built with Vite for blazing-fast load times

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

The site will open automatically at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 📱 Demo Credentials

### Student Portal
- **Student ID**: `STU001`
- **Password**: `demo123`

### Admin Dashboard
- **Username**: `admin`
- **Password**: `admin123`

## 🌐 Free Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Deploy! (takes ~2 minutes)

**Free tier includes:**
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Custom domain support

### Option 2: Netlify

1. Build your project: `npm run build`
2. Visit [netlify.com](https://netlify.com)
3. Drag and drop the `dist` folder
4. Done!

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
"scripts": {
  "deploy": "gh-pages -d dist"
}
```

3. Update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
})
```

4. Deploy:
```bash
npm run build
npm run deploy
```

## 📂 Project Structure

```
acs_website/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Responsive navigation
│   │   └── Footer.jsx          # Footer component
│   ├── pages/
│   │   ├── Home.jsx            # Landing page
│   │   ├── About.jsx           # About page
│   │   ├── Faculty.jsx         # Faculty directory
│   │   ├── Facilities.jsx      # Facilities gallery
│   │   ├── Contact.jsx         # Contact form
│   │   ├── Login.jsx           # Login page
│   │   ├── StudentPortal.jsx   # Student dashboard
│   │   └── AdminPanel.jsx      # Admin dashboard
│   ├── data/
│   │   └── schoolData.js       # Centralized data
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
├── index.css                   # Design system & styles
├── index.html                  # HTML template
├── package.json                # Dependencies
└── vite.config.js             # Vite configuration
```

## 🎨 Customization

### Update School Information

Edit `src/data/schoolData.js` to customize:
- School name and contact details
- Faculty members
- Facilities
- Mission and vision
- Statistics

### Change Colors

Edit CSS variables in `index.css`:
```css
:root {
  --color-primary: #1e3a8a;
  --color-secondary: #0ea5e9;
  /* ... more colors */
}
```

### Add More Pages

1. Create new page component in `src/pages/`
2. Import in `App.jsx`
3. Add route in `renderPage()` function
4. Add link in `Navbar.jsx`

## 🔧 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 4
- **Styling**: Vanilla CSS with CSS Variables
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Inter)

## 📸 Screenshots

The website includes:
- Hero section with call-to-action
- Statistics showcase
- Feature highlights
- Faculty profiles with filtering
- Image gallery with lightbox
- Contact form with validation
- Interactive student portal
- Admin content management

## 🤝 Support

For questions or issues:
- Email: Infoacspainsra@gmail.com
- Phone: 0300 1333275

## 📄 License

This project is for educational purposes.

---

**Built with ❤️ for ACS Higher Secondary School**
