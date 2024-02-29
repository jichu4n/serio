import {bitfield, json, SBitmask, SUInt8} from '..';

class Color8Bit extends SBitmask.of(SUInt8) {
  @bitfield(3)
  r = 0;
  @bitfield(3)
  g = 0;
  @bitfield(2)
  b = 0;
}

class TestBooleanObject extends SBitmask.of(SUInt8) {
  @bitfield(1)
  field1 = false;

  @bitfield(6)
  field2 = 0;

  @bitfield(1)
  @json(false)
  field3 = false;

  field4 = 'hello';

  @json(true)
  get field5() {
    return this.field1 || this.field2 || this.field3;
  }
}

class TestInvalidObjectA extends SBitmask.of(SUInt8) {
  @bitfield(7)
  prop = 0;
}

class TestInvalidObjectB extends SBitmask.of(SUInt8) {
  @bitfield(8)
  prop = false;
}

describe('SBitmask', function () {
  test('serialize and deserialize', function () {
    const c1 = new Color8Bit();
    expect(c1.getSerializedLength()).toStrictEqual(1);
    expect(c1.serialize()).toStrictEqual(Buffer.of(0b00000000));

    c1.b = 1;
    expect(c1.serialize()).toStrictEqual(Buffer.of(0b00000001));
    c1.g = 1;
    expect(c1.serialize()).toStrictEqual(Buffer.of(0b00000101));
    c1.r = 1;
    expect(c1.serialize()).toStrictEqual(Buffer.of(0b00100101));

    c1.deserialize(Buffer.of(0b11101010));
    expect(c1.r).toStrictEqual(0b111);
    expect(c1.g).toStrictEqual(0b010);
    expect(c1.b).toStrictEqual(0b10);

    const c2 = Color8Bit.of(0b01111010);
    expect(c2.r).toStrictEqual(0b011);
    expect(c2.g).toStrictEqual(0b110);
    expect(c2.b).toStrictEqual(0b10);

    // Overflowing bits in each field should be masked out
    const c3 = Color8Bit.with({b: 0b11111});
    expect(c3.serialize()).toStrictEqual(Buffer.of(0b00000011));
  });

  test('boolean flag', function () {
    const bm1 = new TestBooleanObject();
    expect(bm1.serialize()).toStrictEqual(Buffer.of(0b00000000));
    bm1.field1 = true;
    bm1.field2 = 2;
    bm1.field3 = true;
    expect(bm1.serialize()).toStrictEqual(Buffer.of(0b10000101));

    bm1.deserialize(Buffer.of(0b10010000));
    expect(bm1.toJSON()).toStrictEqual({
      field1: true,
      field2: 0b001000,
      field4: 'hello',
      field5: true,
    });
  });

  test('error handling', function () {
    expect(() => {
      const bm1 = new TestInvalidObjectA();
      bm1.serialize();
    }).toThrow();
    expect(() => {
      const bm2 = new TestInvalidObjectB();
      // @ts-expect-error
      bm2.prop = 'hello';
      bm2.serialize();
    }).toThrow();
    expect(() => {
      const bm3 = new TestInvalidObjectB();
      // @ts-expect-error
      bm3.prop = null;
      bm3.serialize();
    }).toThrow();
  });

  test('JSON conversion', function () {
    expect(new Color8Bit().toJSON()).toStrictEqual({
      r: 0,
      g: 0,
      b: 0,
    });
    expect(
      Color8Bit.with({r: 0b100, g: 0b101, b: 0b01}).toJSON()
    ).toStrictEqual({
      r: 0b100,
      g: 0b101,
      b: 0b01,
    });

    const bm1 = new Color8Bit();
    bm1.assignJSON({r: 0b100});
    expect(bm1.toJSON()).toStrictEqual({r: 0b100, g: 0, b: 0});
    bm1.assignJSON({});
    expect(bm1.toJSON()).toStrictEqual({r: 0b100, g: 0, b: 0});
    bm1.assignJSON(Color8Bit.with({r: 1, g: 2, b: 3}).serialize().at(0)!);
    expect(bm1.toJSON()).toStrictEqual({r: 1, g: 2, b: 3});
  });
});
