import * as model from './model';
import { LispTokenCursor } from './token-cursor';

export type MissingTexts = {
  append: string;
  prepend: string;
};

export function getMissingBrackets(text: string): MissingTexts {
  const doc = new model.StringDocument(text);
  const cursor = doc.getTokenCursor(0);
  const stack: string[] = [];
  const missingOpens = [];
  do {
    const token = cursor.getToken();
    if (token.type === 'open') {
      stack.push(token.raw[token.raw.length - 1]);
    } else if (token.type === 'close') {
      if (stack.length === 0) {
        missingOpens.unshift({ ')': '(', ']': '[', '}': '{', '"': '"' }[token.raw]);
      } else {
        stack.pop();
      }
    }
    cursor.next();
  } while (!cursor.atEnd());
  if (stack.length === 0) {
    return { append: '', prepend: missingOpens.join('') };
  } else {
    stack.reverse();
    const missingCloses = stack.map((bracket) => {
      return { '{': '}', '[': ']', '(': ')', '"': '"' }[bracket];
    });
    return { prepend: missingOpens.join(''), append: missingCloses.join('') };
  }
}

export function isRightSexpStructural(cursor: LispTokenCursor): boolean {
  cursor.forwardWhitespace();
  if (cursor.getToken().type === 'comment') {
    return false;
  }
  cursor.forwardSexp(true, true, false);
  cursor.backwardSexp(false, false, false, false);

  const token = cursor.getToken();
  if (token.type === 'open') {
    return !!token.raw.match(/[([{]$/);
  }
  return false;
}

export function textForRightSexp(cursor: LispTokenCursor): string {
  const probe = cursor.clone();
  const start = cursor.offsetStart;
  probe.forwardSexp();
  const end = probe.offsetStart;
  const text = probe.doc.getText(start, end);
  return text;
}

/**
 * Returns the structure of the right _structural_ sexp from the cursor.
 * @param cursor
 * @returns
 * @description Extracts the structure of the right sexp from the cursor.
 * This function is used to extract the structure of the right sexp from the cursor.
 * It is used to extract the structure of the right sexp from the cursor.
 * It is used to extract the structure of the right sexp from the cursor.
 * It is used to extract the structure of the right sexp from the cursor.
 */

export function extractStructureRightStructuralSexp(
  cursor: LispTokenCursor
): any[] | Map<any, any> {
  const probe = cursor.clone();

  // We can assume the cursor is at the start some list thing
  probe.downList();
  const isMap = probe.getPrevToken().raw === '{';
  const structure = isMap ? new Map() : [];
  while (probe.forwardSexp()) {
    probe.backwardSexp();
    if (isMap) {
      const keyString = textForRightSexp(probe);
      const key = isRightSexpStructural(probe)
        ? extractStructureRightStructuralSexp(probe)
        : keyString;
      probe.forwardSexp();
      const valueString = textForRightSexp(probe);
      const value = isRightSexpStructural(probe)
        ? extractStructureRightStructuralSexp(probe)
        : valueString;
      (structure as Map<any, any>).set(
        { value: key, originalString: keyString },
        { value: value, originalString: valueString }
      );
    } else {
      const valueString = textForRightSexp(probe);
      const value = isRightSexpStructural(probe)
        ? extractStructureRightStructuralSexp(probe)
        : valueString;
      (structure as any[]).push({ value: value, originalString: valueString });
    }

    probe.forwardWhitespace();
    probe.forwardSexp();
  }
  return structure;
}

export function hasMoreThanSingleSexp(doc: model.EditableDocument): boolean {
  const cursor = doc.getTokenCursor(0);
  cursor.forwardWhitespace(true);
  cursor.forwardSexp(false, false, false);
  cursor.forwardWhitespace(false);
  return !cursor.atEnd();
}
