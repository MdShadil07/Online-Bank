CREATE TABLE TRANSACTIONS (
  TRANSACTIONID INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each transaction
  ACCOUNTNO INT(15) NOT NULL, -- Account Number of the user performing the transaction
  TRANSACTIONTYPE ENUM('credit', 'debit', 'transfer') NOT NULL, -- Type of transaction
  AMOUNT DECIMAL(15, 2) NOT NULL, -- Amount credited or debited
  BALANCEAFTER DECIMAL(15, 2) NOT NULL, -- Balance after the transaction
  RECEIVERACCOUNTNO INT(15) DEFAULT NULL, -- For transfers: receiver's account number
  TRANSACTIONDATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time of transaction
  DESCRIPTION TEXT DEFAULT NULL, -- Optional description of the transaction
  FOREIGN KEY (ACCOUNTNO) REFERENCES USERSIGNUP (ACCOUNTNO), -- Link to the user's account
  FOREIGN KEY (RECEIVERACCOUNTNO) REFERENCES USERSIGNUP (ACCOUNTNO) -- For transfers
);