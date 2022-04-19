import {Serializable} from './serializable';
import {Creatable} from './creatable';

/** Serializable implementation that simply wraps another value. */
export interface SerializableWrapper<ValueT> extends Serializable {
  value: ValueT;
}

/** Factory for Serializable wrappers for basic data types. */
export function createSerializableScalarWrapperClass<ValueT>({
  readFn,
  writeFn,
  serializedLength,
  defaultValue,
}: {
  readFn: () => ValueT;
  writeFn: (value: ValueT) => void;
  serializedLength: number;
  defaultValue: ValueT;
}) {
  const SerializableScalarWrapperClass = class
    extends Creatable
    implements SerializableWrapper<ValueT>
  {
    value: ValueT = defaultValue;

    deserialize(buffer: Buffer) {
      this.value = readFn.call(buffer);
      return serializedLength;
    }

    serialize() {
      const buffer = Buffer.alloc(serializedLength);
      writeFn.call(buffer, this.value);
      return buffer;
    }

    getSerializedLength() {
      return serializedLength;
    }

    toJSON() {
      return this.value;
    }
  };
  return SerializableScalarWrapperClass;
}
