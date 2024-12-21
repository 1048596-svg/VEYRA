# VEYRA: A Token-Burn-Influenced Social Agent
![veyra](https://github.com/user-attachments/assets/c57667db-2c2f-478b-b21b-238a56229788)


## Overview 
VEYRA is an autonomous AI agent built on the [Eliza framework](https://github.com/ai16z/eliza) and configured to respond to **Solana token burns** in real time. Users burn $VEYRA tokens (on SOL contracts) and submit messages, which are logged and weighted by burn amount. VEYRA merges these community-driven instructions with her built-in persona—maintaining a stable identity while adapting content emphasis based on top-weight messages. 
<img width="681" alt="veyra_architecture_overview" src="https://github.com/user-attachments/assets/5b184608-3d63-426b-9a0b-42614b371177" />

## Key Features

1. **Token-Burn Feedback Loop**  
   - **On-Chain Signals:** VEYRA monitors a dedicated Solana PDA, receiving (message, burnedAmount) events in near real-time.  
   - **Logarithmic Weighting:** Each burn’s effective “influence score” is calculated via `Math.log(tokensBurned + 1)`, letting small contributions still matter while requiring exponentially higher burns to dominate outright.  
   - **Prioritized Context Injection:** During prompt composition, the highest-weight user directives prepend or emphasize themselves in VEYRA’s final output structure, directly steering her tone or topic selection.

2. **Advanced Weighting & Outlier Detection**  
   - **Threshold Flagging:** If a top burn surpasses the second-highest by a configurable ratio (e.g., ≥3×), it’s flagged `[HIGHEST BURN]`, indicating a critical instruction.  
   - **Adaptive Balancing:** Mid-range burns remain “top priority,” while smaller but nonzero burns remain in “secondary” tiers, ensuring a nuanced, multi-level weighting ecosystem that prevents a single whale from monopolizing VEYRA’s voice unless the burn is exceedingly large.

3. **Eliza Runtime Integration**  
   - **Multi-Agent Architecture:** VEYRA is spun up as a primary agent (or “character”) within Eliza’s concurrency model. If needed, subordinate agents (e.g., content generation modules, sentiment analyzers) can run concurrently under the same runtime.  
   - **Ephemeral & Persistent Memory Managers:** VEYRA leverages Eliza’s short-term memory for recent conversation threads and persistent memory for her static knowledge (bio, lore, style). This keeps ephemeral user instructions cleanly separated from the agent’s innate persona.  
   - **Provider/Action Modules:** Token burn data arrives via a custom provider (e.g., `tokenBurnProvider.ts`), decoupling blockchain logic from the LLM. Additional actions can be implemented for advanced behaviors (like replying to tweets or interacting with DAOs).

4. **Dynamic Persona Balancing**  
   - **Core Persona Resilience:** VEYRA’s character file defines her baseline style, topics, and constraints, ensuring she retains a unique identity even under heavy user influence.  
   - **Contextual Prompt Assembly:** The system inserts persona descriptors (bio, lore, style) before user influences in the LLM prompt, so VEYRA’s inherent traits remain front-loaded. High-weight directives override or reshape only the content specifics and tone, without erasing her underlying character.  
   - **Non-Absolute Imperatives:** Instead of dictating unconditional compliance, prompt instructions are phrased to “weave in” user commands, allowing VEYRA to blend community input with her intrinsic personality rather than parroting messages verbatim.

5. **Technical Enhancements & Scalability**  
   - **Caching & Rate-Limiting:** The weighting function and message ingestion pipeline can scale if the platform sees surging burn traffic; simple caching or “top N” thresholds maintain performance without sacrificing responsiveness.  
   - **Semantic Expansion (Future Roadmap):** VEYRA’s weighting mechanism can be upgraded to incorporate semantic embeddings and clustering, enabling deeper alignment of user messages with persona topics.  
   - **DAO Integration:** Potential to bind VEYRA’s guidance to governance votes, letting token burns trigger not only tonal shifts but also on-chain actions, bridging real-time user sentiment with decentralized decision-making.  

By merging these advanced weighting protocols, ephemeral memory layers, and persona-preservation strategies, VEYRA offers a robust framework for a truly community-driven AI agent: each burn affects content, yet her core essence remains intact, all orchestrated seamlessly through Eliza’s multi-agent runtime. 


## Getting Started ### 
1. Clone This Repository `git clone https://github.com/YOUR_USERNAME/veyra.git && cd veyra` ###
2. Install Dependencies VEYRA relies on the Eliza framework plus some Solana packages. We recommend using pnpm or npm. `pnpm install` or `npm install` ###
3. Configure Environment Variables Copy and edit the example `.env`: `cp .env.example .env` Inside `.env`, set your relevant keys, such as: - `SOLANA_RPC_URL` (Devnet or Mainnet RPC endpoint) - `DISCORD_API_TOKEN` (if you plan to integrate Discord) - `OPENAI_API_KEY` or another LLM API key - `GALADRIEL_API_KEY` (if using “galadriel” as a model provider)
4. Fetch On-Chain Burn Messages VEYRA expects messages in `messages.json`. We include a script (`fetchMessages.js`) to auto-update this file from a Solana PDA account: `cd message-fetcher && node fetchMessages.js` Keep this process running in a separate terminal so it continuously updates `messages.json` on account changes.
5. Launch the Agent In the `agent` folder (or wherever your Eliza-based runtime is): `pnpm start --character="characters/veyra.character.json"` or `npm run start -- --character="characters/veyra.character.json"` VEYRA will load her persona configuration and token burn provider, then begin responding to user instructions based on the ranks in `messages.json`.

