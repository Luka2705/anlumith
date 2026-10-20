import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiryMailto } from '../src/investor/contact-schema.js';
import { en, de, es } from '../src/investor/translations.js';

test('deck email drafts preserve every field and safely encode special characters in each language', () => {
  for (const [locale, labels] of Object.entries({ en, de, es })) {
    const values = { name: 'Renée & Partner', email: 'renee+investor@example.org', organization: 'Music & Co',
      message: 'First line\nSecond line? &bcc=other@example.org #music', consent: 'on', locale };
    const url = new URL(buildInquiryMailto(values, { ...labels, subject: `echo music — ${labels.deck}` }));
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, 'info@anlumith.com');
    assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
    assert.equal(url.searchParams.get('subject'), `echo music — ${labels.deck}`);
    const body = url.searchParams.get('body');
    for (const key of ['name', 'email', 'organization']) assert.ok(body.includes(`${labels[key]}: ${values[key]}`));
    assert.ok(body.includes(`${labels.message}:\r\n${values.message}`));
    assert.ok(body.includes(labels.consent));
    assert.equal(url.hash, '');
  }
});
