export function validateInquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid inquiry');
  const string = (key, max, required = false) => {
    if (input[key] === undefined && !required) return '';
    if (typeof input[key] !== 'string') throw new Error('Invalid field');
    const value = input[key].trim();
    if ((required && !value) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error('Invalid field');
    return value;
  };
  const name = string('name', 120, true), email = string('email', 254, true);
  if (/[\r\n]/.test(name + email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !['en', 'de', 'es'].includes(input.locale) || !['on', true].includes(input.consent)) throw new Error('Invalid inquiry');
  return { name, email, organization: string('organization', 160), message: string('message', 3000), locale: input.locale, consent: true };
}
