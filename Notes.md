
The first bug was the amount > balance in the withdraw
- fix by adding require(amount <= balances[msg.sender], "Insufficient balance")

The second bug was re-entrancy vulnerability in withdraw 
- fix by updating balance before external call
- to test this I created a malicious contract that works by re-entering the withdraw function through the receive() fallback

The third bug was tx.origin phishing 
- fix by using msg.sender instead of tx.origin for ownership checks because tx.origin can be spoofed by a malicious contract 

The tx.origin is the address that initiated the original transaction, while msg.sender is the direct caller of the function. This allows a malicious contract to call setOwner or emergencyWithdraw on behalf of the owner, bypassing the ownership check.

The fourth bug was emergencyWithdraw access control 
- fix by requiring msg.sender == owner

This ensures only the actual owner can trigger emergency withdrawals, preventing unauthorized users from accessing the vault's funds.


For the maxWithdrawal limit feature:
I used a conditional with custom error handling to revert if the withdrawal amount exceeds the set limit. 
```
if (maxWithdrawal > 0 && amount > maxWithdrawal) {
    revert ExceedsWithdrawalLimit(amount, maxWithdrawal);
}
```
My objective was show a different approach than using require statements for error handling and
also this way burn less gas than require with static strings.