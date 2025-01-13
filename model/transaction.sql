-- Create the TRANSACTIONS Table
CREATE TABLE transactions (
    transactionId INT AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each transaction
    accountNo BIGINT(20) NOT NULL, -- Account Number of the user performing the transaction (use BIGINT if the accountNo is BIGINT in usersignup)
    transactionType ENUM('credit', 'debit', 'transfer') NOT NULL, -- Type of transaction
    amount DECIMAL(15, 2) NOT NULL, -- Amount credited or debited
    balanceAfter DECIMAL(15, 2) NOT NULL, -- Balance after the transaction
    receiverAccountNo BIGINT(20) DEFAULT NULL, -- For transfers: receiver's account number (use BIGINT)
    transactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time of transaction
    description TEXT DEFAULT NULL, -- Optional description of the transaction
    FOREIGN KEY (accountNo) REFERENCES usersignup (accountNo) ON DELETE CASCADE, -- Link to the user's account
    FOREIGN KEY (receiverAccountNo) REFERENCES usersignup (accountNo) ON DELETE CASCADE -- For transfers
);


DELIMITER //

CREATE PROCEDURE addTransaction(
    IN accountNo BIGINT(20),  -- Account Number
    IN transactionType VARCHAR(10),  -- Use VARCHAR for ENUM values
    IN amount DECIMAL(15,2),  -- Transaction amount
    IN receiverAccountNo BIGINT(20),  -- For transfers: receiver's account number
    IN description VARCHAR(255)  -- Optional description of the transaction
)
BEGIN
    DECLARE balance DECIMAL(15,2);
    DECLARE receiverBalance DECIMAL(15,2);
    
    -- Start a transaction to ensure atomicity of the operations
    START TRANSACTION;
    
    -- Get the current balance of the user
    SELECT accountBalance INTO balance 
    FROM usersignup 
    WHERE accountNo = accountNo;
    
    -- Check if the user exists
    IF balance IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User account not found';
    END IF;

    -- Handle different types of transactions
    IF transactionType = 'credit' THEN
        -- Credit transaction: increase balance
        SET balance = balance + amount;
        
        -- Update the user's balance in the USERSIGNUP table
        UPDATE usersignup
        SET accountBalance = balance
        WHERE accountNo = accountNo;

        -- Insert the transaction record into the TRANSACTIONS table
        INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description)
        VALUES (accountNo, transactionType, amount, balance, receiverAccountNo, description);
        
    ELSEIF transactionType = 'debit' THEN
        -- Debit transaction: decrease balance (check if sufficient funds)
        IF balance >= amount THEN
            SET balance = balance - amount;
            
            -- Update the user's balance in the USERSIGNUP table
            UPDATE usersignup
            SET accountBalance = balance
            WHERE accountNo = accountNo;
            
            -- Insert the transaction record into the TRANSACTIONS table
            INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description)
            VALUES (accountNo, transactionType, amount, balance, receiverAccountNo, description);
        ELSE
            -- If insufficient funds, raise an error
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds';
        END IF;

    ELSEIF transactionType = 'transfer' THEN
        -- Transfer transaction (debiting sender and crediting receiver)
        IF balance >= amount THEN
            -- Debit from sender's account
            SET balance = balance - amount;
            
            -- Get the current balance of the receiver
            SELECT accountBalance INTO receiverBalance 
            FROM usersignup 
            WHERE accountNo = receiverAccountNo;
            
            -- Check if receiver account exists
            IF receiverBalance IS NULL THEN
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account not found';
            END IF;
            
            -- Update the sender's balance
            UPDATE usersignup
            SET accountBalance = balance
            WHERE accountNo = accountNo;

            -- Credit the receiver's account
            SET receiverBalance = receiverBalance + amount;
            UPDATE usersignup
            SET accountBalance = receiverBalance
            WHERE accountNo = receiverAccountNo;

            -- Insert the transaction record into the TRANSACTIONS table
            INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description)
            VALUES (accountNo, transactionType, amount, balance, receiverAccountNo, description);

            -- Insert the transaction record for the receiver as well
            INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description)
            VALUES (receiverAccountNo, 'credit', amount, receiverBalance, accountNo, description);

        ELSE
            -- If insufficient funds for transfer, raise an error
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds for transfer';
        END IF;

    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transaction type';
    END IF;

    -- Commit the transaction to make the changes permanent
    COMMIT;

END;
//
DELIMITER ;
