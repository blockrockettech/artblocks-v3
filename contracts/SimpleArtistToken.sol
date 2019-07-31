pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol';
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";

import "./Strings.sol";
import "./CustomERC721Metadata.sol";

contract SimpleArtistToken is CustomERC721Metadata, WhitelistedRole {
    using SafeMath for uint256;

    uint256 constant internal MAX_UINT256 = ~uint256(0);

    ///////////////
    // Variables //
    ///////////////

    string public tokenBaseURI;
    string public tokenBaseIpfsURI = "https://ipfs.infura.io/ipfs/";

    address payable public artistAddress;
    uint256 public pricePerTokenInWei;

    address payable public artblocksAddress;
    uint256 public artblocksPercentage = 5;

    uint256 public maxInvocations = MAX_UINT256;
    uint256 public invocations = 0;

    bytes32 public applicationChecksum;

    mapping(bytes32 => uint256) public hashToTokenId;
    mapping(uint256 => bytes32) public tokenIdToHash;
    mapping(uint256 => string) public tokenIdToNickname;

    mapping(uint256 => string) public staticIpfsImageLink;


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

    constructor(address payable _artistAddress, uint256 _pricePerTokenInWei, string memory _tokenBaseURI, string memory _tokenName, string memory _tokenSymbol) CustomERC721Metadata(_tokenName, _tokenSymbol) public {
        super.addWhitelisted(msg.sender);

        artistAddress = _artistAddress;

        pricePerTokenInWei = _pricePerTokenInWei;

        tokenBaseURI = _tokenBaseURI;

        artblocksAddress = msg.sender;
    }

    //////////////////////////////
    // Token Creation Functions //
    //////////////////////////////

    // allows payment direct to contract
    function() external payable {
        purchaseTo(msg.sender);
    }

    function purchase() public payable returns (uint256 _tokenId) {
        return purchaseTo(msg.sender);
    }

    function purchaseTo(address _to) public payable returns (uint256 _tokenId) {
        require(msg.value >= pricePerTokenInWei, "Must send at least pricePerTokenInWei");
        require(invocations.add(1) <= maxInvocations, "Must not exceed max invocations");

        uint256 tokenId = _mintToken(_to);

        _splitFunds();

        return tokenId;
    }

    function purchaseWithNickname(string memory _nickname) public payable returns (uint256 _tokenId) {
        return purchaseWithNicknameTo(msg.sender, _nickname);
    }

    function purchaseWithNicknameTo(address _to, string memory _nickname) public payable returns (uint256 _tokenId) {
        require(msg.value >= pricePerTokenInWei, "Must send at least pricePerTokenInWei");
        require(invocations.add(1) <= maxInvocations, "Must not exceed max invocations");

        uint256 tokenId = _mintToken(_to);

        tokenIdToNickname[tokenId] = _nickname;

        _splitFunds();

        return tokenId;
    }

    function _mintToken(address _to) internal returns (uint256 _tokenId) {

        invocations = invocations.add(1); // next token ID
        bytes32 hash = keccak256(abi.encodePacked(invocations, block.number, msg.sender));

        _mint(_to, invocations);

        hashToTokenId[hash] = invocations;
        tokenIdToHash[invocations] = hash;

        return invocations;
    }

    function _splitFunds() internal {
        if (msg.value > 0) {

            uint256 refund = msg.value.sub(pricePerTokenInWei);

            // overpaid...
            if (refund > 0) {
                msg.sender.transfer(refund);
            }

            // work out the amount to split and send it
            uint256 foundationAmount = pricePerTokenInWei.div(100).mul(artblocksPercentage);
            if (foundationAmount > 0) {
                artblocksAddress.transfer(foundationAmount);
            }

            // send remaining amount to artist
            uint256 remaining = pricePerTokenInWei.sub(foundationAmount);
            artistAddress.transfer(remaining);
        }
    }

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

    function updateArtblocksAddress(address payable _artblocksAddress) public onlyWhitelisted returns (bool) {
        artblocksAddress = _artblocksAddress;
        return true;
    }

    function updateArtblocksPercentage(uint256 _artblocksPercentage) public onlyWhitelisted returns (bool) {
        artblocksPercentage = _artblocksPercentage;
        return true;
    }

    function updateMaxInvocations(uint256 _maxInvocations) public onlyWhitelisted returns (bool) {
        require(_maxInvocations > invocations, "You must set max invocations greater than current invocations");

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

    function updateTokenNickname(uint256 _tokenId, string memory _nickname) public returns (bool) {
        require(_exists(_tokenId), "Token must exist");
        require(msg.sender == ownerOf(_tokenId), "You must own token");

        tokenIdToNickname[_tokenId] = _nickname;
        return true;
    }

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
