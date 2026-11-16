
The first bug was the amount > balance in the withdraw
- fix by adding require(amount <= balances[msg.sender], "Insufficient balance")

The second bug was re-entrancy vulnerability in withdraw 
- fix by updating balance before external call
- to test this I created a malicious contract that works by re-entering the withdraw function through the receive() fallback

The third bug was tx.origin phishing 
- fix by using msg.sender instead of tx.origin for ownership checks because tx.origin can be spoofed by a malicious contract 

The tx.origin is the address that initiated the original transaction, while msg.sender is the direct caller of the function. This allows a malicious contract to call setOwner or emergencyWithdraw on behalf of the owner, bypassing the ownership check.
