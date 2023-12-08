const { loadFixture, time, setBalance} = require('@nomicfoundation/hardhat-network-helpers');
const { expect, assert } = require('chai');


describe('Pool', function () {

    async function deployContractAndSetVariables() {

        const currentTimestampInSeconds = Math.round(Date.now() / 1000);
        const unlockTime = currentTimestampInSeconds + 60;

        const provider = ethers.provider;
        const [holder, member1, member2, nonMember, newMember] = await ethers.getSigners();
        const memberArray = [holder, member1, member2];

        let _addrMember1 = await member1.getAddress();
        let _addrMember2 = await member2.getAddress();
        let _addrMemberHolder = await holder.getAddress();

        const Pool = await ethers.getContractFactory("Pool");
        const poolContract = await Pool.deploy([_addrMember1, _addrMember2, _addrMemberHolder]);


        return {poolContract, holder, member1, member2, nonMember, newMember, memberArray, unlockTime, currentTimestampInSeconds}
    }

    async function createValidPresent() {

        const { poolContract, holder, member1, member2, nonMember, newMember, memberArray, unlockTime, currentTimestampInSeconds} = await loadFixture(deployContractAndSetVariables);
        await poolContract.connect(holder).createPresent(holder, member1, unlockTime);
        return {poolContract, holder, member1, member2, nonMember, newMember, memberArray, unlockTime, currentTimestampInSeconds}
    }

    async function addValidAmount() {

        const { poolContract, holder, member1, member2, nonMember, newMember, memberArray, unlockTime, currentTimestampInSeconds} = await loadFixture(createValidPresent);

        const initialMember1balance = await ethers.provider.getBalance(member1.address);
        const addedAmount = ethers.parseEther("2.0");

        await poolContract.connect(member2).addAmount(0, {value: addedAmount});

        return {poolContract, holder, member1, member2, nonMember, newMember, memberArray, unlockTime, currentTimestampInSeconds, initialMember1balance, addedAmount}
    }

    describe('Check constructor initialization', () => {

        it('Members array should match', async function () {
            const { poolContract, memberArray } = await loadFixture(deployContractAndSetVariables);
            for (let i = 0; i < memberArray.length; i++) {
                    assert(await poolContract.members(memberArray[i]));
                }
            });

        it('TotalPresents should be 0', async function () {
            const { poolContract } = await loadFixture(deployContractAndSetVariables);
        
            expect(await poolContract.totalPresents()).to.equal(0);
          });   
        });

    describe('Add new Member', () => {

        it('Adding duplicate member should fail', async function () {
            const { poolContract, holder, member1 } = await loadFixture(deployContractAndSetVariables);
            let ex;
            try {await poolContract.connect(holder).addMember(member1);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Adding duplicate member should fail': " + ex);

            assert(ex, "Attempted to add duplicate member, should fail!");
        });

        it('Non member should not be able to add members', async function () {
            const { poolContract, newMember, nonMember} = await loadFixture(deployContractAndSetVariables);
            let ex;
            try {await poolContract.connect(nonMember).addMember(newMember);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Non member should not be able to add members': " + ex);

            assert(ex, "Attempted to add member without being a member already, should fail!");
        });

        it('New member should be added', async function () {
            const { poolContract, newMember, holder } = await loadFixture(deployContractAndSetVariables);
            await poolContract.connect(holder).addMember(newMember);
            assert(await poolContract.members(newMember));
        });

        it('Should emit an `AddMember` event', async function () {
            const { poolContract, newMember, holder } = await loadFixture(deployContractAndSetVariables);
            await expect(poolContract.connect(holder).addMember(newMember))
            .to.emit(poolContract, "AddMember");
        });

    });

    describe('Create Present', () => {
        
        it('Create valid present', async function () {
            const { poolContract} = await loadFixture(createValidPresent);

            expect(await poolContract.totalPresents()).to.equal(1), "TotalPresents variable did not get updated";
            expect(await getArrayLength(poolContract.presentsArray)).to.equal(1), "presentArray variable did not get updated";
            expect(await getArrayLength(poolContract.presentIds)).to.equal(1), "presentIds variable did not get updated";

          });

        it('Emit CreatedPresent Event', async function () {
            const {poolContract, holder, member1, unlockTime} = await loadFixture(deployContractAndSetVariables);
            await expect(poolContract.connect(holder).createPresent(holder, member1, unlockTime)).to.emit(poolContract, "CreatedPresent");
          });

        it('Should fail same receiver as holder', async function () {
            const {poolContract, holder, unlockTime} = await loadFixture(deployContractAndSetVariables);
            let ex;
            try {await poolContract.connect(holder).createPresent(holder, holder, unlockTime);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Should fail same receiver as holder': " + ex);

            assert(ex, "Attempted same holder as receiver, should fail!");
          });

        it('Non member should not be able to create present', async function () {
            const { poolContract, holder, unlockTime, nonMember, member1} = await loadFixture(deployContractAndSetVariables);
            let ex;
            try {await poolContract.connect(nonMember).createPresent(holder, member1, unlockTime);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Non member should not be able to create present': " + ex);

            assert(ex, "Attempted to create present without being a member already, should fail!");
          });
        

    });

    describe('Add Amount', () => {

        
        it('Add amount to present', async function () {
            const { poolContract, member1} = await loadFixture(createValidPresent);
            await poolContract.connect(member1).addAmount(0, {value: ethers.parseEther("2.0")});
            const present = await poolContract.presentsArray(0);
            expect(present.totalPooled).to.equal(ethers.parseEther("2.0")), "Amount was not updated";
          });

        it('Emit AddedAmountToPresent Event', async function () {
            const {poolContract, member1} = await loadFixture(createValidPresent);
            await expect(poolContract.connect(member1).addAmount(0, {value: ethers.parseEther("2.0")})).to.emit(poolContract, "AddedAmountToPresent");
            
          });

        it('Revert on non existent present', async function () {
            const {poolContract, member1} = await loadFixture(createValidPresent);
            let ex;
            try {await poolContract.connect(member1).addAmount(1, {value: ethers.parseEther("2.0")});} //Present with id 1 does not exist
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on non existent present': " + ex);

            assert(ex, "Attempted to send present that does not exist, should fail!");

          });

        it('Revert on trying to add amount to sent present', async function () {
            const {poolContract, holder, member1} = await loadFixture(createValidPresent);
            await time.increase(60);
            await poolContract.connect(holder).sendPresent(0); //sent 1st time
            let ex;
            try {await poolContract.connect(member1).addAmount(0, {value: ethers.parseEther("2.0")});} //sent 2nd time
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on trying to add amount to sent present': " + ex);

            assert(ex, "Attempted to send present twice, should fail!");
          });

        it('Revert on trying to add 0 amount', async function () {
            const {poolContract, holder, member1} = await loadFixture(createValidPresent);
            let ex;
            try {await poolContract.connect(member1).addAmount(0, {value: ethers.parseEther("0")});}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on trying to add 0 amount': " + ex);

            assert(ex, "Attempted to send 0 amount, should fail!");
          });

        it('Revert on non member attempting to add amount', async function () {
            const {poolContract, nonMember} = await loadFixture(createValidPresent);
            let ex;
            try {await poolContract.connect(nonMember).addAmount(1, {value: ethers.parseEther("2.0")});}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on non member attempting to add amount': " + ex);

            assert(ex, "Revert on non member attempting to add amount, should fail!");
          });

    });

    describe('Send Present', () => {
        it('Send valid present', async function () {
            const { poolContract, holder, member1, initialMember1balance, addedAmount} = await loadFixture(addValidAmount);
            await time.increase(60);
            await poolContract.connect(holder).sendPresent(0);

            const balance = await ethers.provider.getBalance(member1.address);
            const expectedBalance = initialMember1balance + addedAmount;
            assert.equal(balance.toString(), expectedBalance.toString());

          });

        it('Emit SentPresent Event', async function () {
            const {poolContract, holder} = await loadFixture(addValidAmount);
            await time.increase(60);
            await expect(poolContract.connect(holder).sendPresent(0)).to.emit(poolContract, "SentPresent");
          });

        it('Revert on Present sent too early', async function () {
            const {poolContract, holder} = await loadFixture(addValidAmount);
            let ex;
            try {await poolContract.connect(holder).sendPresent(0);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on Present sent too early': " + ex);

            assert(ex, "Attempted to send present too early, should fail!");
          });

        it('Revert on non existent present', async function () {
            const {poolContract, holder} = await loadFixture(addValidAmount);
            await time.increase(60);
            let ex;
            try {await poolContract.connect(holder).sendPresent(1);} //Present with id 1 does not exist
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on non existent present': " + ex);

            assert(ex, "Attempted to send present that does not exist, should fail!");
          });

        it('Revert on msg sender not being holder', async function () {
            const {poolContract, member1} = await loadFixture(addValidAmount);
            await time.increase(60);
            let ex;
            try {await poolContract.connect(member1).sendPresent(0);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on msg sender not being holder': " + ex);

            assert(ex, "Attempted to send present not being holder, should fail!");
          });

        it('Revert on trying to send present twice', async function () {
            const {poolContract, holder} = await loadFixture(addValidAmount);
            await time.increase(60);
            await poolContract.connect(holder).sendPresent(0); //sent 1st time
            let ex;
            try {await poolContract.connect(holder).sendPresent(0);} //sent 2nd time
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on trying to send present twice': " + ex);

            assert(ex, "Attempted to send present twice, should fail!");
          });

        it('Revert on non member attempting to send', async function () {
            const {poolContract, nonMember} = await loadFixture(addValidAmount);
            await time.increase(60);
            let ex;
            try {await poolContract.connect(nonMember).sendPresent(0);}
            catch(_ex) {ex = _ex;}

            console.log("ERRORLOG for 'Revert on non member attempting to send': " + ex);

            assert(ex, "Revert on non member attempting to send, should fail!");
          });
        

    });

    async function getArrayLength(getterFn) {
        let _length = 0;
        try {
            for (i = 0; ; i++) {
                await getterFn(i);
                _length++;
            }
        }
        catch (ex) {}
        return _length;
    }

});