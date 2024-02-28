import {DeserializeOptions, SerializeOptions} from './serializable';
import {SerializableWrapper} from './serializable-wrapper';

/** A numeric value that represents a bitmask of several fields.*/
export abstract class SBitmask extends SerializableWrapper<number> {
  /** Create a new instance of this wrapper class from a raw value. */
  static of<SBitmaskT extends SBitmask>(
    this: new () => SBitmaskT,
    value: number
  ): SBitmaskT;
  /** Returns an SBitmask class that serializes using the provided
   * SerializableWrapper. */
  static of(
    wrapperType: new () => SerializableWrapper<number>
  ): ReturnType<typeof createSBitmaskClass>;
  static of(arg: number | (new () => SerializableWrapper<number>)) {
    if (typeof arg === 'number') {
      return super.of(arg);
    }
    if (
      typeof arg === 'function' &&
      arg.prototype instanceof SerializableWrapper
    ) {
      return createSBitmaskClass(arg);
    }
    throw new Error(
      'SBitmask.of() should be invoked either with a number value ' +
        'or a SerializableWrapper<number> constructor'
    );
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
      // Checks the type of the property is valid.
      getValueType(this, propertyKey);
      wrapper.value |= (((this as any)[propertyKey] | 0) & fieldMask) << offset;
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
      const valueType = getValueType(this, propertyKey);
      (this as any)[propertyKey] = valueType((newValue >> offset) & fieldMask);
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

  toJSON(): any {
    return Object.fromEntries(
      getSBitfieldSpecs(this).map(({propertyKey}) => [
        propertyKey,
        (this as any)[propertyKey],
      ])
    );
  }
}

function createSBitmaskClass(
  wrapperType: new () => SerializableWrapper<number>
) {
  return class extends SBitmask {
    wrapperType = wrapperType;
  };
}

type BitfieldDecorator<ValueT> = {
  (
    value: Function,
    context: ClassGetterDecoratorContext | ClassSetterDecoratorContext
  ): void;
  (value: undefined, context: ClassFieldDecoratorContext): (
    initialValue: ValueT
  ) => ValueT;
};

/** Decorator for bitfields in an SBitmask. */
export function bitfield<ValueT extends number | boolean>(length: number) {
  return function (
    value: undefined | Function,
    context:
      | ClassFieldDecoratorContext
      | ClassGetterDecoratorContext
      | ClassSetterDecoratorContext
  ) {
    context.addInitializer(function () {
      registerBitfield(this, context.name, length);
    });
    switch (context.kind) {
      case 'field':
        return (initialValue: ValueT) => initialValue;
      case 'getter':
      case 'setter':
        return;
      default:
        throw new Error('@bitfield() should only be used on class properties');
    }
  } as BitfieldDecorator<ValueT>;
}

/** Key for storing field information on an SBitmask's metadata. */
const SBITMASK_METADATA_KEY = Symbol('__sbitmaskMetadata');

/** Metadata stored for each field on an SBitmask's metadata. */
interface SBitfieldSpec {
  /** The name of the field. */
  propertyKey: string | symbol;
  /** Number of bits associated with this field. */
  length: number;
}

/** Metadata stored on an SBitmask's prototype. */
interface SBitmaskMetadata {
  /** List of bitfields, in declaration order. */
  fieldSpecs: Array<SBitfieldSpec>;
  /** Name of all bitfields as a set. */
  propertyKeys: Set<string | symbol>;
}

/** Registers a bitfield in the metadata of an SBitmask. */
function registerBitfield<ValueT>(
  targetInstance: any,
  propertyKey: string | symbol,
  length: number
) {
  const targetPrototype = Object.getPrototypeOf(targetInstance);
  const metadata = targetPrototype[SBITMASK_METADATA_KEY] as
    | SBitmaskMetadata
    | undefined;
  const fieldSpec: SBitfieldSpec = {
    propertyKey,
    length,
  };
  if (metadata) {
    if (metadata.propertyKeys.has(propertyKey)) {
      return;
    }
    metadata.propertyKeys.add(propertyKey);
    metadata.fieldSpecs.push(fieldSpec);
  } else {
    const newMetadata: SBitmaskMetadata = {
      fieldSpecs: [fieldSpec],
      propertyKeys: new Set<string | symbol>([propertyKey]),
    };
    targetPrototype[SBITMASK_METADATA_KEY] = newMetadata;
  }
}

/** Extract SBitfieldSpec's defined on a SObject. */
function getSBitfieldSpecs(targetInstance: any) {
  return (
    (
      Object.getPrototypeOf(targetInstance)[SBITMASK_METADATA_KEY] as
        | SBitmaskMetadata
        | undefined
    )?.fieldSpecs ?? []
  );
}

/** Checks that the total length of bitfields matches the value wrapper length. */
function validateLength(
  bitfields: Array<SBitfieldSpec>,
  expectedLength: number
) {
  const expectedBitLength = expectedLength * 8;
  const totalBitLength = bitfields
    .map(({length}) => length)
    .reduce((a, b) => a + b, 0);
  if (totalBitLength !== expectedBitLength) {
    throw new Error(
      'Total length of bitfields do not match bitmask length: ' +
        `expected ${expectedBitLength} bits, ` +
        `but total length of bitfields is ${totalBitLength} bits`
    );
  }
}

/** Returns the constructor for a bitfield value. */
function getValueType(targetInstance: any, propertyKey: string | symbol) {
  const value = targetInstance[propertyKey];
  switch (typeof value) {
    case 'number':
      return Number;
    case 'boolean':
      return Boolean;
    default:
      throw new Error(
        `Expected property ${propertyKey.toString()} to be a number or boolean, ` +
          `but it is ${typeof value}`
      );
  }
}
