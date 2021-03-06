pragma solidity 0.4.24;

import "./Math.sol";


/// @title set terms of Platform (investor's network) of the ETO
contract PlatformTerms is Math {

    ////////////////////////
    // Constants
    ////////////////////////

    // fraction of fee deduced on successful ETO (see Math.sol for fraction definition)
    uint256 public constant PLATFORM_FEE_FRACTION = 3 * 10**16;
    // fraction of tokens deduced on succesful ETO
    uint256 public constant TOKEN_PARTICIPATION_FEE_FRACTION = 2 * 10**16;
    // share of Neumark reward platform operator gets
    // actually this is a divisor that splits Neumark reward in two parts
    // the results of division belongs to platform operator, the remaining reward part belongs to investor
    uint256 public constant PLATFORM_NEUMARK_SHARE = 2; // 50:50 division
    // ICBM investors whitelisted by default
    bool public constant IS_ICBM_INVESTOR_WHITELISTED = true;
    // equity tokens per share
    uint256 public constant EQUITY_TOKENS_PER_SHARE = 1000000; // move it to platform
    // equity tokens decimals (precision)
    uint8 public constant EQUITY_TOKENS_PRECISION = 0; // indivisible

    // minimum ticket size Platform accepts in EUR ULPS
    uint256 public constant MIN_TICKET_EUR_ULPS = 300 * 10**18;
    // maximum ticket size Platform accepts in EUR ULPS
    // no max ticket in general prospectus regulation
    // uint256 public constant MAX_TICKET_EUR_ULPS = 10000000 * 10**18;
    // maximum ticket size for sophisiticated investor under crowdfunding regulations
    uint256 public constant MAX_TICKET_CROWFUNDING_SOPHISTICATED_EUR_ULPS = 10000 * 10**18;
    // maximum ticket size for simple investor under crowdfunding regulations
    uint256 public constant MAX_TICKET_CROWFUNDING_SIMPLE_EUR_ULPS = 1000 * 10**18;
    // maximum raised amount for crowdfunding regulation
    uint256 public constant MAX_TOTAL_AMOUNT_CROWDFUNDING_EUR_ULPS = 2500000 * 10**18;

    // min duration from setting the date to ETO start
    uint256 public constant DATE_TO_WHITELIST_MIN_DURATION = 3 days;

    // duration constraints
    uint256 public constant MIN_WHITELIST_DURATION_DAYS = 0 days;
    uint256 public constant MAX_WHITELIST_DURATION_DAYS = 60 days;
    uint256 public constant MIN_PUBLIC_DURATION_DAYS = 0 days;
    uint256 public constant MAX_PUBLIC_DURATION_DAYS = 60 days;

    // minimum length of whole offer
    uint256 public constant MIN_OFFER_DURATION_DAYS = 1 days;
    // quarter should be enough for everyone
    uint256 public constant MAX_OFFER_DURATION_DAYS = 90 days;

    uint256 public constant MIN_SIGNING_DURATION_DAYS = 14 days;
    uint256 public constant MAX_SIGNING_DURATION_DAYS = 30 days;

    uint256 public constant MIN_CLAIM_DURATION_DAYS = 7 days;
    uint256 public constant MAX_CLAIM_DURATION_DAYS = 30 days;

    ////////////////////////
    // Public Function
    ////////////////////////

    // calculates investor's and platform operator's neumarks from total reward
    function calculateNeumarkDistribution(uint256 rewardNmk)
        public
        pure
        returns (uint256 platformNmk, uint256 investorNmk)
    {
        // round down - platform may get 1 wei less than investor
        platformNmk = rewardNmk / PLATFORM_NEUMARK_SHARE;
        // rewardNmk > platformNmk always
        return (platformNmk, rewardNmk - platformNmk);
    }

    function calculatePlatformTokenFee(uint256 tokenAmount)
        public
        pure
        returns (uint256)
    {
        // mind tokens having 0 precision
        return proportion(tokenAmount, TOKEN_PARTICIPATION_FEE_FRACTION, 10**18);
    }

    function calculatePlatformFee(uint256 amount)
        public
        pure
        returns (uint256)
    {
        return decimalFraction(amount, PLATFORM_FEE_FRACTION);
    }
}
