export function normalizePhoneNumber(phone: string): string {
  // Remove whatsapp: prefix
  phone = phone.replace('whatsapp:', '');
  // Remove spaces, dashes, parentheses
  phone = phone.replace(/[\s\-\(\)]/g, '');
  // Ensure + prefix
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }
  return phone;
}

export function sanitizeFilename(filename: string): string {
  // Remove any characters that aren't alphanumeric, dash, underscore, or dot
  filename = filename.replace(/[^\w\-\.]/g, '_');
  // Remove multiple consecutive underscores
  filename = filename.replace(/_+/g, '_');
  return filename;
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

export function parseDateTime(dateStr: string): Date | null {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function isHealthDataEntry(message: string): boolean {
  const healthKeywords = [
    'bp:',
    'blood pressure:',
    'weight:',
    'height:',
    'sugar:',
    'glucose:',
    'temperature:',
    'temp:',
    'pulse:',
    'heart rate:',
    'spo2:',
    'oxygen:',
  ];

  const lowerMessage = message.toLowerCase();
  return healthKeywords.some(keyword => lowerMessage.includes(keyword));
}
