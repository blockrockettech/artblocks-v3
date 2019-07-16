const {BN, constants, expectEvent, shouldFail, ether, balance} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const SimpleArtistToken = artifacts.require('SimpleArtistToken.sol');

contract.only('SimpleArtistToken Tests', function ([_, creator, tokenOwnerOne, tokenOwnerTwo, artistAccountOne, artistAccountTwo, artistsAccount, ...accounts]) {

    const tokenURI = '123abc456def987';
    const editionPrice = ether('1');

    beforeEach(async function () {
        this.token = await SimpleArtistToken.new(artistsAccount, new BN(1), {from: creator});
    });

    describe('name() and symbol()', async function () {
        it('name()', async function () {
            const name = await this.token.name();
            name.should.be.equal('SimpleArtistToken');
        });
        it('symbol()', async function () {
            const symbol = await this.token.symbol();
            symbol.should.be.equal('SAT');
        });
    });

    describe('purchaseTo()', async function () {
        beforeEach(async function () {
            await this.token.purchaseTo(tokenOwnerOne, {from: creator});
            await this.token.purchaseTo(tokenOwnerOne, {from: creator});
        });

        it('should have token ID and blockhash', async function () {

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            console.log(tokens[0].toString());
            console.log(await this.token.tokenIdToBlockhash(tokens[0].toString()));

            console.log(await this.token.tokenIdToBlockhash(tokens[1].toString()));
            console.log(tokens[1].toString());
        });

    });

    //
    // describe('adminBurn()', async function () {
    //
    //     const editionId = new BN('1000');
    //     const buyer = tokenOwnerOne;
    //
    //     beforeEach(async function () {
    //         await this.token.createEdition(
    //             new BN('1'),
    //             editionPrice,
    //             new BN('50'),
    //             artistAccountOne,
    //             tokenURI,
    //             {from: creator}
    //         );
    //     });
    //
    //     it('can burn token as admin when not owner', async function () {
    //         const tokenId = new BN('1000');
    //
    //         const {logs} = await this.token.purchaseTo(buyer, editionId, {from: buyer, value: ether('1')});
    //         expectEvent.inLogs(logs, 'Transfer', {
    //             from: ZERO_ADDRESS,
    //             to: buyer,
    //             tokenId: tokenId
    //         });
    //
    //         const tokenOwner = await this.token.ownerOf(tokenId);
    //         tokenOwner.should.be.equal(buyer);
    //
    //         let balanceOf = await this.token.balanceOf(buyer);
    //         balanceOf.should.be.bignumber.equal('1');
    //
    //         let tokensOfOwner = await this.token.tokensOfOwner(buyer);
    //         tokensOfOwner.map(val => val.toString()).should.be.deep.equal([tokenId.toString()]);
    //
    //         await this.token.adminBurn(tokenId, {from: creator});
    //
    //         await shouldFail.reverting(
    //             this.token.ownerOf(tokenId)
    //         );
    //
    //         balanceOf = await this.token.balanceOf(buyer);
    //         balanceOf.should.be.bignumber.equal('0');
    //
    //         tokensOfOwner = await this.token.tokensOfOwner(buyer);
    //         tokensOfOwner.should.be.deep.equal([]);
    //     });
    //
    // });

    async function getGasCosts (receipt) {
        let tx = await web3.eth.getTransaction(receipt.tx);
        let gasPrice = new BN(tx.gasPrice);
        return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
});
