/** 内部自增计数器，用于快速生成可读 ID。 */
let counter = 0;

/**
 * 生成带前缀的唯一 ID。
 */
export const generateId = (prefix: string): string => {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
};

