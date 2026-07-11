export interface SentenceTarget {
  index: number;
  text: string;
  range: Range;
}

interface CharPoint {
  node: Text;
  offset: number;
}

function shouldInsertSeparator(currentText: string, nextText: string): boolean {
  if (!currentText || !nextText) return false;
  const prevChar = currentText[currentText.length - 1];
  const nextChar = nextText[0];
  return !/\s/.test(prevChar) && !/\s/.test(nextChar);
}

export function buildSentenceTargets(root: HTMLElement): SentenceTarget[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let combined = '';
  const map: Array<CharPoint | null> = [];
  let currentNode: Text | null;

  while ((currentNode = walker.nextNode() as Text | null)) {
    const text = currentNode.textContent || '';
    if (!text) continue;

    if (shouldInsertSeparator(combined, text)) {
      combined += ' ';
      map.push(null);
    }

    for (let i = 0; i < text.length; i += 1) {
      combined += text[i];
      map.push({ node: currentNode, offset: i });
    }
  }

  const targets: SentenceTarget[] = [];
  const separatorRegex = /(?<=[.!?])\s+/g;
  let chunkStart = 0;
  let match: RegExpExecArray | null;

  function pushRange(rawStart: number, rawEnd: number) {
    let start = rawStart;
    let end = rawEnd;

    while (start < end && /\s/.test(combined[start])) start += 1;
    while (end > start && /\s/.test(combined[end - 1])) end -= 1;

    const text = combined.slice(start, end).trim();
    if (text.length < 20) return;

    let startPoint: CharPoint | null = null;
    let endPoint: CharPoint | null = null;

    for (let i = start; i < end; i += 1) {
      if (map[i]) {
        startPoint = map[i];
        break;
      }
    }

    for (let i = end - 1; i >= start; i -= 1) {
      if (map[i]) {
        endPoint = map[i];
        break;
      }
    }

    if (!startPoint || !endPoint) return;

    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset + 1);

    targets.push({
      index: targets.length,
      text,
      range,
    });
  }

  while ((match = separatorRegex.exec(combined))) {
    pushRange(chunkStart, match.index);
    chunkStart = match.index + match[0].length;
  }

  pushRange(chunkStart, combined.length);

  return targets;
}
