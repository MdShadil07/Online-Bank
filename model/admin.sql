-- Create the Admin Table
CREATE TABLE admin (
    adminId SERIAL PRIMARY KEY, -- Unique ID for each admin
    username VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL UNIQUE, -- Admin's username
    password VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL, -- Admin's password (hashed)
    role ENUM('superadmin', 'admin') DEFAULT 'admin', -- Admin's role (Superadmin or Admin)
    email VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL, -- Admin's email
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the admin was created
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Timestamp when the admin's details were updated
);

-- Create Procedure to Add Money to User Account
DELIMITER //

CREATE PROCEDURE addMoneyToAccount(IN accountNo BIGINT(20), IN amount DECIMAL(15,2))
BEGIN
    DECLARE currentBalance DECIMAL(15,2);
    
    -- Get current balance
    SELECT accountBalance INTO currentBalance 
    FROM usersignup 
    WHERE accountNo = accountNo;

    -- Update account balance
    UPDATE usersignup
    SET accountBalance = currentBalance + amount
    WHERE accountNo = accountNo;
    
    -- Insert transaction record
    INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter)
    VALUES (accountNo, 'credit', amount, currentBalance + amount);
END //

DELIMITER ;

-- Create Procedure to Revoke a Transaction
DELIMITER //

CREATE PROCEDURE revokeTransaction(IN transactionId INT)
BEGIN
    DECLARE transType VARCHAR(10);
    DECLARE transAmount DECIMAL(15,2);
    DECLARE accountNo BIGINT(20);
    DECLARE currentBalance DECIMAL(15,2);

    -- Get transaction details
    SELECT transactionType, amount, accountNo INTO transType, transAmount, accountNo
    FROM transactions 
    WHERE transactionId = transactionId;

    -- Reverse the transaction
    IF transType = 'credit' THEN
        -- If it was a credit, subtract the amount
        SELECT accountBalance INTO currentBalance FROM usersignup WHERE accountNo = accountNo;
        UPDATE usersignup SET accountBalance = currentBalance - transAmount WHERE accountNo = accountNo;
    ELSEIF transType = 'debit' THEN
        -- If it was a debit, add the amount
        SELECT accountBalance INTO currentBalance FROM usersignup WHERE accountNo = accountNo;
        UPDATE usersignup SET accountBalance = currentBalance + transAmount WHERE accountNo = accountNo;
    END IF;

    -- Delete the transaction record (optional)
    DELETE FROM transactions WHERE transactionId = transactionId;
END //

DELIMITER ;

-- Create Procedure to Handle User Query
DELIMITER //

CREATE PROCEDURE handleUserQuery(IN queryId INT, IN status VARCHAR(20))
BEGIN
    -- Update the status of the query
    UPDATE user_queries
    SET status = status, resolvedAt = CURRENT_TIMESTAMP
    WHERE queryId = queryId;
END //

DELIMITER ;

-- Create Procedure to Check User Balance
DELIMITER //

CREATE PROCEDURE checkBalance(IN accountNo BIGINT(20))
BEGIN
    DECLARE balance DECIMAL(15,2);

    -- Get the balance
    SELECT accountBalance INTO balance 
    FROM usersignup 
    WHERE accountNo = accountNo;

    -- Return the balance (you may need to adjust based on your SQL environment)
    SELECT balance AS account_balance;
END //

DELIMITER ;

-- Create Procedure to Activate/Deactivate User Account
DELIMITER //

CREATE PROCEDURE changeAccountStatus(IN accountNo BIGINT(20), IN newStatus VARCHAR(10))
BEGIN
    -- Update account status (active or suspended)
    UPDATE usersignup
    SET accountStatus = newStatus
    WHERE accountNo = accountNo;
END //

DELIMITER ;
