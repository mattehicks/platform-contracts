import { expect } from "chai";
import { prettyPrintGasCost } from "../helpers/gasUtils";
import {
  deployUniverse,
  deployPlatformTerms,
  deployETOTerms,
  deployDurationTerms,
  deployShareholderRights,
} from "../helpers/deployContracts";
import {
  basicTokenTests,
  standardTokenTests,
  erc677TokenTests,
  deployTestErc677Callback,
  erc223TokenTests,
  expectTransferEvent,
  ZERO_ADDRESS,
  testWithdrawal,
  deployTestErc223Callback,
} from "../helpers/tokenTestCases";
import { eventValue } from "../helpers/events";
import roles from "../helpers/roles";
import createAccessPolicy from "../helpers/createAccessPolicy";
import { snapshotTokenTests } from "../helpers/snapshotTokenTestCases";
import { increaseTime } from "../helpers/evmCommands";

const EquityToken = artifacts.require("EquityToken");
const TestNullEquityTokenController = artifacts.require("TestNullEquityTokenController");
const TestSnapshotToken = artifacts.require("TestSnapshotToken"); // for cloning tests

contract("EquityToken", ([admin, nominee, company, broker, ...holders]) => {
  let equityToken;
  let equityTokenController;
  let accessPolicy;
  let universe;
  let platformTermsDict;
  let etoTerms, etoTermsDict;

  beforeEach(async () => {
    [universe, accessPolicy] = await deployUniverse(admin, admin);
    await createAccessPolicy(accessPolicy, [{ subject: admin, role: roles.reclaimer }]);
    [, platformTermsDict] = await deployPlatformTerms(universe, admin);
    const [shareholderRights] = await deployShareholderRights();
    const [durationTerms] = await deployDurationTerms();
    [etoTerms, etoTermsDict] = await deployETOTerms(durationTerms, shareholderRights);
    equityTokenController = await TestNullEquityTokenController.new(universe.address);
    equityToken = await EquityToken.new(
      universe.address,
      equityTokenController.address,
      etoTerms.address,
      nominee,
      company,
    );
    await equityToken.amendAgreement("AGREEMENT#HASH", { from: nominee });
  });

  describe("specific tests", () => {
    it("should deploy", async () => {
      await prettyPrintGasCost("EquityToken deploy", equityToken);
      // check properties of equity token
      expect(await equityToken.isTokenClosed()).to.be.false;
      expect(await equityToken.tokensPerShare()).to.be.bignumber.eq(
        platformTermsDict.EQUITY_TOKENS_PER_SHARE,
      );
      expect(await equityToken.shareNominalValueEurUlps()).to.be.bignumber.eq(
        etoTermsDict.SHARE_NOMINAL_VALUE_EUR_ULPS,
      );
      expect(await equityToken.equityTokenController()).to.be.bignumber.eq(
        equityTokenController.address,
      );
      expect(await equityToken.nominee()).to.be.bignumber.eq(nominee);
      expect(await equityToken.companyLegalRepresentative()).to.be.bignumber.eq(company);
    });

    it("should deposit", async () => {
      // remember: equity tokens are not divisible
      const initialBalance = 18201298;
      const tx = await equityToken.issueTokens(initialBalance, {
        from: holders[0],
      });
      expectLogTokensIssued(tx, holders[0], equityTokenController.address, initialBalance);
      expectTransferEvent(tx, ZERO_ADDRESS, holders[0], initialBalance);
      const totalSupply = await equityToken.totalSupply.call();
      expect(totalSupply).to.be.bignumber.eq(initialBalance);
      const balance = await equityToken.balanceOf(holders[0]);
      expect(balance).to.be.bignumber.eq(initialBalance);
    });

    it("should overflow on deposit");

    it("should withdraw");

    it("should close tokens"); // transfers are disabled no matter controller settings

    it("should change token controller");

    it("should change nominee");
  });

  describe("IEquityTokenController tests", () => {
    it("can block transfers");
    it("can block distribute");
    it("can block issueTokens");
    it("can block destroyTokens");
    it("can block closeToken");
    it("can block changing equity token controller");
    it("can block changing nominee");
  });

  describe("IBasicToken tests", () => {
    const initialBalance = new web3.BigNumber(5092819281);
    const getToken = () => equityToken;

    beforeEach(async () => {
      await equityToken.issueTokens(initialBalance, {
        from: holders[1],
      });
    });

    basicTokenTests(getToken, holders[1], holders[2], initialBalance);
  });

  describe("IERC20Allowance tests", () => {
    const initialBalance = new web3.BigNumber(71723919);
    const getToken = () => equityToken;

    beforeEach(async () => {
      await equityToken.issueTokens(initialBalance, {
        from: holders[1],
      });
    });

    standardTokenTests(getToken, holders[1], holders[2], broker, initialBalance);
  });

  describe("IERC677Token tests", () => {
    const initialBalance = new web3.BigNumber(438181);
    const getToken = () => equityToken;
    let erc667cb;
    const getTestErc667cb = () => erc667cb;

    beforeEach(async () => {
      await equityToken.issueTokens(initialBalance, {
        from: holders[1],
      });
      erc667cb = await deployTestErc677Callback();
    });

    erc677TokenTests(getToken, getTestErc667cb, holders[1], initialBalance);
  });

  describe("IERC223Token tests", () => {
    const initialBalance = new web3.BigNumber(438181);
    const getToken = () => equityToken;
    let erc223cb;
    const getTestErc223cb = () => erc223cb;

    beforeEach(async () => {
      erc223cb = await deployTestErc223Callback(true);
      await equityToken.issueTokens(initialBalance, {
        from: holders[1],
      });
    });

    erc223TokenTests(getToken, getTestErc223cb, holders[1], holders[2], initialBalance);
  });

  describe("withdrawal tests", () => {
    const initialBalance = new web3.BigNumber("79827398197221");
    const getToken = () => {
      // patch deposit and withdraw
      equityToken.withdraw = equityToken.destroyTokens;
      return equityToken;
    };

    beforeEach(async () => {
      await equityToken.issueTokens(initialBalance, {
        from: holders[1],
      });
    });

    testWithdrawal(getToken, holders[1], initialBalance, expectLogTokensDestroyedComp);
  });

  describe("ITokenSnapshots tests", () => {
    const getToken = () => {
      // patch deposit and withdraw
      equityToken.deposit = equityToken.issueTokens;
      equityToken.withdraw = equityToken.destroyTokens;
      return equityToken;
    };

    const advanceSnapshotId = async snapshotable => {
      // EquityToken is Daily so forward time to create snapshot
      await increaseTime(24 * 60 * 60);
      return snapshotable.currentSnapshotId.call();
    };

    const createClone = async (parentToken, parentSnapshotId) =>
      TestSnapshotToken.new(parentToken.address, parentSnapshotId);

    snapshotTokenTests(getToken, createClone, advanceSnapshotId, holders[1], holders[2], broker);
  });

  function expectLogTokensIssued(tx, owner, controller, amount) {
    const event = eventValue(tx, "LogTokensIssued");
    expect(event).to.exist;
    expect(event.args.holder).to.eq(owner);
    expect(event.args.controller).to.eq(controller);
    expect(event.args.amount).to.be.bignumber.eq(amount);
  }

  // eslint-disable-next-line no-unused-vars
  function expectLogTokensDestroyed(tx, owner, controller, amount) {
    const event = eventValue(tx, "LogTokensDestroyed");
    expect(event).to.exist;
    expect(event.args.holder).to.eq(owner);
    expect(event.args.controller).to.eq(controller);
    expect(event.args.amount).to.be.bignumber.eq(amount);
  }

  function expectLogTokensDestroyedComp(tx, owner, amount) {
    const event = eventValue(tx, "LogTokensDestroyed");
    expect(event).to.exist;
    expect(event.args.holder).to.eq(owner);
    expect(event.args.amount).to.be.bignumber.eq(amount);
  }
});
