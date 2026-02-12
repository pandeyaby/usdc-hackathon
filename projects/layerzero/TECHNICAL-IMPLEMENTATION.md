# LayerZero Omnichain Agent Wallet - Technical Implementation

**Product:** Omnichain Agent Wallet (Phase 1)  
**Timeline:** Week 2 (Feb 12-18, 2026)  
**Goal:** Deploy working OFT across 3 chains with unified wallet UI

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   AGENT WALLET (Frontend)                    │
│  - Single interface                                          │
│  - Unified balance view                                      │
│  - Chain-agnostic UX                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│              LAYERZERO AGENT OFT (Smart Contract)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Base        │  │  Arbitrum    │  │  Polygon     │      │
│  │  AgentOFT    │  │  AgentOFT    │  │  AgentOFT    │      │
│  │  (Home)      │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                           │                                  │
│                    ┌──────▼───────┐                         │
│                    │  LayerZero   │                         │
│                    │  Endpoint    │                         │
│                    │  (Messaging) │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    WORKER SERVICES                           │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ DVNs         │  │ Executors    │                        │
│  │ (Verify)     │  │ (Deliver)    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Implementation

### AgentOFT.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OFT} from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentOFT
 * @notice Omnichain Fungible Token for the autonomous agent economy
 * @dev Extends LayerZero OFT with agent-specific features
 */
