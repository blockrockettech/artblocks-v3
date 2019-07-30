const {BN, constants, expectEvent, shouldFail, ether} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const {shouldBehaveLikeERC721} = require('./ERC721.behavior');
const SimpleArtistToken = artifacts.require('SimpleArtistToken.sol');

contract('ERC721', function ([_, creator, tokenOwner, other, artistAccount, ...accounts]) {

    const tokenURI = '123abc456def987';
    const tokenBaseUri = 'https://ipfs.com';
    let price;
    let firstTokenId;

    beforeEach(async function () {
        this.token = await SimpleArtistToken.new(other, new BN(1), tokenBaseUri, new BN(5), {from: creator});
        price = await this.token.pricePerTokenInWei();
    });

    shouldBehaveLikeERC721(creator, creator, accounts);

    describe('internal functions', function () {

        describe('purchaseTo(address, uint256)', function () {

            it('reverts with a null destination address', async function () {
                await shouldFail(
                    this.token.purchaseTo(ZERO_ADDRESS, {
                        from: creator,
                        value: price
                    }), 'ERC721: mint to the zero address'
                );
            });

            context('with minted token', async function () {
                beforeEach(async function () {
                    ({logs: this.logs} = await this.token.purchaseTo(tokenOwner, {from: creator, value: price}));

                    const tokens = await this.token.tokensOfOwner(tokenOwner);
                    tokens.length.should.be.equal(1);

                    firstTokenId = tokens[0];
                });

                it('emits a Transfer event', function () {
                    expectEvent.inLogs(this.logs, 'Transfer',
                        {from: ZERO_ADDRESS, to: tokenOwner, tokenId: firstTokenId}
                    );
                });

                it('creates the token', async function () {
                    (await this.token.balanceOf(tokenOwner)).should.be.bignumber.equal('1');
                    (await this.token.ownerOf(firstTokenId)).should.be.equal(tokenOwner);
                });
            });
        });

        // describe('_burn(uint256)', function () {
        //
        //     it('reverts when burning a non-existent token id', async function () {
        //         await shouldFail(
        //             this.token.methods['burn(uint256)'](firstTokenId), 'Owner query for nonexistent token'
        //         );
        //     });
        //
        //     context('with minted token', function () {
        //         beforeEach(async function () {
        //             await this.token.purchaseTo(tokenOwner, {from: creator});
        //
        //             const tokens = await this.token.tokensOfOwner(other);
        //             tokens.length.should.be.equal(1);
        //
        //             firstTokenId = tokens[0];
        //         });
        //
        //         context('with burnt token', function () {
        //             beforeEach(async function () {
        //                 ({logs: this.logs} = await this.token.methods['burn(uint256)'](firstTokenId, {from: tokenOwner}));
        //             });
        //
        //             it('emits a Transfer event', function () {
        //                 expectEvent.inLogs(this.logs, 'Transfer', {from: tokenOwner, to: ZERO_ADDRESS, firstTokenId});
        //             });
        //
        //             it('deletes the token', async function () {
        //                 (await this.token.balanceOf(tokenOwner)).should.be.bignumber.equal('0');
        //                 await shouldFail(
        //                     this.token.ownerOf(firstTokenId), 'ERC721: owner query for nonexistent token'
        //                 );
        //             });
        //
        //             it('reverts when burning a token id that has been deleted', async function () {
        //                 await shouldFail(
        //                     this.token.methods['burn(uint256)'](firstTokenId), 'ERC721: owner query for nonexistent token'
        //                 );
        //             });
        //         });
        //     });
        // });
    });
});
