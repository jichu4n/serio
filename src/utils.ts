import {DeserializeOptions, Serializable, SerializeOptions} from '.';

/** Serialize a list of Serializables in consecutive order. */
export function serializeAll(
  values: Array<Serializable>,
  opts?: SerializeOptions
): Buffer {
  return Buffer.concat(values.map((value) => value.serialize(opts)));
}

/** Deserialize a list of Serializables in consecutive order. */
export function deserializeAll(
  buffer: Buffer,
  valuesOrConstructors: Array<Serializable | (new () => Serializable)>,
  opts?: DeserializeOptions
): {
  values: Array<Serializable>;
  serializedLength: number;
} {
  let offset = 0;
  const values: Array<Serializable> = [];
  for (const valueOrConstructor of valuesOrConstructors) {
    const value =
      typeof valueOrConstructor === 'function'
        ? new valueOrConstructor()
        : valueOrConstructor;
    offset += value.deserialize(buffer.slice(offset), opts);
    values.push(value);
  }
  return {values, serializedLength: offset};
}

/** Returns the JSON representation of a value by invoking toJSON() if it exists. */
export function toJSON(value: any) {
  if ('toJSON' in value && typeof value.toJSON === 'function') {
    return value.toJSON();
  }
  return value;
}
