CREATE TABLE usersignup (
    userId SERIAL PRIMARY KEY,
    firstName VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
    lastName VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
    DOB DATE NOT NULL,
    email VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
    gender VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL,
    password VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    initialDeposit DECIMAL(10,2) DEFAULT 0.00,
    accountNo BIGINT(20) DEFAULT NULL,
    accountType VARCHAR(55) COLLATE utf8mb4_general_ci NOT NULL,
    fullName VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    phoneNumber VARCHAR(15) COLLATE utf8mb4_general_ci NOT NULL,
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
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_accountNo ON usersignup(accountNo);
CREATE UNIQUE INDEX accountNo_UNIQUE ON usersignup(accountNo);
CREATE INDEX accountNo_2 ON usersignup(accountNo);

-- Trigger to update updatedAt column
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON usersignup
FOR EACH ROW
SET NEW.updatedAt = CURRENT_TIMESTAMP;
