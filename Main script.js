require('dotenv').config();
const { ethers } = require('ethers');
const factoryABI = require('./abis/UniswapV3Factory.json');
const poolABI = require('./abis/UniswapV3Pool.json');
const swapRouterABI = require('./abis/UniswapV3SwapRouter.json');
const erc20ABI = require('./abis/ERC20.json');

// Configuration
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const USDC = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48', // Sepolia USDC address
  decimals: 6,
};

const LINK = {
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Sepolia LINK address
  decimals: 18,
};

const SWAP_ROUTER_CONTRACT_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Uniswap V3 Swap Router address
const UNISWAP_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Uniswap V3 Factory address
const AAVE_POOL_ADDRESS = '0x7B3c02F537f43a3a9DC5A93A4A50f1E68AA9E7F0'; // Aave Pool address (example)

// Function to approve tokens for swap
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(approveTransaction);
    console.log("Approval Transaction Sent:", transactionResponse.hash);
    const receipt = await transactionResponse.wait();
    console.log("Approval Transaction Confirmed:", receipt.hash);
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

// Function to get pool information
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

// Function to prepare swap parameters
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Function to execute the swap on Uniswap
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
  const receipt = await signer.sendTransaction(transaction);
  console.log("Swap Transaction:", receipt.hash);
}

// Function to approve LINK for Aave
async function approveAave(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), LINK.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      AAVE_POOL_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(approveTransaction);
    console.log("Approval Transaction Sent:", transactionResponse.hash);
    const receipt = await transactionResponse.wait();
    console.log("Approval Transaction Confirmed:", receipt.hash);
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

// Function to supply LINK on Aave
async function supplyOnAave(tokenAddress, amount, signer) {
  try {
    const aaveContract = new ethers.Contract(AAVE_POOL_ADDRESS, erc20ABI, signer);
    const transaction = await aaveContract.supply(tokenAddress, amount, signer.address, 0);
    const receipt = await transaction.wait();
    console.log("Supply Transaction Sent:", receipt.hash);
    console.log("Supply Transaction Confirmed:", receipt.hash);
  } catch (error) {
    console.error("An error occurred during supply on Aave:", error);
  }
}

// Main function to execute the entire flow
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, erc20ABI, inputAmount, signer);
    const factoryContract = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, factoryABI, provider);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, swapRouterABI, signer);
    await executeSwap(swapRouter, params, signer);

    const linkContract = new ethers.Contract(LINK.address, erc20ABI, signer);
    const linkBalance = await linkContract.balanceOf(signer.address);
    await approveAave(LINK.address, erc20ABI, linkBalance, signer);
    await supplyOnAave(LINK.address, linkBalance, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Execute the script
main(1).then(() => console.log("Script executed successfully"));


 
