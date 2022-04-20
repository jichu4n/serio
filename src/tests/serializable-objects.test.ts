import {
  serialize,
  serializeAs,
  serializeAccessorAs,
  SObject,
  SStringNT,
  SUInt16BE,
  SUInt32LE,
  SUInt8,
} from '../';

/** Example object that exercises `serialize` and `serializeAs`. */
class TestObjectA extends SObject {
  @serialize
  prop1 = new SUInt8();

  @serializeAs(SUInt16BE)
  prop2 = 0;

  @serializeAs(SUInt32LE)
  prop3 = 1000;
}

const TEST_OBJECT_A_SERIALIZED_LENGTH = 7;

/** Example object that tests serialize with accessors. */
class TestObjectB extends SObject {
  firstName: string = '';
  lastName: string = '';

  @serialize
  get fullName(): SStringNT {
    return SStringNT.of(`${this.firstName} ${this.lastName}`);
  }

  set fullName(fullName: SStringNT) {
    [this.firstName, this.lastName] = fullName.value.split(' ');
  }
}

/** Example object that tests serializeAccessorAs. */
class TestObjectC extends SObject {
  firstName: string = '';
  lastName: string = '';

  @serializeAccessorAs(SStringNT)
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(fullName: string) {
    [this.firstName, this.lastName] = fullName.split(' ');
  }
}

describe('SObject', function () {
  describe('serialize and serializeAs', function () {
    test('using constructor and assignment', function () {
      const obj1 = new TestObjectA();
      expect(obj1.getSerializedLength()).toStrictEqual(
        TEST_OBJECT_A_SERIALIZED_LENGTH
      );
      obj1.prop1.value = 42;
      obj1.prop2 = 153;
      obj1.prop3 = 99;
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
});
