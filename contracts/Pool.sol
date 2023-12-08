// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract Pool {

    uint public eventTimeStamp;

    mapping(address => bool) public members;
    Present[] public presentsArray;
    uint[] public presentIds;
    mapping(uint => mapping(address => uint)) public amountSent; // presentId -> donor -> amount

    uint public totalPresents;

    modifier onlyMembers() {
        require(members[msg.sender], "Must be member to call this function");
        _;
    }

    modifier presentMustExist(uint256 _presentId) {
        require(presentExists(_presentId), "Present does not exist"); //Check if present exists
        _;
    }

    struct Present {
        uint256 presentId; //ID for present
        address holder; //Owner of Escrow contract that will hold the amount
        address receiver; //receiver of the present
        uint256 presentSendDate; //Date present will be sent
        uint totalPooled; // Amount that will be sent to receiver
        address[] donors; // Addresses that participated on gift
        bool isSent; //Shows if present has been sent
        
    }

    event CreatedPresent(uint presentId, uint when, address who);
    event AddedAmountToPresent(uint amount, uint when, address who);
    event SentPresent(uint amount, uint when, address who);
    event AddMember(address whoAdded, address _newMember, uint when);


    constructor(address[] memory _members) payable {
        for(uint i = 0; i < _members.length; i++) {
            members[_members[i]] = true;
        }
        members[msg.sender] = true;
        totalPresents = 0;
    }

    function createPresent(address _holder, address _receiver, uint256 _presentSendDate) onlyMembers() public {
        
        require((_holder != _receiver), "Receiver cannot hold the funds!");

        address[] memory _donors;
        uint _presentId = totalPresents;
        totalPresents++;
        presentsArray.push(Present({
                presentId: _presentId,
                holder: _holder, 
                receiver: _receiver,
                presentSendDate: _presentSendDate,
                totalPooled: 0,
                isSent: false,
                donors: _donors
            }));
        presentIds.push(_presentId);
        emit CreatedPresent(_presentId, block.timestamp, msg.sender);
    }

    function addAmount(uint256 _presentId) onlyMembers() presentMustExist(_presentId) payable public {

        require(msg.value > 0, "Amount added must be above 0!");
        require(presentsArray[_presentId].isSent == false, "Present has already been sent!"); //Check if present was already sent


        amountSent[_presentId][msg.sender] += msg.value; //Update amountSent by donor
        presentsArray[_presentId].totalPooled += msg.value; //Update totalPooled
        presentsArray[_presentId].donors.push(msg.sender);

        emit AddedAmountToPresent(msg.value, block.timestamp, msg.sender);
    }

     function sendPresent(uint _presentId) onlyMembers() presentMustExist(_presentId) public {

        //var declaration
        address holder = presentsArray[_presentId].holder;
        address receiver = presentsArray[_presentId].receiver;

        //requirements
        require(holder == msg.sender, "Holder of amount pooled must be sender!"); //holder is the one who sends present
	    require(block.timestamp >= presentsArray[_presentId].presentSendDate, "Trying to send the present too early!"); //date must be adequate for sending
        require(presentsArray[_presentId].isSent == false, "Present has already been sent!");

        
        //send amount
		(bool success, ) = receiver.call{ value: presentsArray[_presentId].totalPooled }("");
        // console.log("address: ");
        // console.log(address(this).balance);

		require(success, "Failed to send amount");

        presentsArray[_presentId].isSent = true;

        emit SentPresent(_presentId, block.timestamp, msg.sender);
	}

    function addMember(address _newMember) onlyMembers() public {
        require(!members[_newMember], "New member cannot be duplicate of previous member!");
        members[_newMember] = true;
        emit AddMember(msg.sender, _newMember, block.timestamp);
    }

    function presentExists(uint _presentId) public view returns (bool) {
        for (uint i = 0; i < presentIds.length; i++) {
            if (presentIds[i] == _presentId) {
                return true;
            }
        }

        return false;
    }

    function getPresentIds() public view returns(uint[] memory) {
        return presentIds;
    }

    function getPresentById(uint _presentId) public view returns(Present memory _present) {
        return presentsArray[_presentId];
    }

    
}
