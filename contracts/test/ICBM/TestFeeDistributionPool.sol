pragma solidity 0.4.24;

import "../../Standards/IERC677Callback.sol";
import "../../Standards/IERC677Token.sol";


contract TestFeeDistributionPool is IERC677Callback {

    ////////////////////////
    // Events
    ////////////////////////

    event LogTestReceiveApproval(
        address from,
        uint256 amount
    );

    ////////////////////////
    // Public functions
    ////////////////////////

    //
    // Implements IERC677Callback
    //

    function receiveApproval(
        address from,
        uint256 _amount,
        address _token,
        bytes // _data
    )
        public
        returns (bool)
    {
        require(msg.sender == _token);
        require(IERC677Token(_token).transferFrom(from, address(this), _amount));
        emit LogTestReceiveApproval(from, _amount);
        return true;
    }
}
