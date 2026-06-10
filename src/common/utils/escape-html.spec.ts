import { escapeHtml } from './escape-html.js';

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert('x') & "y"</script>`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;) &amp; &quot;y&quot;&lt;/script&gt;',
    );
  });

  it('neutralises an attribute-breakout payload', () => {
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  it('returns an empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('John Doe 123')).toBe('John Doe 123');
  });
});
