import {Serializable} from './serializable';

/** Returns the JSON representation of a value by invoking toJSON() if it exists. */
export function toJSON(value: any) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value['toJSON'] === 'function') {
    return value.toJSON();
  }
  return value;
}

/** Returns whether we should invoke assignJSON or do a direct assignment. */
export function shouldAssignJSON(
  currentValue: unknown,
  jsonValue: unknown
): currentValue is {assignJSON: (jsonValue: any) => void} {
  // If currentValue is null or undefined, we should assign directly since we
  // obviously can't call assignJSON() on it.
  if (currentValue === null || currentValue === undefined) {
    return false;
  }

  // If jsonValue has same type as currentValue, we should assign directly.
  if (
    jsonValue !== null &&
    jsonValue !== undefined &&
    jsonValue.constructor === currentValue.constructor
  ) {
    return false;
  }

  // Otherwise, if currentValue supports assignJSON, we'll let it handle jsonValue.
  if (
    typeof currentValue === 'object' &&
    'assignJSON' in currentValue &&
    typeof currentValue.assignJSON === 'function'
  ) {
    return true;
  }

  return false;
}
