const HDWalletProvider = require('truffle-hdwallet-provider');

const MNEMONIC = process.env.ARTBLOCKS_MNEMONIC;
const INFURA_KEY = process.env.PROTOTYPE_BR_INFURA_KEY;

module.exports = {
    INFURA_KEY: INFURA_KEY,
    MNEMONIC: MNEMONIC,
    getAccountOne: (accounts, network) => {
        let _owner = accounts[0];
        if (network === 'ropsten' || network === 'rinkeby') {
            _owner = new HDWalletProvider(MNEMONIC, `https://${network}.infura.io/v3/${INFURA_KEY}`, 0).getAddress();
        }
        console.log(`Using account [${_owner}] for network [${network}]`);
        return _owner;
    }
};
