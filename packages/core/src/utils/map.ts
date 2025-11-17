/**
 * 复制一个 Map 实例，保持引用不可变。
 */
export const cloneMap = <K, V>(map: Map<K, V>): Map<K, V> => new Map(map);

