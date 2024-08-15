# DeFi Script: Uniswap 🤝 Aave Integration

## Overview of Script

This script demonstrates the integration of two prominent DeFi protocols, Uniswap V3 and Aave, on the Ethereum Sepolia testnet. The script is designed to perform the following operations:

1. **Token Swap on Uniswap V3**:
   - The user initiates the script to swap USDC for LINK on Uniswap.
   - The script checks the user’s USDC balance and approves the Uniswap Swap Router to spend the required amount of USDC.
   - It retrieves pool information from Uniswap, prepares the necessary parameters, and executes the swap, converting USDC to LINK.
   - The received LINK tokens are transferred to the user's wallet.

2. **Supply LINK on Aave**:
   - After successfully swapping USDC for LINK, the script approves the Aave Pool contract to spend the user's LINK.
   - The script then deposits the LINK tokens into Aave, enabling the user to earn interest on the deposited LINK.

This integration exemplifies the composability of DeFi protocols, allowing users to seamlessly transition from a token swap on Uniswap to earning yield on Aave with minimal interaction.

## Diagram Illustration

The following diagram provides a visual representation of the workflow described above. It illustrates the sequence of steps and interactions between the different protocols:

![Flowchart](./Images/Flowchart.drawio.png)

## Setup Instructions

1. Clone the project repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git




2. Install the necessary dependencies:
   ```bash
   npm install --save
   ```

3. Create a `.env` file in the root of the project directory and add your RPC URL and private key:
   ```bash
   RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
   PRIVATE_KEY="YOUR_PRIVATE_KEY"
   ```

4. Run the script to execute the token swap and deposit the LINK tokens into Aave:
   ```bash
   node index.js
   ```

   # Code Explanation

## Overview

This document provides a detailed explanation of the code used in the DeFi script that integrates Uniswap and Aave on the Ethereum Sepolia testnet. The script is designed to perform a token swap on Uniswap and then supply the swapped tokens to Aave for earning interest. Below, we will go through the key functions, the logic behind them, and how the interactions with the DeFi protocols are handled.

## Code Structure

The script is organized into several key functions that collectively perform the following tasks:

1. **Token Approval**: Approves the necessary tokens for spending by the smart contracts.
2. **Retrieving Pool Information**: Fetches information about the Uniswap liquidity pool.
3. **Preparing and Executing the Swap**: Prepares the parameters and executes the token swap on Uniswap.
4. **Supplying Tokens to Aave**: Supplies the swapped tokens to Aave for earning interest.

## Detailed Explanation of Key Functions

### 1. `approveToken`

```javascript
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(approveTransaction);
    console.log(`Approval Transaction Sent: ${transactionResponse.hash}`);
    const receipt = await transactionResponse.wait();
    console.log(`Approval Transaction Confirmed!`);
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}



**Explanation**:
- This function approves the Uniswap Swap Router to spend the specified amount of the token (e.g., USDC) on behalf of the user.
- It initializes a contract instance for the token, prepares the approval transaction, and sends it to the blockchain.
- The function waits for the transaction to be confirmed and logs the result.

### 2. `getPoolInfo`

```javascript
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}
```

**Explanation**:
- This function retrieves information about a specific Uniswap V3 liquidity pool.
- It calls the `getPool` method on the Uniswap V3 Factory contract to get the pool address for the specified token pair.
- Once the pool address is retrieved, it creates a contract instance and fetches important details like the token addresses and fee tier.

### 3. `prepareSwapParams`

```javascript
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
```

**Explanation**:
- This function prepares the necessary parameters for executing a token swap on Uniswap.
- It specifies the tokens to be swapped, the fee tier, the recipient address, and the amount of input tokens.
- These parameters are essential for calling the swap function on the Uniswap Swap Router contract.

### 4. `executeSwap`

```javascript
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
  const receipt = await signer.sendTransaction(transaction);
  console.log(`Swap Transaction Sent: ${receipt.hash}`);
  console.log(`Swap Transaction Confirmed!`);
}
```

**Explanation**:
- This function handles the execution of the token swap on Uniswap.
- It calls the `exactInputSingle` method on the Swap Router with the prepared parameters, sending the transaction to the blockchain.
- The function waits for the transaction to be confirmed and logs the result.

### 5. `supplyToAave`

```javascript
async function supplyToAave(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const aaveLendingPool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, wallet);
    await tokenContract.approve(AAVE_POOL_ADDRESS, amount);
    const tx = await aaveLendingPool.deposit(tokenAddress, amount, wallet.address, 0);
    await tx.wait();
    console.log(`Supplied ${amount} of ${tokenAddress} to Aave!`);
  } catch (error) {
    console.error("An error occurred while supplying to Aave:", error);
  }
}
```

**Explanation**:
- This function supplies the swapped LINK tokens to the Aave protocol.
- It approves the Aave Pool contract to spend the user's LINK tokens, then calls the `deposit` method on the Aave Pool contract.
- The function waits for the transaction to be confirmed and logs the successful supply of tokens to Aave.

### 6. `main`

```javascript
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
    await executeSwap(swapRouter, params, signer);
    await supplyToAave(LINK.address, TOKEN_OUT_ABI, amountIn, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}
```

**Explanation**:
- The `main` function orchestrates the entire workflow: it approves the tokens, retrieves pool information, prepares swap parameters, executes the swap, and then supplies the swapped tokens to Aave.
- It takes in the `swapAmount` parameter, which specifies the amount of USDC to be swapped for LINK.

## Conclusion

This code demonstrates how to interact with multiple DeFi protocols in a seamless manner. By breaking down the process into modular functions, the script is able to handle token approval, execute a token swap on Uniswap, and supply the resulting tokens to Aave for earning interest. The design of this script allows for easy extension and integration with other protocols or more complex logic, making it a powerful tool for DeFi operations.
```


