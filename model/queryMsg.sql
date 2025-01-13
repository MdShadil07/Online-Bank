CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT(20) NOT NULL,  -- Matches the type of userId in usersignup
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES usersignup(userId)
);
