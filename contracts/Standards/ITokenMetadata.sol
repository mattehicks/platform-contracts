pragma solidity 0.4.24;


contract ITokenMetadata {

    ////////////////////////
    // Public functions
    ////////////////////////

    function symbol()
        public
        constant
        returns (string);

    function name()
        public
        constant
        returns (string);

    function decimals()
        public
        constant
        returns (uint8);
}
