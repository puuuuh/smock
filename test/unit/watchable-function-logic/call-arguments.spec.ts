import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { FakeContract, smock } from '@src';
import { Caller, Caller__factory, Receiver } from '@typechained';
import chai, { AssertionError, expect } from 'chai';
import { ethers } from 'hardhat';

chai.should();
chai.use(smock.matchers);

describe('WatchableFunctionLogic: Call arguments', () => {
  let fake: FakeContract<Receiver>;
  let caller: Caller;
  let signer: SignerWithAddress;

  before(async () => {
    [, signer] = await ethers.getSigners();

    const callerFactory = (await ethers.getContractFactory('Caller')) as Caller__factory;
    caller = await callerFactory.deploy();
  });

  beforeEach(async () => {
    fake = await smock.fake<Receiver>('Receiver');
  });

  describe('calledWith', async () => {
    it('should throw when the watchablecontract is not called', async () => {
      expect(() => {
        fake.receiveBoolean.should.have.been.calledWith(true);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called with incorrect arguments', async () => {
      await sendBooleanToWatchableContract(false);

      expect(() => {
        fake.receiveBoolean.should.have.been.calledWith(true);
      }).to.throw(AssertionError);
    });

    it('should not throw when the watchablecontract is called with the correct arguments', async () => {
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.should.have.been.calledWith(true);
    });

    it('should not throw when the watchablecontract is called with incorrect arguments but the correct ones as well', async () => {
      await sendBooleanToWatchableContract(false);
      await sendBooleanToWatchableContract(true);
      await sendBooleanToWatchableContract(false);

      fake.receiveBoolean.should.have.been.calledWith(true);
    });
  });

  describe('calledWithValue', async () => {
    const value = 123n;

    it('should throw when the watchablecontract is not called', async () => {
      expect(() => {
        fake.receiveEmpty.should.have.been.calledWithValue(value);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called with incorrect arguments', async () => {
      await fake.connect(signer).receiveEmpty({ value: value - 1n });

      expect(() => {
        fake.receiveEmpty.should.have.been.calledWithValue(value);
      }).to.throw(RangeError);
    });

    it('should not throw when the watchablecontract is called with the correct arguments', async () => {
      await fake.connect(signer).receiveEmpty({ value });
      fake.receiveEmpty.should.have.been.calledWithValue(value);
    });

    it('should not throw when the watchablecontract is called with incorrect arguments but the correct ones as well', async () => {
      await fake.connect(signer).receiveEmpty({ value: value - 1n });
      await fake.connect(signer).receiveEmpty({ value: value });
      await fake.connect(signer).receiveEmpty({ value: value + 1n });

      fake.receiveEmpty.should.have.been.calledWithValue(value);
    });
  });

  describe('always.calledWith', async () => {
    it('should throw when the watchablecontract is not called', async () => {
      expect(() => {
        fake.receiveBoolean.should.have.been.always.calledWith(true);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called with incorrect arguments', async () => {
      await sendBooleanToWatchableContract(false);

      expect(() => {
        fake.receiveBoolean.should.have.been.always.calledWith(true);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called with incorrect arguments but the correct ones as well', async () => {
      await sendBooleanToWatchableContract(false);
      await sendBooleanToWatchableContract(true);

      expect(() => {
        fake.receiveBoolean.should.have.been.always.calledWith(true);
      }).to.throw(AssertionError);
    });

    it('should not throw when the watchablecontract is called with the correct arguments', async () => {
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.should.have.been.always.calledWith(true);
    });

    it('should not throw when the watchablecontract is called with the correct arguments multiple times', async () => {
      await sendBooleanToWatchableContract(true);
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.should.have.been.always.calledWith(true);
    });
  });

  describe('calledOnceWith', () => {
    it('should throw when the watchablecontract is not called', async () => {
      expect(() => {
        fake.receiveBoolean.should.have.been.calledOnceWith(true);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called more than once', async () => {
      await sendBooleanToWatchableContract(true);
      await sendBooleanToWatchableContract(true);

      expect(() => {
        fake.receiveBoolean.should.have.been.calledOnceWith(true);
      }).to.throw(AssertionError);
    });

    it('should throw when the watchablecontract is called once with incorrect arguments', async () => {
      await sendBooleanToWatchableContract(false);

      expect(() => {
        fake.receiveBoolean.should.have.been.calledOnceWith(true);
      }).to.throw(AssertionError);
    });

    it('should not throw when the watchablecontract is called once with the correct arguments', async () => {
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.should.have.been.calledOnceWith(true);
    });
  });

  describe('getCall', () => {
    it('should provide call arguments', async () => {
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.getCall(0).args.should.deep.equal([true]);
    });

    it('should provide call nonce', async () => {
      await sendBooleanToWatchableContract(true);
      await sendBooleanToWatchableContract(true);
      fake.receiveBoolean.getCall(1).nonce.should.be.gt(fake.receiveBoolean.getCall(0).nonce);
    });
  });

  async function sendBooleanToWatchableContract(value: boolean): Promise<void> {
    await caller.call(fake.getAddress(), fake.interface.encodeFunctionData('receiveBoolean', [value]));
  }
});
