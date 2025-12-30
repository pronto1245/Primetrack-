import { storage } from "../storage";

interface BlockchainTxInfo {
  confirmed: boolean;
  amount: string;
  toAddress: string;
  timestamp: number;
}

export class CryptoPaymentService {
  
  async verifyBtcTransaction(txHash: string, expectedAddress: string): Promise<BlockchainTxInfo | null> {
    try {
      const response = await fetch(`https://blockchain.info/rawtx/${txHash}?format=json`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      const outputs = data.out || [];
      const matchingOutput = outputs.find((out: any) => out.addr === expectedAddress);
      
      if (!matchingOutput) return null;
      
      const confirmations = data.block_height ? Math.max(0, Date.now() / 600000 - data.block_height) : 0;
      
      return {
        confirmed: confirmations >= 1,
        amount: (matchingOutput.value / 100000000).toFixed(8),
        toAddress: matchingOutput.addr,
        timestamp: data.time * 1000,
      };
    } catch (error) {
      console.error("BTC verification error:", error);
      return null;
    }
  }
  
  async verifyTrc20Transaction(txHash: string, expectedAddress: string): Promise<BlockchainTxInfo | null> {
    try {
      const response = await fetch(`https://apilist.tronscan.org/api/transaction-info?hash=${txHash}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (!data.contractData) return null;
      
      const toAddress = data.contractData.to_address || data.toAddress;
      if (toAddress?.toLowerCase() !== expectedAddress.toLowerCase()) return null;
      
      const amount = data.contractData.amount || data.trigger_info?.parameter?._value || "0";
      const amountUsdt = (parseInt(amount) / 1000000).toFixed(2);
      
      return {
        confirmed: data.confirmed === true,
        amount: amountUsdt,
        toAddress: toAddress,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error("TRC20 verification error:", error);
      return null;
    }
  }
  
  async verifyEthTransaction(txHash: string, expectedAddress: string): Promise<BlockchainTxInfo | null> {
    try {
      const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.result) return null;
      
      const tx = data.result;
      if (tx.to?.toLowerCase() !== expectedAddress.toLowerCase()) return null;
      
      const weiValue = parseInt(tx.value, 16);
      const ethValue = (weiValue / 1e18).toFixed(8);
      
      return {
        confirmed: tx.blockNumber !== null,
        amount: ethValue,
        toAddress: tx.to,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("ETH verification error:", error);
      return null;
    }
  }
  
  async verifyErc20Transaction(txHash: string, expectedAddress: string): Promise<BlockchainTxInfo | null> {
    try {
      const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.result || !data.result.logs) return null;
      
      const logs = data.result.logs;
      const transferLog = logs.find((log: any) => {
        const topics = log.topics;
        if (topics.length < 3) return false;
        const toAddress = "0x" + topics[2].slice(26);
        return toAddress.toLowerCase() === expectedAddress.toLowerCase();
      });
      
      if (!transferLog) return null;
      
      const amount = parseInt(transferLog.data, 16);
      const usdtAmount = (amount / 1000000).toFixed(2);
      
      return {
        confirmed: data.result.status === "0x1",
        amount: usdtAmount,
        toAddress: expectedAddress,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("ERC20 verification error:", error);
      return null;
    }
  }

  async verifyPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const payment = await storage.getSubscriptionPaymentById(paymentId);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }
    
    if (!payment.txHash) {
      return { success: false, message: "No transaction hash provided" };
    }
    
    if (payment.status === "confirmed") {
      return { success: true, message: "Payment already confirmed" };
    }
    
    let txInfo: BlockchainTxInfo | null = null;
    
    switch (payment.cryptoCurrency) {
      case "BTC":
        txInfo = await this.verifyBtcTransaction(payment.txHash, payment.cryptoAddress);
        break;
      case "USDT_TRC20":
        txInfo = await this.verifyTrc20Transaction(payment.txHash, payment.cryptoAddress);
        break;
      case "ETH":
        txInfo = await this.verifyEthTransaction(payment.txHash, payment.cryptoAddress);
        break;
      case "USDT_ERC20":
        txInfo = await this.verifyErc20Transaction(payment.txHash, payment.cryptoAddress);
        break;
      default:
        return { success: false, message: "Unsupported cryptocurrency" };
    }
    
    if (!txInfo) {
      return { success: false, message: "Transaction not found on blockchain" };
    }
    
    if (!txInfo.confirmed) {
      await storage.updateSubscriptionPayment(paymentId, { status: "verifying" });
      return { success: false, message: "Transaction pending confirmation" };
    }
    
    await storage.updateSubscriptionPayment(paymentId, {
      status: "confirmed",
      txVerified: true,
      txVerifiedAt: new Date(),
    });
    
    await this.activateSubscription(payment.advertiserId, payment.planId!, payment.billingCycle);
    
    return { success: true, message: "Payment verified and subscription activated" };
  }
  
  async activateSubscription(advertiserId: string, planId: string, billingCycle: string): Promise<void> {
    const subscription = await storage.getAdvertiserSubscription(advertiserId);
    if (!subscription) return;
    
    const periodStart = new Date();
    const periodEnd = new Date();
    
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    await storage.updateAdvertiserSubscription(subscription.id, {
      status: "active",
      planId,
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      lastPaymentAt: new Date(),
    });
  }
  
  async checkExpiredSubscriptions(): Promise<void> {
    const expiredTrials = await storage.getExpiredTrials();
    for (const trial of expiredTrials) {
      await storage.updateAdvertiserSubscription(trial.id, { status: "expired" });
    }
    
    const expiredSubs = await storage.getExpiredSubscriptions();
    for (const sub of expiredSubs) {
      await storage.updateAdvertiserSubscription(sub.id, { status: "expired" });
    }
    
    await storage.expireOldPayments();
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