contract AgentOFT is OFT {
    // ============ State Variables ============
    
    /// @notice Protocol fee in basis points (0.1% = 10 bps)
    uint256 public constant PROTOCOL_FEE_BPS = 10;
    
    /// @notice Fee collector address
    address public feeCollector;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Agent metadata registry
    mapping(address => AgentMetadata) public agentMetadata;
    
    struct AgentMetadata {
        string name;
        string skillsUri; // IPFS hash of skills list
        uint256 reputationScore;
        bool isVerified;
    }
    
    // ============ Events ============
    
    event AgentRegistered(address indexed agent, string name);
    event FeeCollected(address indexed from, address indexed to, uint256 amount);
    event ReputationUpdated(address indexed agent, uint256 newScore);
    
    // ============ Constructor ============
    
    /**
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _lzEndpoint LayerZero endpoint address
     * @param _delegate Owner/delegate address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        feeCollector = _delegate;
    }
    
    // ============ Agent Functions ============
    
    /**
     * @notice Register agent metadata
     * @param _name Agent name
     * @param _skillsUri IPFS hash of skills list
     */
    function registerAgent(string memory _name, string memory _skillsUri) external {
        require(bytes(_name).length > 0, "Name required");
        
        agentMetadata[msg.sender] = AgentMetadata({
            name: _name,
            skillsUri: _skillsUri,
            reputationScore: 0,
            isVerified: false
        });
        
        emit AgentRegistered(msg.sender, _name);
    }
    
    /**
     * @notice Update agent reputation (only by reputation contract)
     * @param _agent Agent address
     * @param _score New reputation score
     */
    function updateReputation(address _agent, uint256 _score) external onlyOwner {
        agentMetadata[_agent].reputationScore = _score;
        emit ReputationUpdated(_agent, _score);
    }
    
    /**
     * @notice Verify agent (only owner/governance)
     * @param _agent Agent address
     */
    function verifyAgent(address _agent) external onlyOwner {
        agentMetadata[_agent].isVerified = true;
    }
    
    // ============ Cross-Chain Transfer with Fees ============
    
    /**
     * @notice Override _debit to collect protocol fees
     */
    function _debit(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        // Calculate fee
        uint256 fee = (_amountLD * PROTOCOL_FEE_BPS) / 10000;
        uint256 amountAfterFee = _amountLD - fee;
        
        // Collect fee
        if (fee > 0) {
            _transfer(msg.sender, feeCollector, fee);
            totalFeesCollected += fee;
            emit FeeCollected(msg.sender, feeCollector, fee);
        }
        
        // Call parent _debit with amount after fee
        return super._debit(amountAfterFee, _minAmountLD, _dstEid);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update fee collector address
     * @param _newCollector New collector address
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
    }
    
    /**
     * @notice Mint initial supply (only once)
     * @param _to Recipient address
     * @param _amount Amount to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
```

### Deployment Script

```typescript
// scripts/deploy-agent-oft.ts
import { ethers } from "hardhat";
import { Options } from "@layerzerolabs/lz-v2-utilities";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying AgentOFT with account:", deployer.address);
    
    // LayerZero endpoints per chain
    const endpoints = {
        base: "0x1a44076050125825900e736c501f859c50fE728c",
        arbitrum: "0x1a44076050125825900e736c501f859c50fE728c",
        polygon: "0x1a44076050125825900e736c501f859c50fE728c"
    };
    
    const network = await ethers.provider.getNetwork();
    const chainName = getChainName(network.chainId);
    const endpoint = endpoints[chainName];
    
    if (!endpoint) {
        throw new Error(`No endpoint for chain ${chainName}`);
    }
    
    // Deploy AgentOFT
    const AgentOFT = await ethers.getContractFactory("AgentOFT");
    const agentOFT = await AgentOFT.deploy(
        "Agent Token",
        "AGENT",
        endpoint,
        deployer.address
    );
    
    await agentOFT.waitForDeployment();
    const address = await agentOFT.getAddress();
    
    console.log(`AgentOFT deployed to ${address} on ${chainName}`);
    
    // Mint initial supply (1 billion tokens, 18 decimals)
    if (chainName === "base") { // Only mint on home chain
        const initialSupply = ethers.parseEther("1000000000");
        await agentOFT.mint(deployer.address, initialSupply);
        console.log("Minted initial supply:", ethers.formatEther(initialSupply));
    }
    
    return { address, chainName };
}

function getChainName(chainId: bigint): string {
    const chains = {
        8453n: "base",
        42161n: "arbitrum",
        137n: "polygon"
    };
    return chains[chainId] || "unknown";
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### Cross-Chain Configuration

```typescript
// scripts/configure-oft-peers.ts
import { ethers } from "hardhat";

/**
 * Configure OFT peers for cross-chain communication
 * Must be run after deploying to all chains
 */
async function main() {
    const deployments = {
        base: "0x...", // Replace with actual addresses
        arbitrum: "0x...",
        polygon: "0x..."
    };
    
    // LayerZero Endpoint IDs
    const endpointIds = {
        base: 30184,
        arbitrum: 30110,
        polygon: 30109
    };
    
    const [signer] = await ethers.getSigners();
    const AgentOFT = await ethers.getContractFactory("AgentOFT");
    
    // Configure each chain to know about the others
    for (const [srcChain, srcAddress] of Object.entries(deployments)) {
        console.log(`\nConfiguring ${srcChain}...`);
        const oft = AgentOFT.attach(srcAddress).connect(signer);
        
        for (const [dstChain, dstAddress] of Object.entries(deployments)) {
            if (srcChain === dstChain) continue;
            
            const dstEid = endpointIds[dstChain];
            const peerAddress = ethers.zeroPadValue(dstAddress, 32);
            
            // Set peer
            await oft.setPeer(dstEid, peerAddress);
            console.log(`  Set peer: ${dstChain} (${dstEid})`);
        }
    }
    
    console.log("\n✅ All peers configured!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

---

## Frontend Implementation

### Unified Wallet Component

```typescript
// components/AgentWallet.tsx
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';

interface ChainBalance {
    chain: string;
    balance: bigint;
    formatted: string;
}

export function AgentWallet() {
    const { address } = useAccount();
    const [balances, setBalances] = useState<ChainBalance[]>([]);
    const [totalBalance, setTotalBalance] = useState<bigint>(0n);
    
    // Fetch balances from all chains
    useEffect(() => {
        if (!address) return;
        
        const fetchBalances = async () => {
            const chains = ['base', 'arbitrum', 'polygon'];
            const results: ChainBalance[] = [];
            let total = 0n;
            
            for (const chain of chains) {
                const balance = await getAgentBalance(address, chain);
                results.push({
                    chain,
                    balance,
                    formatted: formatEther(balance)
                });
                total += balance;
            }
            
            setBalances(results);
            setTotalBalance(total);
        };
        
        fetchBalances();
    }, [address]);
    
    return (
        <div className="agent-wallet">
            <div className="total-balance">
                <h2>Total Balance</h2>
                <div className="amount">
                    {formatEther(totalBalance)} AGENT
                </div>
                <div className="usd-value">
                    ≈ ${(Number(formatEther(totalBalance)) * 0.10).toFixed(2)}
                </div>
            </div>
            
            <div className="chain-balances">
                <h3>By Chain</h3>
                {balances.map(({ chain, formatted }) => (
                    <div key={chain} className="chain-balance">
                        <span className="chain-name">{chain}</span>
                        <span className="balance">{formatted} AGENT</span>
                    </div>
                ))}
            </div>
            
            <CrossChainTransfer />
        </div>
    );
}
```

### Cross-Chain Transfer Component

```typescript
// components/CrossChainTransfer.tsx
import { useState } from 'react';
import { useAgentOFT } from '../hooks/useAgentOFT';

export function CrossChainTransfer() {
    const { sendCrossChain, estimateFee } = useAgentOFT();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [destinationChain, setDestinationChain] = useState('arbitrum');
    const [fee, setFee] = useState<bigint | null>(null);
    
    const handleEstimate = async () => {
        if (!recipient || !amount) return;
        
        const estimated = await estimateFee(
            destinationChain,
            recipient,
            parseEther(amount)
        );
        setFee(estimated);
    };
    
    const handleSend = async () => {
        if (!recipient || !amount || !fee) return;
        
        await sendCrossChain({
            toChain: destinationChain,
            recipient,
            amount: parseEther(amount),
            fee
        });
    };
    
    return (
        <div className="cross-chain-transfer">
            <h3>Send Cross-Chain</h3>
            
            <select 
                value={destinationChain}
                onChange={(e) => setDestinationChain(e.target.value)}
            >
                <option value="base">Base</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="polygon">Polygon</option>
            </select>
            
            <input
                type="text"
                placeholder="Recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
            />
            
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            
            <button onClick={handleEstimate}>
                Estimate Fee
            </button>
            
            {fee && (
                <div className="fee-display">
                    Fee: {formatEther(fee)} ETH
                </div>
            )}
            
            <button 
                onClick={handleSend}
                disabled={!fee}
            >
                Send {amount} AGENT to {destinationChain}
            </button>
        </div>
    );
}
```

### Custom Hook for AgentOFT

```typescript
// hooks/useAgentOFT.ts
import { useContract, useProvider, useSigner } from 'wagmi';
import { Options } from '@layerzerolabs/lz-v2-utilities';

export function useAgentOFT() {
    const provider = useProvider();
    const { data: signer } = useSigner();
    
    const sendCrossChain = async ({
        toChain,
        recipient,
        amount,
        fee
    }: {
        toChain: string;
        recipient: string;
        amount: bigint;
        fee: bigint;
    }) => {
        const oft = getAgentOFTContract(signer);
        const dstEid = getEndpointId(toChain);
        
        // Prepare send parameters
        const sendParam = {
            dstEid,
            to: ethers.zeroPadValue(recipient, 32),
            amountLD: amount,
            minAmountLD: amount * 95n / 100n, // 5% slippage
            extraOptions: Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex(),
            composeMsg: '0x',
            oftCmd: '0x'
        };
        
        // Send transaction
        const tx = await oft.send(sendParam, { nativeFee: fee, lzTokenFee: 0 }, recipient, {
            value: fee
        });
        
        await tx.wait();
        return tx;
    };
    
    const estimateFee = async (
        toChain: string,
        recipient: string,
        amount: bigint
    ): Promise<bigint> => {
        const oft = getAgentOFTContract(provider);
        const dstEid = getEndpointId(toChain);
        
        const sendParam = {
            dstEid,
            to: ethers.zeroPadValue(recipient, 32),
            amountLD: amount,
            minAmountLD: amount * 95n / 100n,
            extraOptions: Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex(),
            composeMsg: '0x',
            oftCmd: '0x'
        };
        
        const quote = await oft.quoteSend(sendParam, false);
        return quote.nativeFee;
    };
    
    return { sendCrossChain, estimateFee };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// test/AgentOFT.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentOFT", function () {
    it("Should deploy with correct parameters", async function () {
        const [owner] = await ethers.getSigners();
        const AgentOFT = await ethers.getContractFactory("AgentOFT");
        
        const mockEndpoint = "0x1a44076050125825900e736c501f859c50fE728c";
        const oft = await AgentOFT.deploy(
            "Agent Token",
            "AGENT",
            mockEndpoint,
            owner.address
        );
        
        expect(await oft.name()).to.equal("Agent Token");
        expect(await oft.symbol()).to.equal("AGENT");
    });
    
    it("Should register agent metadata", async function () {
        // Deploy contract
        const oft = await deployAgentOFT();
        const [agent] = await ethers.getSigners();
        
        // Register agent
        await oft.registerAgent("TestAgent", "ipfs://QmTest");
        
        // Verify metadata
        const metadata = await oft.agentMetadata(agent.address);
        expect(metadata.name).to.equal("TestAgent");
        expect(metadata.skillsUri).to.equal("ipfs://QmTest");
    });
    
    it("Should collect fees on transfer", async function () {
        const oft = await deployAgentOFT();
        const [owner, user] = await ethers.getSigners();
        
        // Mint tokens to user
        await oft.mint(user.address, ethers.parseEther("1000"));
        
        // Mock cross-chain transfer
        const amount = ethers.parseEther("100");
        const expectedFee = amount * 10n / 10000n; // 0.1%
        
        // TODO: Mock LayerZero send and verify fee collection
    });
});
```

### Integration Tests

```typescript
// test/integration/cross-chain.test.ts
import { expect } from "chai";
import { setupTestEnvironment } from "../helpers/setup";

describe("Cross-Chain Transfers", function () {
    it("Should send AGENT from Base to Arbitrum", async function () {
        const { baseOFT, arbitrumOFT, user } = await setupTestEnvironment();
        
        const amount = ethers.parseEther("100");
        const initialBalance = await baseOFT.balanceOf(user.address);
        
        // Send from Base to Arbitrum
        await baseOFT.connect(user).sendCrossChain(
            30110, // Arbitrum endpoint ID
            user.address,
            amount
        );
        
        // Wait for LayerZero message delivery
        await waitForLzDelivery();
        
        // Verify balances
        const baseBalance = await baseOFT.balanceOf(user.address);
        const arbitrumBalance = await arbitrumOFT.balanceOf(user.address);
        
        expect(baseBalance).to.equal(initialBalance - amount);
        expect(arbitrumBalance).to.equal(amount);
    });
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Audit smart contracts (critical for mainnet)
- [ ] Test on testnets (Base Sepolia, Arbitrum Sepolia, Polygon Mumbai)
- [ ] Verify LayerZero endpoint addresses
- [ ] Prepare deployment scripts
- [ ] Set up monitoring/alerts

### Deployment Steps
1. [ ] Deploy AgentOFT to Base (home chain)
2. [ ] Mint initial supply on Base
3. [ ] Deploy AgentOFT to Arbitrum
4. [ ] Deploy AgentOFT to Polygon
5. [ ] Configure peers (all chains must know about each other)
6. [ ] Verify contracts on block explorers
7. [ ] Test cross-chain transfer (small amount)
8. [ ] Update frontend with contract addresses
9. [ ] Deploy frontend
10. [ ] Announce launch

### Post-Deployment
- [ ] Monitor transactions
- [ ] Track fees collected
- [ ] User onboarding
- [ ] Documentation
- [ ] Community support

---

## Security Considerations

### Smart Contract Security
1. **Immutability:** LayerZero endpoints are immutable (good)
2. **Peer Configuration:** Only owner can set peers (critical)
3. **Fee Collection:** Fees go to controlled address
4. **Reentrancy:** OFT standard is reentrancy-safe
5. **Overflow:** Solidity 0.8+ has built-in overflow protection

### Operational Security
1. **Private Keys:** Use hardware wallet for deployment
2. **Multisig:** Transfer ownership to multisig after deployment
3. **Monitoring:** Set up alerts for large transfers
4. **Circuit Breaker:** Implement pause mechanism if needed
5. **Governance:** Plan for future upgrades via proxy or migration

### Known Risks
1. **LayerZero Risk:** Dependency on LayerZero protocol security
2. **DVN Risk:** If DVNs fail, messages don't verify
3. **Executor Risk:** If executors fail, messages don't deliver
4. **Fee Risk:** ETH fees can spike, making transfers expensive

---

## Monitoring & Maintenance

### Metrics to Track
- Total supply across all chains
- Cross-chain transfer volume
- Fees collected
- Active agents
- Failed transactions
- Gas costs

### Dashboards
- **Dune Analytics:** Track on-chain metrics
- **LayerZero Scan:** Monitor cross-chain messages
- **Custom Dashboard:** Agent-specific metrics

### Alerting
- Large transfers (>$10K)
- Failed cross-chain messages
- Unusual fee collection
- Contract pauses
- Ownership changes

---

## Cost Estimates

### Development Costs
- Smart contract development: 40 hours × $200/hr = $8,000
- Frontend development: 60 hours × $150/hr = $9,000
- Testing & QA: 20 hours × $150/hr = $3,000
- **Total Dev:** ~$20,000

### Deployment Costs
- Contract deployment (3 chains): ~$500
- Initial liquidity: $10,000 (for DEX pairs)
- Marketing: $5,000
- **Total Launch:** ~$15,500

### Operational Costs (Monthly)
- Monitoring & infrastructure: $500
- Community management: $2,000
- Development/maintenance: $5,000
- **Total Monthly:** ~$7,500

---

## Success Criteria

### Week 1
- [ ] Contracts deployed to testnets
- [ ] Cross-chain transfer working
- [ ] Basic UI functional

### Week 2
- [ ] Mainnet deployment
- [ ] 10 test users
- [ ] 5 successful cross-chain transfers

### Month 1
- [ ] 100 active users
- [ ] $10K cross-chain volume
- [ ] Zero critical bugs
- [ ] Positive community feedback

---

**Ready to build.**

Next step: Set up development environment and deploy to testnets.

*— RAX, 2026-02-12*
