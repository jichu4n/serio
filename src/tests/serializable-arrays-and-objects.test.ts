import times from 'lodash/times';
import flatMap from 'lodash/flatMap';
import {SArray, SObject, SUInt16LE, field, SStringNT} from '..';

class TestObjectA extends SObject {
  @field(SArray.of(SUInt16LE))
  prop1 = times(10, () => 0);

  @field(SArray.of(SArray.of(SUInt16LE)))
  prop2 = times(10, () => times(10, () => 0));

  @field(SArray.of(SStringNT.ofLength(5)))
  prop3 = times(10, () => '');
}
const TEST_OBJECT_A_SIZE = 10 * 2 + 10 * 10 * 2 + 10 * 5;

class TestObjectB extends SObject {
  @field()
  prop1 = new TestObjectA();

  @field(SArray)
  prop2 = times(10, () => new TestObjectA());
}
const TEST_OBJECT_B_SIZE = 11 * TEST_OBJECT_A_SIZE;

describe('SArray and SObject', function () {
  test('serialize and deserialize', function () {
    const obj1 = new TestObjectA();
    expect(obj1.getSerializedLength()).toStrictEqual(TEST_OBJECT_A_SIZE);
    expect(obj1.serialize()).toStrictEqual(Buffer.alloc(TEST_OBJECT_A_SIZE));

    obj1.prop1.fill(42);
    obj1.prop2.fill(times(10, () => 999));
    obj1.prop3.fill('ABCD');
    const obj2 = TestObjectA.from(obj1.serialize());
    expect(obj2.prop1).toStrictEqual(times(10, () => 42));
    expect(obj2.prop2).toStrictEqual(times(10, () => times(10, () => 999)));
    expect(obj2.prop3).toStrictEqual(times(10, () => 'ABCD'));
  });

  test('serialize and deserialize with nested objects', function () {
    const obj1 = new TestObjectB();
    expect(obj1.getSerializedLength()).toStrictEqual(TEST_OBJECT_B_SIZE);
    expect(obj1.serialize()).toStrictEqual(Buffer.alloc(TEST_OBJECT_B_SIZE));

    obj1.prop2.fill(
      TestObjectA.with({
        prop1: times(10, () => 42),
      })
    );
    const obj2 = TestObjectB.from(obj1.serialize());
    expect(flatMap(obj2.prop2, ({prop1}) => prop1)).toStrictEqual(
      times(10 * 10, () => 42)
    );
  });

  test('JSON conversion', function () {
    const obj1 = TestObjectB.withJSON({
      prop1: {prop3: ['hello', 'world']},
    });
    expect(obj1.prop1 instanceof TestObjectA);
    expect(obj1.prop1.prop3).toStrictEqual(['hello', 'world']);

    obj1.assignJSON({prop2: [{prop3: ['foo', 'bar', 'baz']}]});
    expect(obj1.prop2).toHaveLength(1);
    expect(obj1.prop2[0] instanceof TestObjectA);
    expect(obj1.prop2[0].prop3).toStrictEqual(['foo', 'bar', 'baz']);

    const arr1 = SArray.ofLength(2, TestObjectA).ofJSON([{prop1: [42]}]);
    expect(arr1.value[0] instanceof TestObjectA);
    const arr1Json = arr1.toJSON();
    expect(arr1Json).toHaveLength(2);
    expect(arr1Json[0].prop1).toStrictEqual([42]);
    expect(arr1Json[1].prop1).toHaveLength(10);
  });
});
