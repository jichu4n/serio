/** Returns the JSON representation of a value by invoking toJSON() if it exists. */
export function toJSON(value: any) {
  if (typeof value['toJSON'] === 'function') {
    return value.toJSON();
  }
  return value;
}
