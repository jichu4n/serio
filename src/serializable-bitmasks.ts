import sum from 'lodash/sum';
import {SerializableWrapper} from './';
import {DeserializeOptions, SerializeOptions} from './serializable';

/** A numeric value that represents a bitmask of several fields.*/
export abstract class SBitmask extends SerializableWrapper<number> {
  /** Returns an SBitmask class that serializes using the provided
   * SerializableWrapper. */
  static as<WrapperT extends SerializableWrapper<number>>(
    wrapperType: new () => WrapperT
  ) {
    return class extends SBitmask {
      wrapperType = wrapperType;
    };
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SBitmask>(
    this: new () => T,
    props: Partial<T> = {}
  ): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  /** The SerializableWrapper class to use for serializing / deserializing. */
  abstract wrapperType: new () => SerializableWrapper<number>;

  get value() {
    const bitfields = getSBitfieldSpecs(this);
    const wrapper = new this.wrapperType();
    validateLength(bitfields, wrapper.getSerializedLength());

    wrapper.value = 0;
    let offset = 0;
    for (let i = bitfields.length - 1; i >= 0; --i) {
      const {propertyKey, length} = bitfields[i];
      const fieldMask = 2 ** length - 1;
      wrapper.value |= ((this as any)[propertyKey] & fieldMask) << offset;
      offset += length;
    }
    return wrapper.value;
  }

  set value(newValue: number) {
    const bitfields = getSBitfieldSpecs(this);
    validateLength(bitfields, new this.wrapperType().getSerializedLength());

    let offset = 0;
    for (let i = bitfields.length - 1; i >= 0; --i) {
      const {propertyKey, length} = bitfields[i];
      const fieldMask = 2 ** length - 1;
      (this as any)[propertyKey] = (newValue >> offset) & fieldMask;
      offset += length;
    }
  }

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const wrapper = new this.wrapperType();
    const readOffset = wrapper.deserialize(buffer, opts);
    this.value = wrapper.value;
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    const wrapper = new this.wrapperType();
    wrapper.value = this.value;
    return wrapper.serialize(opts);
  }

  getSerializedLength(opts?: SerializeOptions): number {
    const wrapper = new this.wrapperType();
    return wrapper.getSerializedLength(opts);
  }
}

/** Decorator for bitfields in an SBitmask. */
export function bitfield(length: number) {
  return function (target: Object, propertyKey: string | symbol) {
    const fieldSpecs = Reflect.getMetadata(
      SBITFIELD_SPECS_METADATA_KEY,
      target
    ) as Array<SBitfieldSpec> | undefined;
    const fieldSpec: SBitfieldSpec = {
      propertyKey,
      length,
    };
    if (fieldSpecs) {
      fieldSpecs.push(fieldSpec);
    } else {
      Reflect.defineMetadata(SBITFIELD_SPECS_METADATA_KEY, [fieldSpec], target);
    }
  };
}

/** Metadata stored for each field on an SBitmask's metadata. */
interface SBitfieldSpec {
  /** The name of the field. */
  propertyKey: string | symbol;
  /** Number of bits associated with this field. */
  length: number;
}

/** Key for storing field information on an SBitmask's metadata. */
const SBITFIELD_SPECS_METADATA_KEY = Symbol('__sbitfieldSpecs');

/** Extract SBitfieldSpec's defined on a SObject. */
function getSBitfieldSpecs(targetInstance: Object) {
  return (Reflect.getMetadata(
    SBITFIELD_SPECS_METADATA_KEY,
    Object.getPrototypeOf(targetInstance)
  ) ?? []) as Array<SBitfieldSpec>;
}

/** Checks that the total length of bitfields matches the value wrapper length. */
function validateLength(
  bitfields: Array<SBitfieldSpec>,
  expectedLength: number
) {
  const expectedBitLength = expectedLength * 8;
  const totalBitLength = sum(bitfields.map(({length}) => length));
  if (totalBitLength !== expectedBitLength) {
    throw new Error(
      'Total length of bitfields do not match bitmask length: ' +
        `expected ${expectedBitLength} bits, actual ${totalBitLength} bits`
    );
  }
}
