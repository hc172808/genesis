// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVotes { function balanceOf(address) external view returns (uint256); }

contract GovernorSimple {
    enum VoteChoice { Against, For, Abstain }
    struct Proposal {
        address proposer;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
    }

    IVotes public immutable token;
    uint256 public proposalThreshold;
    uint256 public votingPeriod;       // in blocks
    uint256 public quorum;
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, address proposer, string description, uint256 endBlock);
    event VoteCast(uint256 indexed id, address voter, VoteChoice choice, uint256 weight);

    constructor(address _token, uint256 _threshold, uint256 _votingPeriod, uint256 _quorum) {
        token = IVotes(_token);
        proposalThreshold = _threshold;
        votingPeriod = _votingPeriod;
        quorum = _quorum;
    }

    function propose(string calldata description) external returns (uint256 id) {
        require(token.balanceOf(msg.sender) >= proposalThreshold, "threshold");
        id = ++proposalCount;
        proposals[id] = Proposal({
            proposer: msg.sender, description: description,
            startBlock: block.number, endBlock: block.number + votingPeriod,
            forVotes: 0, againstVotes: 0, abstainVotes: 0, executed: false
        });
        emit ProposalCreated(id, msg.sender, description, block.number + votingPeriod);
    }

    function castVote(uint256 id, VoteChoice choice) external {
        Proposal storage p = proposals[id];
        require(block.number <= p.endBlock, "ended");
        require(!hasVoted[id][msg.sender], "voted");
        uint256 w = token.balanceOf(msg.sender);
        require(w > 0, "no votes");
        hasVoted[id][msg.sender] = true;
        if (choice == VoteChoice.For) p.forVotes += w;
        else if (choice == VoteChoice.Against) p.againstVotes += w;
        else p.abstainVotes += w;
        emit VoteCast(id, msg.sender, choice, w);
    }

    function state(uint256 id) external view returns (string memory) {
        Proposal storage p = proposals[id];
        if (block.number <= p.endBlock) return "active";
        if (p.forVotes + p.againstVotes + p.abstainVotes < quorum) return "defeated";
        return p.forVotes > p.againstVotes ? "succeeded" : "defeated";
    }
}
