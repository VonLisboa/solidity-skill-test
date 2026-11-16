
The first bug was the amount > balance in the withdraw
- fix by adding require(amount <= balances[msg.sender], "Insufficient balance")

The second bug was re-entrancy vulnerability in withdraw 
- fix by updating balance before external call
- to test this I created a malicious contract that works by re-entering the withdraw function through the receive() fallback
