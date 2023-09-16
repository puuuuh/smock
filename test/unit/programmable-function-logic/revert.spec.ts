import { FakeContract, smock } from '@src';
import { Returner } from '@typechained';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';

chai.should();
chai.use(smock.matchers);

describe('ProgrammableFunctionLogic: Revert', () => {
  let fake: FakeContract<Returner>;

  beforeEach(async () => {
    fake = await smock.fake<Returner>('Returner');
  });

  context('with any normal function', () => {
    it('should be able to revert without reason', async () => {
      fake.getBoolean.reverts();

      await expect(fake.getBoolean.staticCall()).to.be.reverted;
    });

    it('should be able to cancel revert with a reset', async () => {
      fake.getBoolean.reverts();
      fake.getBoolean.reset();

      await expect(fake.getBoolean.staticCall()).to.not.be.reverted;
    });

    it('should be able to revert with a string value', async () => {
      const reason = 'a crazy problem';
      fake.getBoolean.reverts(reason);

      await expect(fake.getBoolean.staticCall()).to.be.revertedWith(reason);
    });
  });

  context('with fallback function', () => {
    it('should be able to revert without reason', async () => {
      fake.fallback.reverts();

      await expect(ethers.provider.call({ to: await fake.getAddress() })).to.be.reverted;
    });

    it('should be able to cancel revert with a reset', async () => {
      fake.fallback.reverts();
      fake.fallback.reset();

      await expect(ethers.provider.call({ to: await fake.getAddress() })).to.not.be.reverted;
    });

    it('should be able to revert with a string value', async () => {
      const reason = 'a crazy problem';
      fake.fallback.reverts(reason);

      await expect(ethers.provider.call({ to: await fake.getAddress() })).to.be.revertedWith(reason);
    });
  });
});
