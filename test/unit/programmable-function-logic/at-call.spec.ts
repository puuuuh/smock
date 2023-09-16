import { FakeContract, smock } from '@src';
import { Returner } from '@typechained';
import chai, { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';

chai.should();
chai.use(smock.matchers);

describe('ProgrammableFunctionLogic: At call', () => {
  let fake: FakeContract<Returner>;

  beforeEach(async () => {
    fake = await smock.fake<Returner>('Returner');
  });

  describe('returns', () => {
    it('should override default behaviour', async () => {
      fake.getString.returns('a');
      fake.getString.returnsAtCall(0, 'b');
      fake.getString.returnsAtCall(0, 'b');

      expect(await fake.getString.staticCall()).to.equal('b');
    });

    it('should override itself', async () => {
      fake.getString.returnsAtCall(0, 'a');
      fake.getString.returnsAtCall(0, 'b');

      expect(await fake.getString.staticCall()).to.equal('b');
    });

    it('should be reseted', async () => {
      fake.getString.returnsAtCall(0, 'a');
      fake.getString.reset();
      fake.getString.returns('b');

      expect(await fake.getString.staticCall()).to.equal('b');
    });

    it('should live together with default', async () => {
      fake.getString.returns('a');
      fake.getString.returnsAtCall(1, 'b');

      expect(await fake.getString.staticCall()).to.equal('a');
      expect(await fake.getString.staticCall()).to.equal('b');
      expect(await fake.getString.staticCall()).to.equal('a');
    });

    it('should change value by call', async () => {
      fake.getString.returnsAtCall(0, 'a');
      fake.getString.returnsAtCall(1, 'b');

      expect(await fake.getString.staticCall()).to.equal('a');
      expect(await fake.getString.staticCall()).to.equal('b');
    });
  });

  describe('reverts', () => {
    it('should override default behaviour', async () => {
      fake.getString.reverts('a');
      fake.getString.revertsAtCall(0, 'd');

      await expect(fake.getString.staticCall()).to.be.revertedWith('d');
    });

    it('should override itself', async () => {
      fake.getString.revertsAtCall(0, 'a');
      fake.getString.revertsAtCall(0, 'c');

      await expect(fake.getString.staticCall()).to.be.revertedWith('c');
    });

    it('should be reseted', async () => {
      fake.getBoolean.revertsAtCall(0, 'a');
      fake.getBoolean.reset();

      await expect(fake.getBoolean.staticCall()).not.to.be.reverted;
    });

    // TODO: Fix this for strings too?
    it.skip('should be reseted', async () => {
      fake.getString.revertsAtCall(0, 'a');
      fake.getString.reset();

      await expect(fake.getString.staticCall()).not.to.be.reverted;
    });

    it('should live together with default', async () => {
      fake.getString.reverts('a');
      fake.getString.revertsAtCall(1, 'b');

      await expect(fake.getString.staticCall()).to.be.revertedWith('a');
      await expect(fake.getString.staticCall()).to.be.revertedWith('b');
      await expect(fake.getString.staticCall()).to.be.revertedWith('a');
    });

    it('should change value by call', async () => {
      fake.getString.revertsAtCall(0, 'a');
      fake.getString.revertsAtCall(1, 'b');

      await expect(fake.getString.staticCall()).to.be.revertedWith('a');
      await expect(fake.getString.staticCall()).to.be.revertedWith('b');
    });
  });
});
