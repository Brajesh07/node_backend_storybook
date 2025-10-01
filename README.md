# Storybook Backend API

A Node.js/Express backend API for generating personalized children's storybooks with AI-generated stories and character images.

## 🚀 Features

- **AI Story Generation**: Uses Google Gemini AI to create personalized adventure stories
- **Character Image Generation**: Transforms uploaded photos into caricature characters using Replicate API
- **Multi-Chapter Support**: Generates chapter-specific character variations
- **PDF Generation**: Creates beautiful PDF storybooks using Puppeteer
- **Cloud Storage**: Multiple fallback providers for image hosting
- **Multi-Language Support**: Stories in English, Spanish, Hindi, French, German, Chinese

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - [Replicate API Token](https://replicate.com)
  - [Google Gemini API Key](https://ai.google.dev)
  - [Cloudinary URL](https://cloudinary.com) (optional)

## 🛠 Installation

1. **Clone and Setup**

   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your API keys:

   ```env
   REPLICATE_API_TOKEN=your_replicate_api_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   CLOUDINARY_URL=your_cloudinary_url_here
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 🔧 API Endpoints

### Story Generation

- `POST /api/story/generate` - Generate personalized story
- `GET /api/session/:sessionId` - Get session data

### Image Processing

- `POST /api/upload` - Upload character photo
- `POST /api/character/generate` - Generate character images
- `GET /api/image/:filename` - Serve generated images

### PDF Generation

- `POST /api/pdf/generate` - Generate PDF storybook
- `GET /api/pdf/download/:sessionId` - Download PDF

### Utilities

- `GET /api/health` - Health check
- `GET /` - API info

## 📖 API Usage

### 1. Generate Story

```javascript
const response = await fetch("/api/story/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    childName: "Emma",
    age: 6,
    gender: "girl",
    language: "English",
    parentName: "Mom",
  }),
});

const { data } = await response.json();
console.log(data.sessionId); // Save for next steps
```

### 2. Upload Photo

```javascript
const formData = new FormData();
formData.append("photo", file);
formData.append("sessionId", sessionId);

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});
```

### 3. Generate Character Images

```javascript
const response = await fetch("/api/character/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: sessionId,
    generateMultiple: true, // false for single image
  }),
});
```

### 4. Generate PDF

```javascript
const response = await fetch("/api/pdf/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: sessionId,
    multiChapter: true,
  }),
});

const { data } = await response.json();
console.log(data.downloadUrl); // Use to download PDF
```

## 🏗 Architecture

```
backend/
├── src/
│   ├── config/           # Configuration and environment setup
│   ├── services/         # Business logic services
│   │   ├── storyGenerator.ts    # AI story generation
│   │   ├── storyAnalysis.ts     # Story analysis and prompts
│   │   ├── imageProcessing.ts   # Image generation with Replicate
│   │   ├── fileUtils.ts         # File upload and cloud storage
│   │   └── pdfGenerator.ts      # PDF creation with Puppeteer
│   ├── routes/           # API route handlers
│   ├── middleware/       # Custom middleware
│   └── server.ts         # Express server setup
├── temp/                 # Temporary file storage
└── dist/                 # Compiled JavaScript (after build)
```

## 🔐 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin policies
- **Rate Limiting**: API request throttling
- **File Validation**: Size and type restrictions
- **Input Validation**: Joi schema validation

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t storybook-backend .

# Run container
docker run -p 3001:3001 --env-file .env storybook-backend
```

### Vercel

```bash
npm install -g vercel
vercel --prod
```

### Traditional Hosting

```bash
npm run build
npm start
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test with coverage
npm run test:coverage

# Health check
curl http://localhost:3001/api/health
```

## 📝 Environment Variables

| Variable              | Required | Description                          |
| --------------------- | -------- | ------------------------------------ |
| `REPLICATE_API_TOKEN` | Yes      | Replicate API authentication         |
| `GEMINI_API_KEY`      | Yes      | Google Gemini AI API key             |
| `CLOUDINARY_URL`      | No       | Cloudinary cloud storage             |
| `PORT`                | No       | Server port (default: 3001)          |
| `NODE_ENV`            | No       | Environment (development/production) |
| `CORS_ORIGIN`         | No       | Frontend URL for CORS                |
| `SESSION_SECRET`      | No       | Session encryption key               |
| `REDIS_URL`           | No       | Redis connection string              |

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**

   ```bash
   # Check environment variables are set
   echo $REPLICATE_API_TOKEN
   echo $GEMINI_API_KEY
   ```

2. **File Upload Issues**

   ```bash
   # Ensure temp directory exists and is writable
   mkdir -p temp
   chmod 755 temp
   ```

3. **Memory Issues with PDF Generation**

   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

4. **Port Already in Use**
   ```bash
   # Change port in .env file
   PORT=3002
   ```

## 📊 Monitoring

The API includes built-in logging and health monitoring:

- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Memory usage monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue for bugs or feature requests
- Check existing issues for solutions
- Review API documentation for usage examples
