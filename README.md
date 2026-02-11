# Opskrifter Database 🍳

En moderne opskrift database web-applikation bygget med Node.js, Express, MongoDB, og Tailwind CSS.

## Features

- ✅ CRUD operationer (Create, Read, Update, Delete) for opskrifter
- 🔍 Søgning i opskrifter efter navn og tags
- 🏷️ Tag-system for kategorisering
- 📸 Billed-upload for opskrifter
- ✔️ Interaktiv ingrediens-liste (klik for at stryge ud)
- 📱 Responsivt design (mobil og desktop)
- 🎨 Moderne UI med Tailwind CSS

## Tech Stack

- **Backend:** Node.js med Express
- **Database:** MongoDB med Mongoose ODM
- **View Engine:** EJS templating
- **Styling:** Tailwind CSS
- **File Upload:** Multer
- **Deployment:** Railway-klar

## Installation

### Forudsætninger

- Node.js (v16 eller nyere)
- MongoDB (lokal eller cloud-baseret)

### Setup

1. **Klon projektet**
   ```bash
   cd opskrifterProjekt
   ```

2. **Installer dependencies**
   ```bash
   npm install
   ```

3. **Opsæt miljøvariabler**
   
   Opret en `.env` fil baseret på `.env.example`:
   ```bash
   cp .env.example .env
   ```
   
   Rediger `.env` og tilføj din MongoDB URI:
   ```
   MONGODB_URI=mongodb://localhost:27017/opskrifter
   PORT=3000
   NODE_ENV=development
   ```

4. **Build Tailwind CSS**
   ```bash
   npm run build:css
   ```

5. **Start udviklingsserver**
   ```bash
   npm run dev
   ```

   Applikationen kører nu på `http://localhost:3000`

## Scripts

- `npm start` - Start produktionsserver
- `npm run dev` - Start udviklingsserver med nodemon
- `npm run build:css` - Build Tailwind CSS
- `npm run watch:css` - Watch mode for Tailwind CSS udvikling
- `npm test` - Kør tests

## Projekt Struktur

```
opskrifterProjekt/
├── models/          # MongoDB modeller
│   └── Recipe.js
├── routes/          # Express routes
│   └── recipes.js
├── views/           # EJS templates
│   ├── index.ejs
│   ├── show.ejs
│   ├── new.ejs
│   ├── edit.ejs
│   ├── tags.ejs
│   └── 404.ejs
├── public/          # Statiske filer
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── uploads/         # Upload mappe for billeder
├── server.js        # Server entry point
├── package.json
├── tailwind.config.js
└── .env.example
```

## Database Model

### Recipe Schema

```javascript
{
  titel: String (required, max 100 chars)
  ingredienser: [String] (required, max 50 chars per item)
  fremgangsmåde: [String] (required)
  tags: [String] (optional, max 20 chars per tag)
  billede: String (optional, filename)
  how_many_servings: Number (default: 4)
  til_servering: [String] (optional)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

## API Endpoints

| Method | Route | Beskrivelse |
|--------|-------|-------------|
| GET | `/` | Liste over alle opskrifter |
| GET | `/ny` | Form til ny opskrift |
| POST | `/recipes` | Opret ny opskrift |
| GET | `/recipe/:id` | Vis specifik opskrift |
| GET | `/recipe/:id/edit` | Form til redigering |
| PUT | `/recipe/:id` | Opdater opskrift |
| DELETE | `/recipe/:id` | Slet opskrift |
| GET | `/tags` | Vis alle tags |
| GET | `/tag/:tagName` | Filtrer opskrifter efter tag |

## Deployment til Railway

1. **Opret Railway projekt**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Tilføj MongoDB plugin**
   - Gå til Railway dashboard
   - Tilføj MongoDB plugin

3. **Opsæt miljøvariabler**
   - `MONGODB_URI` - Auto-genereret af Railway MongoDB plugin
   - `NODE_ENV=production`

4. **Deploy**
   ```bash
   railway up
   ```

## Features i Detaljer

### Ingrediens Checkbox
Klik på en ingrediens for at stryge den ud. Perfekt til at holde styr på hvad du har tilført under madlavning.

### Søgning
Søg efter opskrifter ved navn eller tags direkte fra forsiden.

### Tags
Organiser dine opskrifter med tags som "pasta", "soup", "vegan", "dessert" osv.

### Billed-håndtering
- Upload billeder op til 5MB
- Accepterede formater: JPG, PNG, GIF, WEBP
- Automatisk sletning af billede når opskrift slettes

## Validering

Applikationen validerer:
- Titel må ikke overstige 100 tegn
- Hver ingrediens må ikke overstige 50 tegn
- Hver tag må ikke overstige 20 tegn
- Antal portioner skal være mindst 1
- Påkrævede felter: titel, ingredienser, fremgangsmåde

## Licens

ISC

## Author

Sebastian Drumm
