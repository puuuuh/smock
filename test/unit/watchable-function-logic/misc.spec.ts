import { FakeContract, smock } from '@src';
import { Caller, Caller__factory, Receiver } from '@typechained';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';

chai.should();
chai.use(smock.matchers);

describe('WatchableFunctionLogic: Miscellaneous', () => {
  let fake: FakeContract<Receiver>;
  let caller: Caller;

  before(async () => {
    const callerFactory = (await ethers.getContractFactory('Caller')) as Caller__factory;
    caller = await callerFactory.deploy();
  });

  beforeEach(async () => {
    fake = await smock.fake<Receiver>('Receiver');
  });

  it('should separate calls from different spies with the same factory', async () => {
    let addr = await fake.getAddress();
    const otherWatchableContract = await smock.fake<Receiver>('Receiver');
    await caller.call(addr, fake.interface.encodeFunctionData('receiveBoolean', [true]));
    otherWatchableContract.receiveBoolean.should.not.have.been.called;
  });

  it('should throw when always flag is used in an unsupported method', async () => {
    expect(() => {
      fake.receiveBoolean.should.always.have.been.calledOnceWith(true);
    }).to.throw('always flag is not supported for method calledOnceWith');
  });

  it('should throw when expecting a delegatedFrom that did not happen', async () => {
    let addr = await fake.getAddress();
    expect(() => {
      fake.receiveBoolean.should.be.delegatedFrom(addr);
    }).to.throw(`expected receiveBoolean to have been called via a delegated call by '${addr}'`);
  });
});
