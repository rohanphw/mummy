# Quick Start Guide

Get Mummy running in 5 minutes!

## 1. Install Dependencies

```bash
cd mummy
npm install
```

## 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- Twilio credentials from https://console.twilio.com
- Claude API key from https://console.anthropic.com
- MongoDB URI (local or Atlas)

## 3. Run the Bot

```bash
npm run dev
```

Visit http://localhost:8000 - you should see "Mummy - WhatsApp Health Bot is running!"

## 4. Expose to Internet

```bash
ngrok http 8000
```

Copy the HTTPS URL

## 5. Configure Twilio

1. Go to Twilio Console > Messaging > WhatsApp
2. Join sandbox with your phone
3. Set webhook: `https://YOUR-NGROK-URL/webhook/whatsapp`
4. Save

## 6. Test!

Send a message to Twilio sandbox number. Mummy responds!

## Common Issues

**MongoDB error**: Ensure MongoDB is running or Atlas URI is correct
**Module errors**: Run `npm install` again
**Port in use**: Change `PORT` in `.env`

Happy health tracking! 🏥
