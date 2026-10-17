const projectId = '25a778da5292aee3e00da87e594c2005'; // Replace with your WalletConnect Project ID

const connectButton = document.getElementById('connect-button');
const disconnectButton = document.getElementById('disconnect-button');
const addressInput = document.querySelector('.input-row.primary input');
const amountInput = document.querySelector('.input-row.amount-row input');
const pasteButton = document.querySelector('.paste');

let provider;
let web3Provider;
let signer;

// USDT BEP-20 contract address on BNB Smart Chain Mainnet
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
// Minimal ABI for the transfer function
const USDT_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "recipient",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const initWalletConnect = async () => {
  try {
    provider = await window.EthereumProvider.init({
      projectId: projectId,
      chains: [56], // BNB Smart Chain mainnet
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_accounts', 'eth_requestAccounts'],
      events: ['chainChanged', 'accountsChanged'],
      showQrModal: true,
      rpcMap: {
        56: 'https://bsc-dataseed.binance.org/' // BNB Smart Chain RPC URL
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
    connectButton.addEventListener('click', sendUSDT);
    disconnectButton.style.display = 'block'; // Show disconnect button
    disconnectButton.addEventListener('click', disconnectWallet);

  } else {
    connectButton.textContent = 'Next';
    connectButton.classList.remove('active');
    connectButton.classList.add('idle');
    connectButton.removeEventListener('click', sendUSDT);
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

const sendUSDT = async () => {
  if (!signer) {
    alert('Please connect your wallet first.');
    return;
  }

  const recipientAddress = addressInput.value;
  const amount = amountInput.value;

  if (!window.ethers.isAddress(recipientAddress)) {
    alert('Please enter a valid recipient address.');
    return;
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  try {
    const usdtContract = new window.ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

    // USDT has 18 decimals, so multiply by 10^18
    const amountWei = window.ethers.parseUnits(amount, 18);

    const transaction = await usdtContract.transfer(recipientAddress, amountWei);
    console.log('Transaction sent:', transaction);
    alert(`Transaction sent! Hash: ${transaction.hash}`);

    // Optionally, wait for transaction confirmation
    await transaction.wait();
    console.log('Transaction confirmed:', transaction.hash);
    alert('Transaction confirmed!');

  } catch (error) {
    console.error('Failed to send USDT:', error);
    alert(`Failed to send USDT: ${error.message}`);
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
