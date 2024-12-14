/** Returns the JSON representation of a value by invoking toJSON() if it exists. */
export function toJSON(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value === 'object' &&
    'toJSON' in value &&
    typeof value['toJSON'] === 'function'
  ) {
    return value.toJSON();
  }
  return value;
}

/** Returns whether it is possible to invoke assignJSON. */
export function canAssignJSON(
  currentValue: unknown
): currentValue is {assignJSON: (jsonValue: unknown) => void} {
  // If currentValue is null or undefined, we can't call assignJSON() on it.
  if (currentValue === null || currentValue === undefined) {
    return false;
  }
  return (
    typeof currentValue === 'object' &&
    'assignJSON' in currentValue &&
    typeof currentValue.assignJSON === 'function'
  );
}
