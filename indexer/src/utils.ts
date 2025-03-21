function bigIntReplacer(_key: any, value: { toString: () => string } | bigint) {
  return typeof value === "bigint" ? value.toString() : value;
}

export const stringify = (obj: any): string => {
  return JSON.stringify(obj, bigIntReplacer);
};
