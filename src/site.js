import site from './site.json' with { type: 'json' };

export default site;
export const { company, legal, products } = site;
export const musicBrand = products.find(product => product.theme === 'echo');
export const requiredFields = {
  'company.legalName': company.legalName,
  'company.legalForm': company.legalForm,
  'company.street': company.street,
  'company.postalCode': company.postalCode,
  'company.city': company.city,
  'company.email': company.email,
  'legal.hostingRetention': legal.hostingRetention,
  'legal.emailProvider': legal.emailProvider,
  'legal.emailInternationalTransfers': legal.emailInternationalTransfers,
  'legal.cloudflareTransferSafeguards': legal.cloudflareTransferSafeguards,
  'legal.cloudflareCookies': legal.cloudflareCookies,
};
export const pendingFields = Object.entries(requiredFields)
  .filter(([, value]) => !value?.trim()).map(([key]) => key);
export const isDraft = legal.reviewed !== true || pendingFields.length > 0;
export const routes = ['/', '/company/', '/kontakt/', '/impressum/', '/datenschutz/', '/cookies/', ...['en', 'de', 'es'].flatMap(locale => [`/${locale}`, ...['investors', 'privacy', 'imprint', 'cookies'].map(page => `/${locale}/${page}`)])];
