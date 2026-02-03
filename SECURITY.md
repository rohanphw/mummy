# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [your-email@example.com]

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

Please include:

- Type of issue (e.g. SQL injection, XSS, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

## Security Best Practices

When deploying Mummy:

1. **Never commit `.env` files** to version control
2. **Use environment variables** for all secrets
3. **Enable Twilio signature verification** in production
4. **Use HTTPS** for all webhook endpoints
5. **Regularly update dependencies**
6. **Monitor logs** for suspicious activity
7. **Implement rate limiting** (already included)
8. **Keep MongoDB access restricted**
9. **Use strong, unique API keys**
10. **Enable MongoDB authentication**

## Security Features

Mummy includes several security features:

- **Input sanitization** - Prevents injection attacks
- **Rate limiting** - Prevents abuse (20 req/min per user)
- **Twilio signature verification** - Ensures authentic requests
- **Security headers** - Prevents common web vulnerabilities
- **Phone number validation** - Prevents invalid inputs
- **Request size limits** - Prevents DoS attacks
- **Structured logging** - Helps identify security issues

## Health Data Privacy

Mummy handles sensitive health information. Ensure:

- **Encrypted connections** (HTTPS, MongoDB TLS)
- **Access controls** - Users can only see their own data
- **Data minimization** - Only collect necessary data
- **Regular backups** with encryption
- **Compliance** with relevant health data regulations
- **User consent** for data collection

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

Thank you for helping keep Mummy secure! 🔒
