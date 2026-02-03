# 🏥 Mummy - WhatsApp Health Bot

> Your caring personal health assistant for families via WhatsApp

[![CI](https://github.com/YOUR-USERNAME/mummy/workflows/CI/badge.svg)](https://github.com/YOUR-USERNAME/mummy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

Mummy is an intelligent WhatsApp bot that helps you and your family track health records, analyze medical reports, monitor health trends, and manage medications - all through simple WhatsApp messages.

## ✨ Features

- 📊 **Intelligent Report Analysis** - Upload PDFs or photos of medical reports, get AI-powered analysis
- 💊 **Medication Tracking** - Track medications with dosage, frequency, and timing
- 📈 **Health Trends** - Visualize and track health metrics over time
- ❓ **Natural Language Queries** - Ask questions about your health history in plain English
- 👨‍👩‍👧‍👦 **Multi-User Support** - Separate, private data for each family member
- 🔐 **Secure** - Phone-based authentication, encrypted storage, HIPAA-ready architecture
- 🤖 **Powered by Claude AI** - Advanced understanding and analysis using Anthropic's Claude

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Twilio account with WhatsApp enabled
- Anthropic API key (for Claude)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/mummy.git
cd mummy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Configuration

Edit `.env` with your credentials:

```bash
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic Claude AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mummy

# Application
PORT=8000
NODE_ENV=development
DEFAULT_TIMEZONE=Asia/Kolkata
```

### Webhook Setup

1. Expose your local server (using ngrok):
   ```bash
   ngrok http 8000
   ```

2. Configure Twilio webhook:
   - Go to Twilio Console → Messaging → WhatsApp
   - Set webhook URL: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`
   - Method: `POST`

3. Test by sending a WhatsApp message!

## 📖 Usage

### Commands

| Command | Description |
|---------|-------------|
| `/menu` | Show all available commands |
| `/status` | View your health summary |
| `/trends` | See health trends (last 6 months) |
| `/records` | View recent health records |
| `/medications` | View active medications |

### Quick Actions

After viewing records, type a number (1-10) to see details:
```
/records → "1" → Full details of record #1
```

### Upload Health Reports

- **PDF**: Send PDF file directly
- **Image**: Take photo of report and send
- **Text**: Type vitals like `BP: 120/80, Weight: 70kg`

### Ask Questions

```
"What was my cholesterol last month?"
"Explain record #1"
"Show my blood pressure trend"
"When did I last check my blood sugar?"
```

## 🏗️ Architecture

```
┌─────────────┐
│  WhatsApp   │
│   (User)    │
└──────┬──────┘
       │
   ┌───▼────┐
   │ Twilio │ (WhatsApp API)
   └───┬────┘
       │
┌──────▼────────┐
│   Mummy Bot   │ (Node.js + TypeScript)
│  ┌─────────┐  │
│  │ Express │  │ (Web Server)
│  └────┬────┘  │
│  ┌────▼────┐  │
│  │ Handler │  │ (Message Router)
│  └────┬────┘  │
│  ┌────▼────┐  │
│  │Services │  │ (Claude, Twilio, DB)
│  └────┬────┘  │
└───────┼───────┘
        │
   ┌────▼─────┐
   │ MongoDB  │ (Data Storage)
   └──────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **AI**: Anthropic Claude (Haiku/Sonnet)
- **Database**: MongoDB + Mongoose
- **Messaging**: Twilio WhatsApp API
- **PDF Processing**: pdf-parse
- **Image Processing**: Sharp
- **Logging**: Winston

## 🔒 Security Features

- ✅ Input sanitization and validation
- ✅ Rate limiting (20 req/min per user)
- ✅ Twilio signature verification
- ✅ Security headers (XSS, clickjacking protection)
- ✅ Phone number validation
- ✅ Request size limits
- ✅ User data isolation
- ✅ Encrypted MongoDB connections

See [SECURITY.md](SECURITY.md) for more details.

## 📦 Deployment

### Docker

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or build manually
docker build -t mummy .
docker run -p 8000:8000 --env-file .env mummy
```

### Railway.com

1. Push to GitHub
2. Connect to Railway
3. Add MongoDB service
4. Set environment variables
5. Deploy!

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides for Railway, AWS, DigitalOcean, and more.

## 🧪 Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Format code
npm run format

# Run tests
npm test
```

## 📊 Project Structure

```
mummy/
├── src/
│   ├── config/           # Configuration management
│   ├── handlers/         # Message handlers
│   ├── models/           # Database models
│   ├── services/         # External services (Claude, Twilio)
│   ├── middleware/       # Express middleware (validation, security)
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # Application entry point
├── .github/              # GitHub workflows and templates
├── docs/                 # Additional documentation
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── package.json          # Dependencies and scripts
```

## 🤝 Contributing (don't open any PRs in this repo please)

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License (eh — its a vibe coded app)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

Mummy is a health tracking tool, not a medical device. Always consult healthcare professionals for medical advice, diagnosis, or treatment. The bot provides information based on your data but does not replace professional medical judgment.

## 🙏 Acknowledgments (wow, talk about self-glazing, jeez)

- [Anthropic](https://www.anthropic.com/) for Claude AI
- [Twilio](https://www.twilio.com/) for WhatsApp API
- [MongoDB](https://www.mongodb.com/) for database

## 📞 Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/YOUR-USERNAME/mummy/issues)
- 💬 [Discussions](https://github.com/YOUR-USERNAME/mummy/discussions)

## 🗺️ Roadmap (I won't implement these anytime soon, but feel free to do it yourself with claude code)

- [ ] Voice message support
- [ ] Medication reminder scheduling
- [ ] Export health reports as PDF
- [ ] Integration with wearables (Fitbit, Apple Health)
- [ ] Multi-language support
- [ ] Family-wide analytics dashboard
- [ ] Doctor report sharing

---

**I'm in my vibe coding era, bear with me, thanks claude**
