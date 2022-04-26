import {bitfield, SBitmask, SUInt8} from '..';

class Color8Bit extends SBitmask.as(SUInt8) {
  @bitfield(3)
  r = 0;
  @bitfield(3)
  g = 0;
  @bitfield(2)
  b = 0;
}

class TestInvalidObject extends SBitmask.as(SUInt8) {
  @bitfield(7)
  prop = 0;
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

    // Overflowing bits in each field should be masked out
    const c2 = Color8Bit.with({b: 0b11111});
    expect(c2.serialize()).toStrictEqual(Buffer.of(0b00000011));
  });

  test('error handling', function () {
    expect(() => {
      const bm1 = new TestInvalidObject();
      bm1.serialize();
    }).toThrow();
  });
});
