import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOutline, renderOutlineForPrompt, validateOutline } from './outline-parser.js';

describe('parseOutline', () => {
  it('returns [] for empty string', () => {
    assert.deepEqual(parseOutline(''), []);
  });

  it('returns [] for whitespace-only input', () => {
    assert.deepEqual(parseOutline('   \n\t\n'), []);
  });

  it('parses [h2] tag as h2', () => {
    assert.deepEqual(parseOutline('[h2] Main heading'), [
      { level: 'h2', text: 'Main heading' },
    ]);
  });

  it('parses [h3] tag as h3', () => {
    assert.deepEqual(parseOutline('[h3] Sub heading'), [
      { level: 'h3', text: 'Sub heading' },
    ]);
  });

  it('normalizes uppercase tags', () => {
    assert.deepEqual(parseOutline('[H2] Main\n[H3] Sub'), [
      { level: 'h2', text: 'Main' },
      { level: 'h3', text: 'Sub' },
    ]);
  });

  it('trims whitespace inside tag text', () => {
    const result = parseOutline('[h2]   Trim me   ');
    assert.equal(result[0].text, 'Trim me');
  });

  it('supports legacy [h2]...[/h2] format', () => {
    assert.deepEqual(parseOutline('[h2] Legacy heading [/h2]'), [
      { level: 'h2', text: 'Legacy heading' },
    ]);
  });

  it('supports legacy [h3]...[/h3] format', () => {
    assert.deepEqual(parseOutline('[h3] Legacy sub heading [/h3]'), [
      { level: 'h3', text: 'Legacy sub heading' },
    ]);
  });

  it('ignores empty legacy tag content', () => {
    assert.deepEqual(parseOutline('[h2]   [/h2]'), []);
  });

  it('treats plain lines as h2 by default', () => {
    assert.deepEqual(parseOutline('Plain heading line'), [
      { level: 'h2', text: 'Plain heading line' },
    ]);
  });

  it('treats lines indented with spaces as h3', () => {
    assert.deepEqual(parseOutline('Top level\n  Indented sub heading'), [
      { level: 'h2', text: 'Top level' },
      { level: 'h3', text: 'Indented sub heading' },
    ]);
  });

  it('treats lines indented with tabs as h3', () => {
    assert.deepEqual(parseOutline('Top level\n\tTabbed sub heading'), [
      { level: 'h2', text: 'Top level' },
      { level: 'h3', text: 'Tabbed sub heading' },
    ]);
  });

  it('strips dash prefix from plain lines', () => {
    const result = parseOutline('- Bullet heading');
    assert.equal(result[0].text, 'Bullet heading');
  });

  it('strips asterisk prefix from plain lines', () => {
    const result = parseOutline('* Bullet heading');
    assert.equal(result[0].text, 'Bullet heading');
  });

  it('strips bullet dot prefix from plain lines', () => {
    const result = parseOutline('• Bullet heading');
    assert.equal(result[0].text, 'Bullet heading');
  });

  it('filters blank lines between headings', () => {
    assert.deepEqual(parseOutline('[h2] First\n\n\n[h2] Second'), [
      { level: 'h2', text: 'First' },
      { level: 'h2', text: 'Second' },
    ]);
  });

  it('parses mixed tag and plain text outlines', () => {
    const raw = '[h2] Intro\n[h3] Detail\nPlain heading\n  Sub point';
    assert.deepEqual(parseOutline(raw), [
      { level: 'h2', text: 'Intro' },
      { level: 'h3', text: 'Detail' },
      { level: 'h2', text: 'Plain heading' },
      { level: 'h3', text: 'Sub point' },
    ]);
  });
});

describe('validateOutline', () => {
  it('returns error when headings < 2', () => {
    const error = validateOutline([{ level: 'h2', text: 'Only one' }]);
    assert.ok(error);
    assert.match(error, /2/);
  });

  it('returns null when headings count is valid', () => {
    assert.equal(validateOutline([
      { level: 'h2', text: 'First' },
      { level: 'h3', text: 'Second' },
    ]), null);
  });

  it('returns error when headings > 30', () => {
    const headings = Array.from({ length: 31 }, (_, index) => ({
      level: 'h2' as const,
      text: `Heading ${index + 1}`,
    }));
    const error = validateOutline(headings);
    assert.ok(error);
    assert.match(error, /30/);
  });
});

describe('renderOutlineForPrompt', () => {
  it('returns empty string for empty input', () => {
    assert.equal(renderOutlineForPrompt([]), '');
  });

  it('renders h2 without indent', () => {
    assert.equal(renderOutlineForPrompt([{ level: 'h2', text: 'Main heading' }]), '[H2] Main heading');
  });

  it('renders h3 with two-space indent', () => {
    assert.equal(renderOutlineForPrompt([{ level: 'h3', text: 'Sub heading' }]), '  [H3] Sub heading');
  });

  it('renders mixed outline correctly', () => {
    assert.equal(
      renderOutlineForPrompt([
        { level: 'h2', text: 'Main' },
        { level: 'h3', text: 'Sub' },
        { level: 'h2', text: 'Another' },
      ]),
      '[H2] Main\n  [H3] Sub\n[H2] Another',
    );
  });

  it('round-trips parse -> render for mixed input', () => {
    const raw = '[h2] Main\n[h3] Detail\n\tTabbed child';
    const rendered = renderOutlineForPrompt(parseOutline(raw));
    assert.equal(rendered, '[H2] Main\n  [H3] Detail\n  [H3] Tabbed child');
  });
});
