import {
  DeserializeOptions,
  Serializable,
  SerializeOptions,
} from './serializable';
import {SArray, SArrayError} from './serializable-arrays';
import {SerializableWrapper} from './serializable-wrapper';
import {shouldAssignJSON, toJSON} from './utils';

/** Serializable record where fields are defined via `@field()`. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = toSArray(this);
    const readOffset = wrapSArrayErrorAsSObjectError(this, () =>
      array.deserialize(buffer, opts)
    );
    const fieldSpecs = getFieldSpecs(this);
    for (let i = 0; i < fieldSpecs.length; ++i) {
      const {propertyKey, wrapperType} = fieldSpecs[i];
      if (wrapperType) {
        (this as any)[propertyKey] = (
          array.value[i] as SerializableWrapper<any>
        ).value;
      }
    }
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).serialize(opts)
    );
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).getSerializedLength(opts)
    );
  }

  toJSON(): any {
    const serializableFields = this.mapValuesToSerializable();
    return Object.fromEntries(
      Object.entries(this).map(([propertyKey, value]) => {
        try {
          return [
            propertyKey,
            toJSON(
              propertyKey in serializableFields
                ? serializableFields[propertyKey]
                : value
            ),
          ];
        } catch (e: any) {
          throw new SObjectError(propertyKey, e);
        }
      })
    );
  }

  /** Create a new instance with the provided initial properties.
   *
   * This method uses assignJSON() to either assign or hydrate JSON values for
   * nested Serializable values. For example, you can do the following:
   * ```
   * class A extends SObject {
   *   @field(SUInt8) prop1: number;
   * }
   * class B extends SObject {
   *   @field() a = new A();
   * }
   * const b = B.with({a: {prop1: 300}});
   * ```
   */
  static with<T extends SObject>(
    this: new () => T,
    props: {[P in keyof T]?: T[P] | unknown} = {}
  ): T {
    const instance = new this();
    instance.assignJSON(props);
    return instance;
  }

  /** Map values of this object to Serializable.
   *
   * Fields defined with `@field()` are preserved as-is, and field defined with
   * `@field(wrapper)` are wrapped in their respective wrapper types.
   */
  mapValuesToSerializable(): {[propertyKey: string]: Serializable} {
    return Object.fromEntries(
      getFieldSpecs(this).map((fieldSpec) => [
        fieldSpec.propertyKey,
        getFieldOrWrapper(this, fieldSpec),
      ])
    );
  }

  /** Assign properties to this object from a JSON object.
   *
   * Conceptually equivalent to Object.assign(), but recursively hydrates
   * SObjects / SArrays / SerializableWrappers etc and invokes their
   * assignJSON() to process JSON values.
   */
  assignJSON(jsonObject: {[key: string | symbol]: unknown}) {
    if (typeof jsonObject !== 'object' || jsonObject === null) {
      throw new Error(
        `Expected object in SObject.assignJSON(), got ${typeof jsonObject}`
      );
    }
    const fieldSpecs = getFieldSpecMap(this);
    for (const [propertyKey, jsonValue] of Object.entries(jsonObject)) {
      const wrapperType = fieldSpecs[propertyKey]?.wrapperType;
      if (wrapperType) {
        if (
          jsonValue !== null &&
          jsonValue !== undefined &&
          jsonValue.constructor === wrapperType
        ) {
          (this as any)[propertyKey] = (
            jsonValue as SerializableWrapper<any>
          ).value;
        } else {
          const wrapper = new wrapperType();
          wrapper.value = (this as any)[propertyKey];
          if (!shouldAssignJSON(wrapper, jsonValue)) {
            // SerializableWrapper classes should always implement assignJSON.
            throw new SObjectError(
              propertyKey,
              new Error(
                // @ts-expect-error
                `Field wrapper class ${wrapper.constructor.name} does not support assignJSON`
              )
            );
          }
          wrapper.assignJSON(jsonValue);
          (this as any)[propertyKey] = wrapper.value;
        }
      } else {
        const currentValue = (this as any)[propertyKey];
        if (shouldAssignJSON(currentValue, jsonValue)) {
          currentValue.assignJSON(jsonValue);
        } else {
          (this as any)[propertyKey] = jsonValue;
        }
      }
    }
  }

  /** Assign properties to this object from a map of Serializables.
   *
   * Conceptually equivalent to Object.assign(), but automatically unwraps
   * wrapped properties. Fields defined with `@field()` are directly assigned,
   * and fields defined with `@field(wrapper)` are assigned by unwrapping the
   * corresponding SerializableWrapper. Unknown fields are ignored.
   */
  assignFromSerializable(serializableMap: {
    [propertyKey: string]: Serializable;
  }) {
    for (const {propertyKey, wrapperType} of getFieldSpecs(this)) {
      const serializableValue = serializableMap[propertyKey.toString()];
      if (!serializableValue) {
        continue;
      }
      if (wrapperType) {
        if (!(serializableValue instanceof SerializableWrapper)) {
          throw new Error(
            `Error in field ${propertyKey.toString()}: ` +
              `expected SerializableWrapper in assignment, ` +
              `got ${typeof serializableValue} (${toJSON(serializableValue)})`
          );
        }
        (this as any)[propertyKey] = serializableValue.value;
      } else {
        (this as any)[propertyKey] = serializableValue;
      }
    }
  }
}

