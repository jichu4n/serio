import fromPairs from 'lodash/fromPairs';
import 'reflect-metadata';
import {
  DeserializeOptions,
  SArray,
  SArrayError,
  Serializable,
  SerializableWrapper,
  SerializeOptions,
} from '.';

/** Serializable record where props are defined via serialize and serializeAs. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = this.toSArray();
    const readOffset = this.wrapSArrayErrorAsSObjectError(() =>
      array.deserialize(buffer, opts)
    );
    const propertySpecs = getSObjectPropertySpecs(this);
    for (let i = 0; i < propertySpecs.length; ++i) {
      const {propertyKey, wrapperType} = propertySpecs[i];
      if (wrapperType) {
        (this as any)[propertyKey] = (
          array.value[i] as SerializableWrapper<any>
        ).value;
      }
    }
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return this.wrapSArrayErrorAsSObjectError(() =>
      this.toSArray().serialize(opts)
    );
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.wrapSArrayErrorAsSObjectError(() =>
      this.toSArray().getSerializedLength(opts)
    );
  }

  toJSON() {
    const values = this.wrapSArrayErrorAsSObjectError(() =>
      this.toSArray().toJSON()
    );
    return fromPairs(
      getSObjectPropertySpecs(this).map(({propertyKey}, i) => [
        propertyKey,
        values[i],
      ])
    );
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SObject>(this: new () => T, props: Partial<T> = {}): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  /** Converts this object to an SArray<Serializable>. */
  private toSArray() {
    return SArray.of(getAllSObjectPropertiesOrWrappers(this));
  }

  private wrapSArrayErrorAsSObjectError<FnT extends () => any>(
    fn: FnT
  ): ReturnType<FnT> {
    try {
      return fn();
    } catch (e) {
      if (e instanceof SArrayError) {
        const propertyKey: string =
          getSObjectPropertySpecs(this)[e.index].propertyKey.toString();
        // @ts-ignore
        const cause: Error = e.cause;
        const e2 = new SObjectError(
          `Error in property ${propertyKey}: ${cause.message}`,
          {cause}
        );
        e2.stack = e.stack;
        e2.propertyKey = propertyKey;
        throw e2;
      } else {
        throw e;
      }
    }
  }
}

/** Error augmented by SObject with property information. */
export class SObjectError extends Error {
  constructor(message: string, {cause}: {cause: Error}) {
    // @ts-ignore
    super(message, {cause});
    Object.setPrototypeOf(this, SObjectError.prototype);
  }
  /** The property that raised the error. */
  propertyKey!: string;
}

/** Decorator for Serializable properties of an SObject. */
export function serialize<ValueT>(target: any, propertyKey: string | symbol) {
  registerSObjectProperty(target, propertyKey);
}

/** Decorator for properties to be wrapped in a Serializable wrapper class. */
export function serializeAs<ValueT>(
  wrapperType: new () => SerializableWrapper<ValueT>
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    registerSObjectProperty(target, propertyKey, wrapperType);
  };
}

/** Key for storing property information on an SObject's metadata. */
const SOBJECT_PROPERTY_SPECS_METADATA_KEY = Symbol('__sobjectPropertySpecs');

/** Registers a serializable property in the metadata of an SObject. */
function registerSObjectProperty<ValueT>(
  target: any,
  propertyKey: string | symbol,
  wrapperType?: new () => SerializableWrapper<ValueT>
) {
  const propertySpecs = Reflect.getMetadata(
    SOBJECT_PROPERTY_SPECS_METADATA_KEY,
    target
  ) as Array<SObjectPropertySpec> | undefined;
  const propertySpec: SObjectPropertySpec = {
    propertyKey,
    wrapperType,
  };
  if (propertySpecs) {
    propertySpecs.push(propertySpec);
  } else {
    Reflect.defineMetadata(
      SOBJECT_PROPERTY_SPECS_METADATA_KEY,
      [propertySpec],
      target
    );
  }
}

/** Metadata stored for each serializable property on an SObject's metadata. */
interface SObjectPropertySpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** The wrapper type for the property, if defined with serializeAs. */
  wrapperType?: new () => SerializableWrapper<ValueT>;
}

/** Extract SObjectPropertySpec's defined on a SObject. */
function getSObjectPropertySpecs(targetInstance: Object) {
  return (Reflect.getMetadata(
    SOBJECT_PROPERTY_SPECS_METADATA_KEY,
    Object.getPrototypeOf(targetInstance)
  ) ?? []) as Array<SObjectPropertySpec>;
}

/** Get the Serializable value corresponding to an SObject property. */
function getSObjectPropertyOrWrapper(
  targetInstance: Object,
  {propertyKey, wrapperType}: SObjectPropertySpec
) {
  const value = (targetInstance as any)[propertyKey];
  if (wrapperType) {
    const wrapper = new wrapperType();
    wrapper.value = value;
    return wrapper;
  } else {
    return value as Serializable;
  }
}

/** Get Serializable values corresponding to all the properties of an SObject. */
function getAllSObjectPropertiesOrWrappers(targetInstance: Object) {
  return getSObjectPropertySpecs(targetInstance).map((propertySpec) =>
    getSObjectPropertyOrWrapper(targetInstance, propertySpec)
  );
}
