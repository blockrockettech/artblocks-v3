const {getAccountOne} = require('../constants');

const SimpleArtistToken = artifacts.require('./SimpleArtistToken.sol');

module.exports = async function (deployer, network, accounts) {

    const artblocksAccount = getAccountOne(accounts, network);

    await deployer.deploy(SimpleArtistToken, artblocksAccount, 1, 'ipfs', {from: artblocksAccount});
};
