const {BN, constants, expectEvent, shouldFail, ether, balance, expect} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const { assert } = require('chai')

const SimpleArtistToken = artifacts.require('SimpleArtistToken.sol');

contract.only('SimpleArtistToken Tests', function ([_, creator, tokenOwnerOne, tokenOwnerTwo, artistAccountOne, artistAccountTwo, artistsAccount, ...accounts]) {

    const tokenURI = '123abc456def987';
    const tokenBaseUri = 'https://artblocks.com/';

    beforeEach(async function () {
        this.token = await SimpleArtistToken.new(artistsAccount, new BN(1), tokenBaseUri, {from: creator});
    });

    describe('constructor setup', async function () {
        it('name()', async function () {
            const name = await this.token.name();
            name.should.be.equal('SimpleArtistToken');
        });

        it('symbol()', async function () {
            const symbol = await this.token.symbol();
            symbol.should.be.equal('SAT');
        });

        it('artistAddress()', async function () {
            const artistAddress = await this.token.artistAddress();
            artistAddress.should.be.equal(artistsAccount);
        });

        it('pricePerTokenInWei()', async function () {
            const pricePerTokenInWei = await this.token.pricePerTokenInWei();
            pricePerTokenInWei.should.be.bignumber.equal('1');
        });
    });

    describe('purchaseTo()', async function () {

        it('should have token ID and hash', async function () {

            const {logs} = await this.token.purchaseTo(tokenOwnerOne, {from: creator});
            expectEvent.inLogs(logs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: tokenOwnerOne,
            });

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            tokens.length.should.be.equal(1);

            const tokenId = tokens[0].toString();
            assert.isNotNull(tokenId);

            const hash = await this.token.tokenIdToHash(tokenId);
            assert.isNotNull(hash);
        });

        // split funds check
    });

    context('ensure only owner can set base URI', function () {
        it('should revert if empty', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseURI('', {from: creator}));
        });

        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseURI('fc.xyz', {from: tokenOwnerOne}));
        });

        it('should reset if owner', async function () {
            const {logs} = await this.token.updateTokenBaseURI('http://hello', {from: creator});
            expectEvent.inLogs(
                logs,
                `TokenBaseURIChanged`,
                {_new: 'http://hello'}
            );
            (await this.token.tokenBaseURI()).should.be.equal('http://hello');
        });
    });

    context('ensure only owner can base IPFS URI', function () {
        it('should revert if empty', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseIpfsURI('', {from: creator}));
        });

        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseIpfsURI('fc.xyz', {from: tokenOwnerOne}));
        });

        it('should reset if owner', async function () {
            const {logs} = await this.token.updateTokenBaseIpfsURI('http://hello', {from: creator});
            expectEvent.inLogs(
                logs,
                `TokenBaseIPFSURIChanged`,
                {_new: 'http://hello'}
            );
            (await this.token.tokenBaseIpfsURI()).should.be.equal('http://hello');
        });
    });

    context('static and dynamic IPFS images', function () {

        const staticIpfsHash = "123-abc-456-def";
        let firstTokenId;

        beforeEach(async function () {
            await this.token.purchaseTo(tokenOwnerOne, {from: tokenOwnerOne});

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            tokens.length.should.be.equal(1);

            firstTokenId = tokens[0].toString();
        });

        context('if whitelisted', function () {
            it('can set static IPFS hash', async function () {
                const {logs} = await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                expectEvent.inLogs(
                    logs,
                    `StaticIpfsTokenURISet`,
                    {
                        _tokenId: firstTokenId,
                        _ipfsHash: staticIpfsHash
                    }
                );
            });

            it('can remove static IPFS hash', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                const {logs} = await this.token.clearIpfsImageUri(firstTokenId, {from: creator});
                expectEvent.inLogs(
                    logs,
                    `StaticIpfsTokenURICleared`,
                    {
                        _tokenId: firstTokenId
                    }
                );
            });
        });

        context('if not whitelisted', function () {
            it('cannot set static IPFS hash', async function () {
                await shouldFail.reverting(this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: tokenOwnerOne}));
            });

            it('cannot remove static IPFS hash', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                await shouldFail.reverting(this.token.clearIpfsImageUri(firstTokenId, {from: tokenOwnerOne}));
            });
        });

        context('when calling tokenURI()', function () {

            it('will use static IPFS hash if found', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                const tokenURI = await this.token.tokenURI(firstTokenId);
                tokenURI.should.be.equal("https://ipfs.infura.io/ipfs/123-abc-456-def");
            });

            it('will go back to using dynamic  URI if static set and then cleared', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                const newTokenURI = await this.token.tokenURI(firstTokenId);
                newTokenURI.should.be.equal("https://ipfs.infura.io/ipfs/123-abc-456-def");

                await this.token.clearIpfsImageUri(firstTokenId, {from: creator});
                const resetTokenURI = await this.token.tokenURI(firstTokenId);
                resetTokenURI.should.be.equal(`https://artblocks.com/${firstTokenId}`);
            });
        });

    });


    async function getGasCosts (receipt) {
        let tx = await web3.eth.getTransaction(receipt.tx);
        let gasPrice = new BN(tx.gasPrice);
        return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
});
