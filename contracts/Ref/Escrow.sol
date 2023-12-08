// SPDX-License-Identifier: MIT
// pragma solidity 0.8.4;

// contract Escrow {

//     address public depositor;
//     address public beneficiary;
//     address public arbiter;
//     bool public isApproved;

//     constructor(address _arbiter, address _beneficiary) payable
//     {
//         arbiter = _arbiter;
//         beneficiary = _beneficiary;
//         depositor = msg.sender;
//         isApproved = false;

//     }
   
//     event Approved(uint _balance);
//     function  approve() external
//     {
//         require(msg.sender == arbiter);
//         uint _balance = address(this).balance;
//         (bool sent, ) = beneficiary.call{ value: _balance }("");
//         require(sent, "Failed to send ether");
//         isApproved = true;
//         emit Approved(_balance);


//     }
    
// }