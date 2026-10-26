/**
 * The small markdown subset used by guide articles:
 * paragraphs, "## " headings, "- " bullets, "1. " numbered steps and **bold**.
 * Anything else is shown as plain text, so content can never inject markup.
 */

export type Inline = { text: string; bold: boolean };

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'bullets'; items: Inline[][] }
  | { type: 'steps'; items: Inline[][] };

export function parseInline(text: string): Inline[] {
  const parts = text.split('**');
  // An odd count of "**" leaves an unmatched marker: keep it as literal text.
  if (parts.length % 2 === 0) return [{ text, bold: false }];
  return parts.map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter((p) => p.text.length > 0);
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  const pushItem = (type: 'bullets' | 'steps', text: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.type === type) last.items.push(parseInline(text));
    else blocks.push({ type, items: [parseInline(text)] });
  };

  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const step = /^\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', text: heading[1] });
    } else if (bullet) {
      flush();
      pushItem('bullets', bullet[1]);
    } else if (step) {
      flush();
      pushItem('steps', step[1]);
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
