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

    string public tokenBaseURI;
    string public tokenBaseIpfsURI = "https://ipfs.infura.io/ipfs/";

    address payable public artistAddress;
    uint256 public pricePerTokenInWei;

    address payable public foundationAddress = 0xf43aE50C468c3D3Fa0C3dC3454E797317EF53078;
    uint256 public foundationPercentage = 5; // 5% to foundation

    uint256 public maxInvocations = 1000000;
    uint256 public invocations = 0;

    bytes32 public applicationChecksum;

    mapping(bytes32 => uint256) public hashToTokenId;
    mapping(uint256 => bytes32) public tokenIdToHash;

    mapping(uint256 => string) public staticIpfsImageLink;


    // FIXME checksum


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

    constructor(address payable _artistAddress, uint256 _pricePerTokenInWei, string memory _tokenBaseURI) CustomERC721Metadata("SimpleArtistToken", "SAT") public {
        super.addWhitelisted(msg.sender);

        artistAddress = _artistAddress;
        pricePerTokenInWei = _pricePerTokenInWei;
        tokenBaseURI = _tokenBaseURI;
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    function purchase() public payable returns (uint256 _tokenId) {
        return purchaseTo(msg.sender);
    }

    function purchaseTo(address _to) public payable returns (uint256 _tokenId) {
        require(msg.value >= pricePerTokenInWei, "Must send at least pricePerTokenInWei");
        require(invocations.add(1) <= maxInvocations, "Must not exceed max invocations");

        uint256 number = block.number;
        bytes32 hash = keccak256(abi.encodePacked(number));

        while (hashToTokenId[hash] != 0) {
            number = number.add(1);
            hash = keccak256(abi.encodePacked(number));
        }

        _mint(_to, number);

        hashToTokenId[hash] = number;
        tokenIdToHash[number] = hash;

        _splitFunds();

        invocations = invocations.add(1);

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

    //BURN?

    //////////////////////////
    // Management functions //
    //////////////////////////


    function updateArtistAddress(address payable _artistAddress) public onlyWhitelisted returns (bool) {
        artistAddress = _artistAddress;
        return true;
    }

    function updatePricePerTokenInWei(uint256 _pricePerTokenInWei) public onlyWhitelisted returns (bool) {
        pricePerTokenInWei = _pricePerTokenInWei;
        return true;
    }

    function updateFoundationAddress(address payable _foundationAddress) public onlyWhitelisted returns (bool) {
        foundationAddress = _foundationAddress;
        return true;
    }

    function updateFoundationPercentage(uint256 _foundationPercentage) public onlyWhitelisted returns (bool) {
        foundationPercentage = _foundationPercentage;
        return true;
    }

    function updateMaxInvocations(uint256 _maxInvocations) public onlyWhitelisted returns (bool) {
        maxInvocations = _maxInvocations;
        return true;
    }

    function updateApplicationChecksum(bytes32 _applicationChecksum) public onlyWhitelisted returns (bool) {
        applicationChecksum = _applicationChecksum;
        return true;
    }

    function updateTokenBaseURI(string memory _newBaseURI) public onlyWhitelisted returns (bool) {
        tokenBaseURI = _newBaseURI;
        return true;
    }

    function updateTokenBaseIpfsURI(string memory _tokenBaseIpfsURI) public onlyWhitelisted returns (bool) {
        tokenBaseIpfsURI = _tokenBaseIpfsURI;
        return true;
    }

    function overrideDynamicImageWithIpfsLink(uint256 _tokenId, string memory _ipfsHash) public onlyWhitelisted returns (bool) {
        staticIpfsImageLink[_tokenId] = _ipfsHash;
        return true;
    }

    function clearIpfsImageUri(uint256 _tokenId) public onlyWhitelisted returns (bool) {
        delete staticIpfsImageLink[_tokenId];
        return true;
    }

    ////////////////////////
    // Accessor functions //
    ////////////////////////

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _tokensOfOwner(owner);
    }

    function tokenURI(uint256 _tokenId) external view onlyValidTokenId(_tokenId) returns (string memory) {
        // If we have an override then use it
        if (bytes(staticIpfsImageLink[_tokenId]).length > 0) {
            return Strings.strConcat(tokenBaseIpfsURI, staticIpfsImageLink[_tokenId]);
        }

        return Strings.strConcat(tokenBaseURI, Strings.uint2str(_tokenId));
    }


}
