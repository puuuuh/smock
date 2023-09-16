import { FakeContract, smock } from '@src';
import { PickyReturner } from '@typechained';
import { expect } from 'chai';

describe('ProgrammableFunctionLogic: When called with', () => {
  let fake: FakeContract<PickyReturner>;

  beforeEach(async () => {
    fake = await smock.fake<PickyReturner>('PickyReturner');
  });

  describe('returns', () => {
    it('should override default behaviour', async () => {
      fake.getUint256.returns(1n);
      fake.getUint256.whenCalledWith(123n).returns(456n);

      expect(await fake.getUint256.staticCall(123n)).to.equal(456);
    });

    it('should override itself', async () => {
      fake.getUint256.whenCalledWith(123n).returns(1n);
      fake.getUint256.whenCalledWith(123n).returns(2n);

      expect(await fake.getUint256.staticCall(123n)).to.equal(2n);
    });

    it('should be reseted', async () => {
      fake.getUint256.whenCalledWith(123n).returns(1n);
      fake.getUint256.reset();
      fake.getUint256.returns(2n);

      expect(await fake.getUint256.staticCall(123n)).to.equal(2n);
    });

    it('should live together with default', async () => {
      fake.getUint256.returns(1n);
      fake.getUint256.whenCalledWith(123n).returns(456n);

      expect(await fake.getUint256.staticCall(122n)).to.equal(1n);
      expect(await fake.getUint256.staticCall(123n)).to.equal(456n);
    });

    it('should handle multiple calls', async () => {
      fake.getUint256.whenCalledWith(1n).returns(10n);
      fake.getUint256.whenCalledWith(2n).returns(20n);

      expect(await fake.getUint256.staticCall(1n)).to.equal(10n);
      expect(await fake.getUint256.staticCall(2n)).to.equal(20n);
    });
  });

  describe('reverts', () => {
    it('should override default behaviour', async () => {
      fake.getUint256.reverts('a');
      fake.getUint256.whenCalledWith(123n).reverts('b');

      await expect(fake.getUint256.staticCall(123n)).to.be.revertedWith('b');
    });

    it('should override itself', async () => {
      fake.getUint256.whenCalledWith(123n).reverts('a');
      fake.getUint256.whenCalledWith(123n).reverts('b');

      await expect(fake.getUint256.staticCall(123n)).to.be.revertedWith('b');
    });

    it('should be reseted', async () => {
      fake.getUint256.whenCalledWith(123n).reverts('a');
      fake.getUint256.reset();

      await expect(fake.getUint256.staticCall(123)).not.to.be.reverted;
    });

    it('should live together with default', async () => {
      fake.getUint256.reverts('a');
      fake.getUint256.whenCalledWith(123n).reverts('b');

      await expect(fake.getUint256.staticCall(122n)).to.be.revertedWith('a');
      await expect(fake.getUint256.staticCall(123n)).to.be.revertedWith('b');
    });

    it('should handle multiple calls', async () => {
      fake.getUint256.whenCalledWith(1n).reverts('a');
      fake.getUint256.whenCalledWith(2n).reverts('b');

      await expect(fake.getUint256.staticCall(1n)).to.be.revertedWith('a');
      await expect(fake.getUint256.staticCall(2n)).to.be.revertedWith('b');
    });
  });
});
