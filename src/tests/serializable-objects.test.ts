import {field, SObject, SObjectError, SStringNT, SUInt16BE, SUInt8} from '../';
import {ThrowingSerializable} from './throwing-serializable';

/** Example object that exercises `field` and `field.as`. */
class TestObjectA extends SObject {
  @field
  prop1 = new SUInt8();

  @field.as(SUInt16BE)
  prop2 = 0;

  @field.as(SStringNT.ofLength(4))
  prop3 = '';
}

const TEST_OBJECT_A_SERIALIZED_LENGTH = 7;

/** Example object that tests serialize with accessors. */
class TestObjectB extends SObject {
  firstName: string = '';
  lastName: string = '';

  @field
  get fullName(): SStringNT {
    return SStringNT.of(`${this.firstName} ${this.lastName}`);
  }
  set fullName(fullName: SStringNT) {
    [this.firstName, this.lastName] = fullName.value.split(' ');
  }
}

/** Example object that tests field.as with accessors. */
class TestObjectC extends SObject {
  firstName: string = '';
  lastName: string = '';

  @field.as(SStringNT)
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  set fullName(fullName: string) {
    [this.firstName, this.lastName] = fullName.split(' ');
  }
}

/** Object that contains a ThrowingSerializable. */
class ThrowingObject extends SObject {
  constructor(public errorMessage?: string) {
    super();
  }

  @field.as(SUInt16BE)
  prop1 = 0;

  @field
  prop2 = new ThrowingSerializable(this.errorMessage);
}

describe('SObject', function () {
  describe('field and field.as', function () {
    test('using constructor and assignment', function () {
      const obj1 = new TestObjectA();
      expect(obj1.getSerializedLength()).toStrictEqual(
        TEST_OBJECT_A_SERIALIZED_LENGTH
      );
      obj1.prop1.value = 42;
      obj1.prop2 = 153;
      obj1.prop3 = 'FOO!';
      const serializedObj1 = obj1.serialize();
      expect(serializedObj1).toHaveLength(obj1.getSerializedLength());

      const obj2 = TestObjectA.from(serializedObj1);
      expect(obj2.prop1.value).toStrictEqual(obj1.prop1.value);
      expect(obj2.prop2).toStrictEqual(obj1.prop2);
    });

    test('using "with"', function () {
      const obj1 = TestObjectA.with({
        prop1: SUInt8.of(100),
        prop2: 15,
      });
      expect(obj1.getSerializedLength()).toStrictEqual(
        TEST_OBJECT_A_SERIALIZED_LENGTH
      );
      expect(obj1.prop1.value).toStrictEqual(100);
      expect(obj1.prop2).toStrictEqual(15);
      expect(obj1.prop3).toStrictEqual(new TestObjectA().prop3);
    });

    test('using getter', function () {
      const obj1 = new TestObjectB();
      obj1.firstName = 'Jane';
      obj1.lastName = 'Doe';
      expect(obj1.fullName.value).toStrictEqual('Jane Doe');
      expect(obj1.getSerializedLength()).toStrictEqual(
        obj1.fullName.value.length + 1
      );
      expect(
        Buffer.from(
          obj1.serialize().slice(0, obj1.fullName.value.length)
        ).toString()
      ).toStrictEqual('Jane Doe');
    });

    test('using setter', function () {
      const obj2 = new TestObjectB();
      obj2.fullName = SStringNT.of('Jane Doe');
      expect(obj2.fullName.value).toStrictEqual('Jane Doe');
      expect(obj2.firstName).toStrictEqual('Jane');
      expect(obj2.lastName).toStrictEqual('Doe');
      expect(obj2.getSerializedLength()).toStrictEqual(
        obj2.fullName.value.length + 1
      );
      expect(
        Buffer.from(
          obj2.serialize().slice(0, obj2.fullName.value.length)
        ).toString()
      ).toStrictEqual('Jane Doe');
    });
  });

  describe('serializeAccessorAs', function () {
    test('using getter', function () {
      const obj1 = new TestObjectC();
      obj1.firstName = 'Jane';
      obj1.lastName = 'Doe';
      expect(obj1.fullName).toStrictEqual('Jane Doe');
      expect(obj1.getSerializedLength()).toStrictEqual(
        obj1.fullName.length + 1
      );
      expect(
        Buffer.from(obj1.serialize().slice(0, obj1.fullName.length)).toString()
      ).toStrictEqual('Jane Doe');

      obj1.firstName = 'John';
      expect(obj1.fullName).toStrictEqual('John Doe');
      expect(
        Buffer.from(obj1.serialize().slice(0, obj1.fullName.length)).toString()
      ).toStrictEqual('John Doe');
    });

    test('using setter', function () {
      const obj2 = new TestObjectC();
      obj2.fullName = 'Jane Doe';
      expect(obj2.fullName).toStrictEqual('Jane Doe');
      expect(obj2.firstName).toStrictEqual('Jane');
      expect(obj2.lastName).toStrictEqual('Doe');
      expect(obj2.getSerializedLength()).toStrictEqual(
        obj2.fullName.length + 1
      );
      expect(
        Buffer.from(obj2.serialize().slice(0, obj2.fullName.length)).toString()
      ).toStrictEqual('Jane Doe');
    });

    test('using "with"', function () {
      const obj3 = TestObjectC.with({fullName: 'Jane Doe'});
      expect(obj3.fullName).toStrictEqual('Jane Doe');
      expect(obj3.firstName).toStrictEqual('Jane');
      expect(obj3.lastName).toStrictEqual('Doe');
      expect(obj3.getSerializedLength()).toStrictEqual(
        obj3.fullName.length + 1
      );
      expect(
        Buffer.from(obj3.serialize().slice(0, obj3.fullName.length)).toString()
      ).toStrictEqual('Jane Doe');
    });
  });

  describe('toJSON', function () {
    const obj1 = TestObjectA.with({
      prop1: SUInt8.of(100),
      prop2: 50,
      prop3: 'FOO!',
    });
    expect(obj1.toJSON()).toStrictEqual({
      prop1: 100,
      prop2: 50,
      prop3: 'FOO!',
    });

    const obj2 = TestObjectB.with({firstName: 'Jane', lastName: 'Doe'});
    expect(obj2.toJSON()).toStrictEqual({fullName: 'Jane Doe'});

    const obj3 = TestObjectB.with({firstName: 'Jane', lastName: 'Doe'});
    expect(obj3.toJSON()).toStrictEqual({fullName: 'Jane Doe'});
  });

  test('error handling', function () {
    const obj1 = new ThrowingObject('test error');

    expect(() => obj1.serialize()).toThrow(SObjectError);
    try {
      obj1.serialize();
    } catch (e) {
      const e2 = e as SObjectError;
      expect(e2.propertyKey).toStrictEqual('prop2');
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }

    expect(() => obj1.deserialize(Buffer.alloc(100))).toThrow(SObjectError);
    try {
      obj1.deserialize(Buffer.alloc(100));
    } catch (e) {
      const e2 = e as SObjectError;
      expect(e2.propertyKey).toStrictEqual('prop2');
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }

    expect(() => obj1.toJSON()).toThrow(SObjectError);
    try {
      obj1.toJSON();
    } catch (e) {
      const e2 = e as SObjectError;
      expect(e2.propertyKey).toStrictEqual('prop2');
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }
  });
});