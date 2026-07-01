/**
 * Lightweight RFC4122 v4-ish UUID generator for the LLM package.
 *
 * Produces a stable unique identifier shape that satisfies `ChatResponse.id`
 * without pulling in a heavyweight dependency.
 */

const HEX = '0123456789abcdef';
const pick = (): string => {
  const c = HEX[Math.floor(Math.random() * 16)];
  return c ?? '0';
};

const hex4 = (): string => pick() + pick() + pick() + pick();
const hex8 = (): string => hex4() + hex4();
const hex12 = (): string => hex4() + hex4() + hex4();

export const v4 = (): string => {
  const timeLow = hex8();
  const timeMid = hex4();
  const timeHiAndVersion = '4' + hex4().slice(1);
  const clockSeq = (Math.floor(Math.random() * 4) + 8).toString(16) + hex4().slice(1);
  const node = hex12();
  return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeq}-${node}`;
};
