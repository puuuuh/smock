import { FakeContract, smock } from '@src';
import { Returner } from '@typechained';
import chai, { expect } from 'chai';
import { BYTES32_EXAMPLE } from 'test/utils';

chai.should();
chai.use(smock.matchers);

describe('ProgrammableFunctionLogic: Reset', () => {
  let fake: FakeContract<Returner>;

  beforeEach(async () => {
    fake = await smock.fake<Returner>('Returner');
  });

  describe('for a boolean', () => {
    it('should return false after resetting', async () => {
      const expected1 = true;
      fake.getBoolean.returns(expected1);

      expect(await fake.getBoolean.staticCall()).to.equal(expected1);

      const expected2 = false;
      fake.getBoolean.reset();

      expect(await fake.getBoolean.staticCall()).to.equal(expected2);
    });

    it('should be able to reset and change behaviors', async () => {
      const expected1 = true;
      fake.getBoolean.returns(expected1);

      expect(await fake.getBoolean.staticCall()).to.equal(expected1);

      const expected2 = false;
      fake.getBoolean.reset();

      expect(await fake.getBoolean.staticCall()).to.equal(expected2);

      const expected3 = true;
      fake.getBoolean.returns(expected3);

      expect(await fake.getBoolean.staticCall()).to.equal(expected3);
    });
  });

  describe('for a uint256', () => {
    it('should return zero after resetting', async () => {
      const expected1 = 1234n;
      fake.getUint256.returns(expected1);

      expect(await fake.getUint256.staticCall()).to.equal(expected1);

      fake.getUint256.reset();
      expect(await fake.getUint256.staticCall()).to.equal(0n);
    });

    it('should be able to reset and change behaviors', async () => {
      const expected1 = 1234n;
      fake.getUint256.returns(expected1);

      expect(await fake.getUint256.staticCall()).to.equal(expected1);

      fake.getUint256.reset();

      expect(await fake.getUint256.staticCall()).to.equal(0n);

      const expected3 = 4321n;
      fake.getUint256.returns(expected3);

      expect(await fake.getUint256.staticCall()).to.equal(expected3);
    });
  });

  describe('for a bytes32', () => {
    it('should return 32 zero bytes after resetting', async () => {
      const expected1 = BYTES32_EXAMPLE;
      fake.getBytes32.returns(expected1);

      expect(await fake.getBytes32.staticCall()).to.equal(expected1);

      const expected2 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      fake.getBytes32.reset();

      expect(await fake.getBytes32.staticCall()).to.equal(expected2);
    });

    it('should be able to reset and change behaviors', async () => {
      const expected1 = BYTES32_EXAMPLE;
      fake.getBytes32.returns(expected1);

      expect(await fake.getBytes32.staticCall()).to.equal(expected1);

      const expected2 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      fake.getBytes32.reset();

      expect(await fake.getBytes32.staticCall()).to.equal(expected2);

      const expected3 = '0x4321432143214321432143214321432143214321432143214321432143214321';
      fake.getBytes32.returns(expected3);

      expect(await fake.getBytes32.staticCall()).to.equal(expected3);
    });
  });

  it('should reset call index', async () => {
    fake.getString.returnsAtCall(0, 'a');
    fake.getString.reset();
    fake.getString.returnsAtCall(0, 'b');
    expect(await fake.getString.staticCall()).to.equal('b');
  });

  it('should reset call count', async () => {
    await fake.getString.staticCall();
    fake.getString.reset();
    await fake.getString.staticCall();
    expect(fake.getString).to.have.been.calledOnce;
  });
});
