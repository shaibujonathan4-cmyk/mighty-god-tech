require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 8159;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mighty2026";

// App Data Files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    headline: "MIGHTY GOD ALUMINIUM & GLASS TECH",
    tagline: "Precision Engineering in Aluminium Windows, Doors, & Glass Solutions",
    phone: "+2348000000000",
    address: "Lagos, Nigeria",
    rc: "RC-1234567"
  }));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Cloudinary Storage (Fallback to local if credentials missing during dev)
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'mighty_god_projects',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
  });
  upload = multer({ storage });
} else {
  const localDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  upload = multer({ storage: localStorage });
}

// Basic Password Middleware for Admin Protection
const checkAdminAuth = (req, res, next) => {
  const authHeader = req.headers['x-admin-auth'];
  if (authHeader === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized access" });
  }
};

// API ROUTES
app.get('/api/projects', (req, res) => {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE));
  res.json(projects);
});

app.post('/api/projects', upload.single('image'), (req, res) => {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE));
  const imageUrl = req.file.path || `/uploads/${req.file.filename}`;
  
  const newProject = {
    id: Date.now().toString(),
    title: req.body.title,
    category: req.body.category,
    description: req.body.description || '',
    url: imageUrl,
    createdAt: new Date()
  };

  projects.unshift(newProject);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
  let projects = JSON.parse(fs.readFileSync(PROJECTS_FILE));
  projects = projects.map(p => p.id === req.params.id ? { ...p, title: req.body.title } : p);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  res.json({ success: true });
});

app.delete('/api/projects/:id', (req, res) => {
  let projects = JSON.parse(fs.readFileSync(PROJECTS_FILE));
  projects = projects.filter(p => p.id !== req.params.id);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.get('/api/analytics', (req, res) => {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE));
  res.json({
    totalProjects: projects.length,
    totalVisits: 1420,
    inquiries: 38
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
