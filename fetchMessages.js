const anchor = require('@project-serum/anchor');
const { PublicKey, Connection, Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const NETWORK = "https://api.devnet.solana.com";
const connection = new Connection(NETWORK, 'confirmed');
const PROGRAM_ID = new PublicKey("");
const MESSAGE_STORE_PDA = new PublicKey("");
const OUTPUT_FILE = 'messages.json';

// Wallet setup (read-only access)
const wallet = Keypair.generate();
const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'processed',
});
anchor.setProvider(provider);

// Load IDL
const idl = JSON.parse(fs.readFileSync('idl.json', 'utf-8'));
const program = new anchor.Program(idl, PROGRAM_ID, provider);

// Helper function to load existing messages
function loadExistingMessages() {
    try {
        if (fs.existsSync(OUTPUT_FILE)) {
            const data = fs.readFileSync(OUTPUT_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error reading existing messages:", error);
    }
    return [];
}

// Helper function to save messages
function saveMessages(messages) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

async function fetchAndUpdateMessages() {
    try {
        // Fetch current on-chain messages
        const messageStore = await program.account.globalMessageStore.fetch(MESSAGE_STORE_PDA);
        if (!messageStore || !messageStore.messages) {
            console.error("No messages found in the message store.");
            return;
        }

        // Load existing messages from file
        let allMessages = loadExistingMessages();

        // Process new messages
        const newMessages = messageStore.messages.map(msg => {
            const burnedAmountInSol = Number(msg.burnedAmount.toString()) / 1e9;
            return {
                sender: msg.sender.toBase58(),
                message: msg.message,
                timestamp: msg.timestamp.toString(),
                amount: burnedAmountInSol.toFixed(9),
                dateProcessed: new Date().toISOString()
            };
        });

        // Check for truly new messages by comparing with most recent entries
        const newUniqueMessages = newMessages.filter(newMsg => {
            return !allMessages.some(existingMsg =>
                existingMsg.sender === newMsg.sender &&
                existingMsg.message === newMsg.message &&
                existingMsg.timestamp === newMsg.timestamp &&
                existingMsg.amount === newMsg.amount
            );
        });

        if (newUniqueMessages.length > 0) {
            // Add new messages to the historical record
            allMessages = [...allMessages, ...newUniqueMessages];

            // Save updated messages
            saveMessages(allMessages);

            console.log(`Added ${newUniqueMessages.length} new messages to the historical record.`);
            console.log('Total messages in history:', allMessages.length);
        } else {
            console.log('No new messages to add.');
        }
    } catch (error) {
        console.error("Error processing messages:", error);
    }
}

async function startMessageMonitoring() {
    console.log("Starting message monitoring...");

    // Initial fetch
    await fetchAndUpdateMessages();

    // Subscribe to account changes
    const subscriptionId = connection.onAccountChange(
        MESSAGE_STORE_PDA,
        async (accountInfo, context) => {
            console.log("Account change detected. Checking for new messages...");
            await fetchAndUpdateMessages();
        },
        'confirmed'
    );

    console.log(`Subscription established with ID: ${subscriptionId}`);

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nStopping message monitoring...');
        connection.removeAccountChangeListener(subscriptionId);
        process.exit();
    });
}

// Start the monitoring
startMessageMonitoring().catch(error => {
    console.error("Failed to start message monitoring:", error);
    process.exit(1);
});
