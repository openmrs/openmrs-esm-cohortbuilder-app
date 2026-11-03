const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const identifierCharacters = /^[\p{L}\p{N}._/-]+$/u;
const prefixedIdentifier = /^(?:mrn|patient|id)[._:/-]?\d/i;
const codedIdentifier = /^(?:[\p{L}]{1,3}\d{3,}|[\p{L}]{1,5}[._:/-]\d{3,})$/iu;

function normalizeIdentifierToken(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}._/-]+$/gu, '');
}

/**
 * True when the query is, or contains, something shaped like a patient identifier: a UUID, an
 * all-digit query, six or more digits anywhere, or a compact code such as 100GEJ or MRN-1234. A
 * concept code such as cd4 or hba1c, a year or a short number in a sentence doesn't count.
 *
 * The host computes this once per query and passes it to every provider as `hints`, so "ID-shaped
 * text gets only the patient" holds across apps. A provider whose meta sets `skipIdentifierQueries`
 * isn't mounted for such a query at all.
 */
export function looksLikeIdentifier(query: string): boolean {
  const withoutQuestionMark = query.replace(/\?+$/, '').trim();
  if (uuidPattern.test(withoutQuestionMark) || /^\p{N}+$/u.test(withoutQuestionMark)) {
    return true;
  }

  const tokens = withoutQuestionMark.split(/\s+/).map(normalizeIdentifierToken).filter(Boolean);
  return tokens.some(
    (token) =>
      /\p{N}/u.test(token) &&
      identifierCharacters.test(token) &&
      (/^\p{N}{6,}$/u.test(token) ||
        (/^\p{N}/u.test(token) && /\p{L}/u.test(token)) ||
        prefixedIdentifier.test(token) ||
        codedIdentifier.test(token)),
  );
}

const QUESTION_WORDS = new Set([
  'what',
  'when',
  'which',
  'who',
  'how',
  'why',
  'is',
  'are',
  'does',
  'did',
  'has',
  'was',
  'were',
  'any',
  'list',
  'show',
  'latest',
  'last',
]);

/**
 * True when the query reads like a question for a model rather than a lookup: four characters or
 * more, not ID-shaped, and ending in a question mark, using a question word such as "what" or
 * "latest", or `minWords` words long (at least 2, 3 by default).
 *
 * The host computes this once per query, with its own `minWords`, and passes it to views as
 * `hints.looksLikeQuestion`. A view on a host that doesn't pass it calls this with the default.
 */
export function looksLikeQuestion(query: string, minWords = 3): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 4 || looksLikeIdentifier(trimmed)) {
    return false;
  }

  if (trimmed.endsWith('?')) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  const lexicalWords = trimmed.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  return lexicalWords.some((word) => QUESTION_WORDS.has(word)) || words.length >= Math.max(2, minWords);
}
