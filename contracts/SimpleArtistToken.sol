pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol';
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";

import "./Strings.sol";
import "./CustomERC721Metadata.sol";

contract SimpleArtistToken is CustomERC721Metadata, WhitelistedRole {
    using SafeMath for uint256;

    ////////////
    // Events //
    ////////////


    ///////////////
    // Variables //
    ///////////////

    string public tokenBaseURI = "https://ipfs.infura.io/ipfs/";

    mapping(bytes32 => uint256) public blockhashToTokenId;
    mapping(uint256 => bytes32) public tokenIdToBlockhash;

    mapping(uint256 => string) private _tokenURIs;

    address payable public artistAddress;

    uint256 public pricePerTokenInWei;

    address payable public foundationAddress = 0xf43aE50C468c3D3Fa0C3dC3454E797317EF53078;
    uint256 public foundationPercentage = 5; // 5% to foundation


    ///////////////
    // Modifiers //
    ///////////////

    modifier onlyValidTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token ID does not exist");
        _;
    }

    /////////////////
    // Constructor //
    /////////////////

    constructor(address payable _artistAddress, uint256 _pricePerTokenInWei) CustomERC721Metadata("SimpleArtistToken", "SAT") public {
        super.addWhitelisted(msg.sender);
        artistAddress = _artistAddress;
        pricePerTokenInWei = _pricePerTokenInWei;
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    function purchase() public payable returns (uint256 _tokenId) {
        return purchaseTo(msg.sender);
    }

    function purchaseTo(address _to) public payable returns (uint256 _tokenId) {

        uint256 number = block.number; // get last mined block
        bytes32 hash = keccak256(abi.encodePacked(number));

        while (blockhashToTokenId[hash] != 0) {
            number = number.add(1);
            hash = keccak256(abi.encodePacked(number));
        }

        _mint(_to, number);

        blockhashToTokenId[hash] = number;
        tokenIdToBlockhash[number] = hash;

        _splitFunds();

        return number;
    }

    function _splitFunds() internal {
        if (msg.value > 0) {

            // work out the amount to split and send it
            uint256 foundationAmount = msg.value.div(100).mul(foundationPercentage);
            foundationAddress.transfer(foundationAmount);

            // send remaining amount to artist
            uint256 remaining = msg.value.sub(foundationAmount);
            artistAddress.transfer(remaining);
        }
    }

    /*
     * Function for burning tokens if you are the owner
     */
    function burn(uint256 _tokenId) public {
        require(_isApprovedOrOwner(msg.sender, _tokenId), "Caller is not owner nor approved");
        _burn(_tokenId);
        delete _tokenURIs[_tokenId];
    }

    /*
     * Admin only function for burning tokens
     */
    function adminBurn(uint256 _tokenId) onlyWhitelisted public {
        _burn(_tokenId);
        delete _tokenURIs[_tokenId];
    }

    //////////////////////////
    // Management functions //
    //////////////////////////

    function updateTokenBaseURI(string calldata _newBaseURI)
    external
    onlyWhitelisted {
        require(bytes(_newBaseURI).length != 0, "Base URI invalid");
        tokenBaseURI = _newBaseURI;
    }

    function updateTokenURI(uint256 _tokenId, string calldata _newTokenURI)
    external
    onlyWhitelisted
    onlyValidTokenId(_tokenId) {
        require(bytes(_newTokenURI).length != 0, "Token URI invalid");
        _tokenURIs[_tokenId] = _newTokenURI;
    }

    function updateArtistAddress(address payable _artistAddress)
    external
    onlyWhitelisted {
        artistAddress = _artistAddress;
    }

    ////////////////////////
    // Accessor functions //
    ////////////////////////

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _tokensOfOwner(owner);
    }

    function tokenURI(uint256 _tokenId)
    external view
    onlyValidTokenId(_tokenId)
    returns (string memory) {
        return Strings.strConcat(tokenBaseURI, _tokenURIs[_tokenId]);
    }
}