/** Converts this object to an SArray of serializable field values. */
function toSArray(targetInstance: SObject): SArray<Serializable> {
  return SArray.of(
    getFieldSpecs(targetInstance).map((fieldSpec) =>
      getFieldOrWrapper(targetInstance, fieldSpec)
    )
  );
}

function wrapSArrayErrorAsSObjectError<FnT extends () => any>(
  targetInstance: SObject,
  fn: FnT
): ReturnType<FnT> {
  try {
    return fn();
  } catch (e) {
    if (e instanceof SArrayError) {
      const propertyKey =
        getFieldSpecs(targetInstance)[e.index].propertyKey.toString();
      // @ts-ignore
      const cause: Error = e.cause;
      const e2 = new SObjectError(propertyKey, cause);
      throw e2;
    } else {
      throw e;
    }
  }
}

/** Error augmented by SObject with property information. */
export class SObjectError extends Error {
  constructor(propertyKey: string, cause: any) {
    super(`Error in field ${propertyKey}: ${cause.message}`);
    Object.setPrototypeOf(this, SObjectError.prototype);
    this.cause = cause;
    this.propertyKey = propertyKey;
    this.stack = cause.stack;
  }
  /** The original error. */
  cause: any;
  /** The property that raised the error. */
  propertyKey: string;
}

type SerializableFieldDecorator<ValueT> = {
  (
    value: Function,
    context: ClassGetterDecoratorContext | ClassSetterDecoratorContext
  ): void;
  (value: undefined, context: ClassFieldDecoratorContext): (
    initialValue: ValueT
  ) => ValueT;
};

/** Decorator for Serializable fields of an SObject. */
export function field<WrappedValueT, ValueT extends WrappedValueT>(
  wrapperType?: new () => SerializableWrapper<WrappedValueT>
) {
  return function (
    value: undefined | Function,
    context:
      | ClassFieldDecoratorContext
      | ClassGetterDecoratorContext
      | ClassSetterDecoratorContext
  ) {
    context.addInitializer(function () {
      registerField(this, context.name, wrapperType);
    });
    switch (context.kind) {
      case 'field':
        return (initialValue: ValueT) => initialValue;
      case 'getter':
      case 'setter':
        return;
      default:
        throw new Error('@field() should only be used on class properties');
    }
  } as SerializableFieldDecorator<ValueT>;
}

/** Key for metadata stored on an SObject's prototype. */
const SOBJECT_METADATA_KEY = Symbol('__sobjectMetadata');

/** Metadata stored for each serializable property on an SObject's prototype. */
interface SObjectFieldSpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** The wrapper type for the property, if defined with @field(wrapper). */
  wrapperType?: new () => SerializableWrapper<ValueT>;
}

/** Metadata stored on an SObject's prototype. */
interface SObjectMetadata {
  /** List of serializable fields, in declaration order. */
  fieldSpecs: Array<SObjectFieldSpec>;
  /** Field specs indexed by property name. */
  fieldSpecMap: {[key: string | symbol]: SObjectFieldSpec};
  /** Name of all serializable fields as a set. */
  propertyKeys: Set<string | symbol>;
}

/** Registers a serializable property in the metadata of an SObject. */
function registerField<ValueT>(
  targetInstance: any,
  propertyKey: string | symbol,
  wrapperType?: new () => SerializableWrapper<ValueT>
) {
  const targetPrototype = Object.getPrototypeOf(targetInstance);
  const metadata = targetPrototype[SOBJECT_METADATA_KEY] as
    | SObjectMetadata
    | undefined;
  const fieldSpec: SObjectFieldSpec<ValueT> = {
    propertyKey,
    wrapperType,
  };
  if (metadata) {
    if (metadata.propertyKeys.has(propertyKey)) {
      return;
    }
    metadata.propertyKeys.add(propertyKey);
    metadata.fieldSpecs.push(fieldSpec);
    metadata.fieldSpecMap[propertyKey] = fieldSpec;
  } else {
    const newMetadata: SObjectMetadata = {
      fieldSpecs: [fieldSpec],
      fieldSpecMap: {[propertyKey]: fieldSpec},
      propertyKeys: new Set<string | symbol>([propertyKey]),
    };
    targetPrototype[SOBJECT_METADATA_KEY] = newMetadata;
  }
}

/** Extract SObjectMetadata defined on an SObject. */
function getSObjectMetadata<ObjectT extends SObject>(
  targetInstance: ObjectT
): SObjectMetadata | null {
  return (
    (Object.getPrototypeOf(targetInstance)[SOBJECT_METADATA_KEY] as
      | SObjectMetadata
      | undefined) ?? null
  );
}

/** Extract SObjectFieldSpec's defined on a SObject. */
function getFieldSpecs<ObjectT extends SObject>(targetInstance: ObjectT) {
  return getSObjectMetadata(targetInstance)?.fieldSpecs ?? [];
}

/** Extract SObjectFieldMap defined on a SObject. */
function getFieldSpecMap<ObjectT extends SObject>(targetInstance: ObjectT) {
  return getSObjectMetadata(targetInstance)?.fieldSpecMap ?? {};
}

/** Get the Serializable value corresponding to an SObject field. */
function getFieldOrWrapper(
  targetInstance: any,
  {propertyKey, wrapperType}: SObjectFieldSpec
) {
  const value = targetInstance[propertyKey];
  if (wrapperType) {
    const wrapper = new wrapperType();
    wrapper.value = value;
    return wrapper;
  } else {
    return value as Serializable;
  }
}
