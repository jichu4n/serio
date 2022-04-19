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

/** Key for storing property information on an SObject's metadata. */
export const SERIALIZABLE_PROPERTY_SPECS_METADATA_KEY = Symbol(
  '__serializableObjectPropertySpecs'
);

/** Metadata stored for each serializable property on an SObject's metadata. */
export interface SerializablePropertySpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** Extract the underlying wrapper for a property (if defined with serializeAs). */
  getOrCreateWrapper?: (targetInstance: any) => SerializableWrapper<ValueT>;
}

/** Extract SerializablePropertySpec's defined on a SObject. */
export function getSerializablePropertySpecs(targetInstance: Object) {
  return (Reflect.getMetadata(
    SERIALIZABLE_PROPERTY_SPECS_METADATA_KEY,
    Object.getPrototypeOf(targetInstance)
  ) ?? []) as Array<SerializablePropertySpec>;
}

/** Get the Serializable value corresponding to an SObject property. */
export function getSerializablePropertyOrWrapper(
  targetInstance: Object,
  {propertyKey, getOrCreateWrapper}: SerializablePropertySpec
) {
  return getOrCreateWrapper
    ? getOrCreateWrapper(targetInstance)
    : ((targetInstance as any)[propertyKey] as Serializable);
}

/** Get Serializable values corresponding to all the properties of an SObject. */
export function getAllSerializablePropertiesOrWrappers(targetInstance: Object) {
  return getSerializablePropertySpecs(targetInstance).map((propertySpec) =>
    getSerializablePropertyOrWrapper(targetInstance, propertySpec)
  );
}

/** Serializable record where props are defined via serialize and serializeAs. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    return this.wrapSArrayError(() =>
      this.toSArray().deserialize(buffer, opts)
    );
  }

  serialize(opts?: SerializeOptions): Buffer {
    return this.wrapSArrayError(() => this.toSArray().serialize(opts));
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.wrapSArrayError(() =>
      this.toSArray().getSerializedLength(opts)
    );
  }

  /** Converts this object to an SArray<Serializable>. */
  toSArray() {
    return SArray.of(getAllSerializablePropertiesOrWrappers(this));
  }

  toJSON() {
    return fromPairs(
      getSerializablePropertySpecs(this).map(({propertyKey}) => [
        propertyKey,
        (this as any)[propertyKey],
      ])
    );
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SObject>(this: new () => T, props: Partial<T> = {}): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  private wrapSArrayError<FnT extends () => any>(fn: FnT): ReturnType<FnT> {
    try {
      return fn();
    } catch (e) {
      if (e instanceof Error && 'isSArrayError' in e && e['isSArrayError']) {
        const e2 = e as SObjectError;
        e2.isSObjectError = true;
        e2.propertyKey =
          getSerializablePropertySpecs(this)[e2.index].propertyKey;
        e2.message = `${e2.propertyKey.toString()}: ${e2.message}`;
      }
      throw e;
    }
  }
}

/** Error augmented by SObject with property information. */
export interface SObjectError extends SArrayError {
  /** Indicates this is an SObjectError. */
  isSObjectError: true;
  /** The property that raised the error. */
  propertyKey: string | symbol;
}

/** Decorator for Serializable properties. */
export function serialize<ValueT>(
  target: any,
  propertyKey: string | symbol,
  // Used by serializeWithWrapper
  getOrCreateWrapper?: (targetInstance: any) => SerializableWrapper<ValueT>
) {
  const serializablePropertySpecs = Reflect.getMetadata(
    SERIALIZABLE_PROPERTY_SPECS_METADATA_KEY,
    target
  ) as Array<SerializablePropertySpec> | undefined;
  const propertySpec: SerializablePropertySpec = {
    propertyKey,
    getOrCreateWrapper,
  };
  if (serializablePropertySpecs) {
    serializablePropertySpecs.push(propertySpec);
  } else {
    Reflect.defineMetadata(
      SERIALIZABLE_PROPERTY_SPECS_METADATA_KEY,
      [propertySpec],
      target
    );
  }
}

/** Decorator for Serializable properties to be wrapped in a wrapper class. */
export function serializeAs<ValueT>(
  serializableWrapperClass: new () => SerializableWrapper<ValueT>
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    const wrapperPropertyKey = Symbol(
      `__serializablePropertyWrapper_${propertyKey.toString()}`
    );
    const getOrCreateWrapper = function (targetInstance: any) {
      return (
        targetInstance[wrapperPropertyKey] ??
        (targetInstance[wrapperPropertyKey] = new serializableWrapperClass())
      );
    };
    Object.defineProperty(target, propertyKey, {
      get() {
        return getOrCreateWrapper(this).value;
      },
      set(v: ValueT) {
        getOrCreateWrapper(this).value = v;
      },
    });
    serialize(target, propertyKey, getOrCreateWrapper);
  };
}
