CREATE TABLE usersignup (
    userId BIGINT(20) AUTO_INCREMENT PRIMARY KEY, -- Define userId explicitly as BIGINT with AUTO_INCREMENT
    firstName VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
    lastName VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
    DOB DATE NOT NULL,
    email VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL UNIQUE,
    gender VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL,
    password VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    initialDeposit DECIMAL(10,2) DEFAULT 0.00,
    accountNo BIGINT(20) DEFAULT NULL UNIQUE,
    accountType VARCHAR(55) COLLATE utf8mb4_general_ci NOT NULL,
    fullName VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    phoneNumber VARCHAR(15) COLLATE utf8mb4_general_ci NOT NULL UNIQUE,
    address TEXT COLLATE utf8mb4_general_ci NOT NULL,
    accountBalance DECIMAL(15,2) DEFAULT 0.00,
    ifscCode VARCHAR(15) COLLATE utf8mb4_general_ci NOT NULL,
    branchName VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    profilePicture VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
    securityQuestion VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
    securityAnswer VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
    twoFAEnabled TINYINT(1) DEFAULT 0,
    twoFASecret VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
    accountStatus VARCHAR(10) COLLATE utf8mb4_general_ci DEFAULT 'active' CHECK (accountStatus IN ('active', 'suspended', 'deleted')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Trigger to update the updatedAt column
DELIMITER //
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON usersignup
FOR EACH ROW
BEGIN
    SET NEW.updatedAt = CURRENT_TIMESTAMP;
END;
//
DELIMITER ;

-- Procedure to generate account number and IFSC code
DELIMITER //
CREATE PROCEDURE generateAccountDetails(IN userId INT)
BEGIN
    DECLARE newAccountNo BIGINT;
    SET newAccountNo = FLOOR(RAND() * 10000000000);
    
    UPDATE usersignup
    SET accountNo = newAccountNo,
        ifscCode = CONCAT('SHA', RIGHT(newAccountNo, 3))
    WHERE userId = userId;
END;
//
DELIMITER ;

-- Function to check if an account is active
DELIMITER //
CREATE FUNCTION isAccountActive(accountNo BIGINT) RETURNS BOOLEAN
BEGIN
    DECLARE status VARCHAR(10);
    
    SELECT accountStatus INTO status
    FROM usersignup
    WHERE accountNo = accountNo;
    
    RETURN status = 'active';
END;
//
DELIMITER ;

-- Procedure to update account balance
DELIMITER //
CREATE PROCEDURE updateAccountBalance(IN accountNo BIGINT, IN amount DECIMAL(15,2), IN transactionType VARCHAR(6))
BEGIN
    IF transactionType = 'credit' THEN
        UPDATE usersignup
        SET accountBalance = accountBalance + amount
        WHERE accountNo = accountNo;
    ELSEIF transactionType = 'debit' THEN
        UPDATE usersignup
        SET accountBalance = accountBalance - amount
        WHERE accountNo = accountNo AND accountBalance >= amount;
    END IF;
END;
//
DELIMITER ;

-- Procedure to handle user login
DELIMITER //
CREATE PROCEDURE userLogin(IN emailInput VARCHAR(50), IN passwordInput VARCHAR(255), OUT loginStatus BOOLEAN)
BEGIN
    DECLARE dbPassword VARCHAR(255);
    DECLARE accountActive BOOLEAN;
    
    SELECT password INTO dbPassword
    FROM usersignup
    WHERE email = emailInput;
    
    IF dbPassword = passwordInput THEN
        SET accountActive = isAccountActive((SELECT accountNo FROM usersignup WHERE email = emailInput));
        IF accountActive THEN
            SET loginStatus = TRUE;
        ELSE
            SET loginStatus = FALSE;
        END IF;
    ELSE
        SET loginStatus = FALSE;
    END IF;
END;
//
DELIMITER ;

-- Procedure to deactivate an account
DELIMITER //
CREATE PROCEDURE deactivateAccount(IN userId INT)
BEGIN
    UPDATE usersignup
    SET accountStatus = 'suspended'
    WHERE userId = userId;
END;
//
DELIMITER ;
