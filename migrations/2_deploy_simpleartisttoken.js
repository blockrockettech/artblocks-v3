const {getAccountOne} = require('../constants');

const SimpleArtistToken = artifacts.require('./SimpleArtistToken.sol');

module.exports = async function (deployer, network, accounts) {

    const artblocksAccount = getAccountOne(accounts, network);

    // TODO this should have a better base URL?
    await deployer.deploy(SimpleArtistToken, artblocksAccount, 1, 'ipfs', 5, {from: artblocksAccount});
};
