const {BN, constants, expectEvent, shouldFail, ether, balance, expect} = require('openzeppelin-test-helpers');
const {ZERO_ADDRESS} = constants;

const {assert} = require('chai');

const SimpleArtistToken = artifacts.require('SimpleArtistToken.sol');

contract.only('SimpleArtistToken Tests', function ([_, creator, tokenOwnerOne, tokenOwnerTwo, artistAccountOne, artistAccountTwo, artistsAccount, ...accounts]) {

    const tokenURI = '123abc456def987';
    const tokenBaseUri = 'https://artblocks.com/';
    let price;

    beforeEach(async function () {
        this.token = await SimpleArtistToken.new(artistsAccount, new BN(100), tokenBaseUri, new BN(5), {from: creator});
        price = await this.token.pricePerTokenInWei();
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
            pricePerTokenInWei.should.be.bignumber.equal('100');
        });
    });

    describe('purchaseTo()', async function () {

        it('should have token ID and hash', async function () {

            const {logs} = await this.token.purchaseTo(tokenOwnerOne, {from: creator, value: price});
            expectEvent.inLogs(logs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: tokenOwnerOne,
            });

            (await this.token.invocations()).should.be.bignumber.equal('1');

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            tokens.length.should.be.equal(1);

            const tokenId = tokens[0].toString();
            assert.isNotNull(tokenId);

            const hash = await this.token.tokenIdToHash(tokenId);
            assert.isNotNull(hash);
        });

        it('reverts once max invocations reached', async function () {
            await this.token.updateMaxInvocations(new BN(2), {from: creator});

            await this.token.purchaseTo(tokenOwnerOne, {from: creator, value: price});
            await this.token.purchaseTo(tokenOwnerOne, {from: creator, value: price});
            await shouldFail.reverting(this.token.purchaseTo(tokenOwnerOne, {from: creator, value: price}));
        });

        describe('splitFunds', function () {

            it('all parties get the correct amounts', async function () {
                const artblocksAddress = await this.token.artblocksAddress();
                const artblocksPercentage = await this.token.artblocksPercentage();
                const artistAddress = await this.token.artistAddress();

                const artblocksAddressWallet = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWallet = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWallet = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const receipt = await this.token.purchaseTo(tokenOwnerOne, {
                    from: tokenOwnerOne,
                    value: price
                });
                const gasCosts = await getGasCosts(receipt);

                const artblocksAddressWalletAfter = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWalletAfter = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWalletAfter = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const foundationSplit = price.div(new BN(100)).mul(artblocksPercentage);
                const artistSplit = price.sub(foundationSplit);

                // 95% of value sent
                artistAddressWalletAfter.should.be.bignumber.equal(artistAddressWallet.add(artistSplit));

                // 5% of current
                artblocksAddressWalletAfter.should.be.bignumber.equal(artblocksAddressWallet.add(foundationSplit));

                // check refund is applied and only pay for current price, not the overpay
                purchaserWalletAfter.should.be.bignumber.equal(purchaserWallet.sub(gasCosts).sub(price));
            });

            it('all parties get the correct amounts when artblock percentage is zero (therefore gets nothing)', async function () {

                await this.token.updateArtblocksPercentage(new BN(0), {from: creator});
                (await this.token.artblocksPercentage()).should.be.bignumber.equal(new BN(0));

                const artblocksAddress = await this.token.artblocksAddress();
                const artistAddress = await this.token.artistAddress();

                const artblocksAddressWallet = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWallet = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWallet = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const receipt = await this.token.purchaseTo(tokenOwnerOne, {
                    from: tokenOwnerOne,
                    value: price
                });
                const gasCosts = await getGasCosts(receipt);

                const artblocksAddressWalletAfter = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWalletAfter = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWalletAfter = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const foundationSplit = new BN(0);
                const artistSplit = price.sub(foundationSplit);

                // 100% of value sent
                artistAddressWalletAfter.should.be.bignumber.equal(artistAddressWallet.add(artistSplit));

                // 0% of current
                artblocksAddressWalletAfter.should.be.bignumber.equal(artblocksAddressWallet);

                // check refund is applied and only pay for current price, not the overpay
                purchaserWalletAfter.should.be.bignumber.equal(purchaserWallet.sub(gasCosts).sub(price));
            });

            it('all parties get the correct amounts when overpaid (same rules apply)', async function () {

                const overpay = price.add(new BN(100));

                const artblocksAddress = await this.token.artblocksAddress();
                const artblocksPercentage = await this.token.artblocksPercentage();
                const artistAddress = await this.token.artistAddress();

                const artblocksAddressWallet = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWallet = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWallet = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const receipt = await this.token.purchaseTo(tokenOwnerOne, {
                    from: tokenOwnerOne,
                    value: overpay
                });
                const gasCosts = await getGasCosts(receipt);

                const artblocksAddressWalletAfter = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWalletAfter = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWalletAfter = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const foundationSplit = overpay.div(new BN(100)).mul(artblocksPercentage);
                const artistSplit = overpay.sub(foundationSplit);

                // 95% of value sent
                artistAddressWalletAfter.should.be.bignumber.equal(artistAddressWallet.add(artistSplit));

                // 5% of current
                artblocksAddressWalletAfter.should.be.bignumber.equal(artblocksAddressWallet.add(foundationSplit));

                // check refund is applied and only pay for current price, not the overpay
                purchaserWalletAfter.should.be.bignumber.equal(purchaserWallet.sub(gasCosts).sub(overpay));
            });
        });

    });


    describe('default payable function()', async function () {

        it('should have token ID and hash', async function () {
            (await this.token.invocations()).should.be.bignumber.equal('0');

            await this.token.send(price, {from: tokenOwnerOne});

            (await this.token.invocations()).should.be.bignumber.equal('1');

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            tokens.length.should.be.equal(1);

            const tokenId = tokens[0].toString();
            assert.isNotNull(tokenId);

            const hash = await this.token.tokenIdToHash(tokenId);
            assert.isNotNull(hash);
        });

        describe('splitFunds (on default payable)', function () {

            it('all parties get the correct amounts', async function () {
                const artblocksAddress = await this.token.artblocksAddress();
                const artblocksPercentage = await this.token.artblocksPercentage();
                const artistAddress = await this.token.artistAddress();

                const artblocksAddressWallet = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWallet = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWallet = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const receipt = await this.token.send(price, {from: tokenOwnerOne});
                const gasCosts = await getGasCosts(receipt);

                const artblocksAddressWalletAfter = new BN((await web3.eth.getBalance(artblocksAddress)));
                const artistAddressWalletAfter = new BN((await web3.eth.getBalance(artistAddress)));
                const purchaserWalletAfter = new BN((await web3.eth.getBalance(tokenOwnerOne)));

                const foundationSplit = price.div(new BN(100)).mul(artblocksPercentage);
                const artistSplit = price.sub(foundationSplit);

                // 95% of value sent
                artistAddressWalletAfter.should.be.bignumber.equal(artistAddressWallet.add(artistSplit));

                // 5% of current
                artblocksAddressWalletAfter.should.be.bignumber.equal(artblocksAddressWallet.add(foundationSplit));

                // check refund is applied and only pay for current price, not the overpay
                purchaserWalletAfter.should.be.bignumber.equal(purchaserWallet.sub(gasCosts).sub(price));
            });
        });

    });

    describe('ensure only owner can set base URI', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseURI('fc.xyz', {from: tokenOwnerOne}));
        });

        it('should reset if owner', async function () {
            await this.token.updateTokenBaseURI('http://hello', {from: creator});
            (await this.token.tokenBaseURI()).should.be.equal('http://hello');
        });
    });

    describe('ensure only owner can base IPFS URI', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateTokenBaseIpfsURI('fc.xyz', {from: tokenOwnerOne}));
        });

        it('should reset if owner', async function () {
            await this.token.updateTokenBaseIpfsURI('http://hello', {from: creator});
            (await this.token.tokenBaseIpfsURI()).should.be.equal('http://hello');
        });
    });

    describe('static and dynamic IPFS images', function () {

        const staticIpfsHash = '123-abc-456-def';
        let firstTokenId;

        beforeEach(async function () {
            await this.token.purchaseTo(tokenOwnerOne, {from: tokenOwnerOne, value: price});

            const tokens = await this.token.tokensOfOwner(tokenOwnerOne);
            tokens.length.should.be.equal(1);

            firstTokenId = tokens[0].toString();
        });

        describe('if whitelisted', function () {
            it('can set static IPFS hash', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                (await this.token.tokenURI(firstTokenId)).should.be.equal('https://ipfs.infura.io/ipfs/123-abc-456-def');
            });

            it('can remove static IPFS hash', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                await this.token.clearIpfsImageUri(firstTokenId, {from: creator});
                (await this.token.tokenURI(firstTokenId)).should.be.equal(`https://artblocks.com/${firstTokenId}`);
            });
        });

        describe('if not whitelisted', function () {
            it('cannot set static IPFS hash', async function () {
                await shouldFail.reverting(this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: tokenOwnerOne}));
            });

            it('cannot remove static IPFS hash', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                await shouldFail.reverting(this.token.clearIpfsImageUri(firstTokenId, {from: tokenOwnerOne}));
            });
        });

        describe('when calling tokenURI()', function () {

            it('will use static IPFS hash if found', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                const tokenURI = await this.token.tokenURI(firstTokenId);
                tokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123-abc-456-def');
            });

            it('will go back to using dynamic  URI if static set and then cleared', async function () {
                await this.token.overrideDynamicImageWithIpfsLink(firstTokenId, staticIpfsHash, {from: creator});
                const newTokenURI = await this.token.tokenURI(firstTokenId);
                newTokenURI.should.be.equal('https://ipfs.infura.io/ipfs/123-abc-456-def');

                await this.token.clearIpfsImageUri(firstTokenId, {from: creator});
                const resetTokenURI = await this.token.tokenURI(firstTokenId);
                resetTokenURI.should.be.equal(`https://artblocks.com/${firstTokenId}`);
            });
        });
    });

    describe('ensure only owner can ArtistAddress', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateArtistAddress(tokenOwnerOne, {from: tokenOwnerOne}));
        });

        it('should update if owner', async function () {
            await this.token.updateArtistAddress(tokenOwnerOne, {from: creator});
            (await this.token.artistAddress()).should.be.equal(tokenOwnerOne);
        });
    });

    describe('ensure only owner can PricePerTokenInWei', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updatePricePerTokenInWei(new BN(2), {from: tokenOwnerOne}));
        });

        it('should update if owner', async function () {
            await this.token.updatePricePerTokenInWei(new BN(2), {from: creator});
            (await this.token.pricePerTokenInWei()).should.be.bignumber.equal('2');
        });
    });

    describe('ensure only owner can ArtblocksAddress', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateArtblocksAddress(tokenOwnerOne, {from: tokenOwnerOne}));
        });

        it('should update if owner', async function () {
            await this.token.updateArtblocksAddress(tokenOwnerOne, {from: creator});
            (await this.token.artblocksAddress()).should.be.equal(tokenOwnerOne);
        });
    });

    describe('ensure only owner can ArtblocksPercentage', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateArtblocksPercentage(new BN(6), {from: tokenOwnerOne}));
        });

        it('should update if owner', async function () {
            await this.token.updateArtblocksPercentage(new BN(6), {from: creator});
            (await this.token.artblocksPercentage()).should.be.bignumber.equal(new BN(6));
        });
    });

    describe('ensure only owner can MaxInvocations', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateMaxInvocations(new BN(100), {from: tokenOwnerOne}));
        });

        it('should update if owner', async function () {
            await this.token.updateMaxInvocations(new BN(100), {from: creator});
            (await this.token.maxInvocations()).should.be.bignumber.equal(new BN(100));
        });
    });

    describe('ensure only owner can ApplicationChecksum', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.token.updateApplicationChecksum(web3.utils.fromAscii('file-checksum'), {from: tokenOwnerOne}));
        });

        it('can be set by artist', async function () {
            await this.token.updateApplicationChecksum(web3.utils.fromAscii('file-checksum'), {from: creator});
            const applicationChecksum = await this.token.applicationChecksum();
            web3.utils.toAscii(applicationChecksum).replace(/\0/g, '').should.be.equal('file-checksum');
        });
    });

    async function getGasCosts (receipt) {
        let tx = await web3.eth.getTransaction(receipt.tx);
        let gasPrice = new BN(tx.gasPrice);
        return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
});
