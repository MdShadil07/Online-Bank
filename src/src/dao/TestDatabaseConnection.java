package dao;

import java.sql.*;
import java.util.logging.Level;
import java.util.logging.Logger;

public class TestDatabaseConnection {

    private static final Logger logger = Logger.getLogger(TestDatabaseConnection.class.getName());

    public static void main(String[] args) {
        try {
            Connection connection = DatabaseConnection.initializeDatabase();
            System.out.println("Database connected successfully!");

            // Create table if it does not exist
            createTable(connection);

            // Perform CRUD operations
            insertData(connection, "John Doe", "john.doe@example.com", 28);
            insertData(connection, "Jane Smith", "jane.smith@example.com", 34);

            selectData(connection);

            updateData(connection, "John Doe", 29);

            deleteData(connection, "Jane Smith");

            // Close connection after operations
            connection.close();
            System.out.println("Connection closed successfully!");

        } catch (ClassNotFoundException e) {
            System.out.println("MySQL JDBC Driver not found. Include it in your library path.");
            e.printStackTrace();
        } catch (SQLException e) {
            System.out.println("Connection failed. Check your database URL, username, and password.");
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println("An error occurred during database operations.");
            e.printStackTrace();
        }
    }

    private static void createTable(Connection connection) throws SQLException {
        String createTableQuery = "CREATE TABLE IF NOT EXISTS users (" +
                "id INT AUTO_INCREMENT PRIMARY KEY, " +
                "name VARCHAR(100), " +
                "email VARCHAR(100), " +
                "age INT)";
        Statement statement = connection.createStatement();
        statement.executeUpdate(createTableQuery);
        System.out.println("Table 'users' created or already exists.");
        statement.close();
    }

    private static void insertData(Connection connection, String name, String email, int age) throws SQLException {
        String insertQuery = "INSERT INTO users (name, email, age) VALUES (?, ?, ?)";
        PreparedStatement preparedStatement = connection.prepareStatement(insertQuery);
        preparedStatement.setString(1, name);
        preparedStatement.setString(2, email);
        preparedStatement.setInt(3, age);
        int rowsAffected = preparedStatement.executeUpdate();
        System.out.println("Inserted " + rowsAffected + " row(s) for " + name + ".");
        preparedStatement.close();
    }

    private static void selectData(Connection connection) throws SQLException {
        String selectQuery = "SELECT * FROM users";
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery(selectQuery);
        System.out.println("Data from 'users' table:");
        while (resultSet.next()) {
            int id = resultSet.getInt("id");
            String name = resultSet.getString("name");
            String email = resultSet.getString("email");
            int age = resultSet.getInt("age");
            System.out.println("ID: " + id + ", Name: " + name + ", Email: " + email + ", Age: " + age);
        }
        resultSet.close();
        statement.close();
    }

    private static void updateData(Connection connection, String name, int newAge) throws SQLException {
        String updateQuery = "UPDATE users SET age = ? WHERE name = ?";
        PreparedStatement preparedStatement = connection.prepareStatement(updateQuery);
        preparedStatement.setInt(1, newAge);
        preparedStatement.setString(2, name);
        int rowsAffected = preparedStatement.executeUpdate();
        System.out.println("Updated " + rowsAffected + " row(s) where name is " + name);
        preparedStatement.close();
    }

    private static void deleteData(Connection connection, String name) throws SQLException {
        String deleteQuery = "DELETE FROM users WHERE name = ?";
        PreparedStatement preparedStatement = connection.prepareStatement(deleteQuery);
        preparedStatement.setString(1, name);
        int rowsAffected = preparedStatement.executeUpdate();
        System.out.println("Deleted " + rowsAffected + " row(s) where name is " + name);
        preparedStatement.close();
    }

    private static void performBatchOperations(Connection connection) throws SQLException {
        connection.setAutoCommit(false);
        Statement statement = connection.createStatement();

        try {
            String insert1 = "INSERT INTO users (name, email, age) VALUES ('Tom Hanks', 'tom.hanks@example.com', 63)";
            String insert2 = "INSERT INTO users (name, email, age) VALUES ('Meryl Streep', 'meryl.streep@example.com', 70)";
            String insert3 = "INSERT INTO users (name, email, age) VALUES ('Leonardo DiCaprio', 'leo.dicaprio@example.com', 50)";

            statement.addBatch(insert1);
            statement.addBatch(insert2);
            statement.addBatch(insert3);

            int[] affectedRows = statement.executeBatch();
            System.out.println("Batch execution completed. Rows affected: " + affectedRows.length);

            connection.commit();
            System.out.println("Transaction committed successfully.");
        } catch (SQLException e) {
            connection.rollback();
            System.out.println("Error during batch execution. Transaction rolled back.");
            throw e;
        } finally {
            statement.close();
        }
    }

    private static void executeTransaction(Connection connection) throws SQLException {
        try {
            connection.setAutoCommit(false);

            String updateSalaryQuery = "UPDATE users SET age = ? WHERE name = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(updateSalaryQuery);
            preparedStatement.setInt(1, 35);
            preparedStatement.setString(2, "John Doe");
            int rowsUpdated = preparedStatement.executeUpdate();
            System.out.println("Updated " + rowsUpdated + " row(s) during transaction.");

            String deleteQuery = "DELETE FROM users WHERE name = ?";
            preparedStatement = connection.prepareStatement(deleteQuery);
            preparedStatement.setString(1, "Meryl Streep");
            int rowsDeleted = preparedStatement.executeUpdate();
            System.out.println("Deleted " + rowsDeleted + " row(s) during transaction.");

            connection.commit();
            System.out.println("Transaction committed successfully.");

        } catch (SQLException e) {
            connection.rollback();
            System.out.println("Transaction failed. Rolled back changes.");
            throw e;
        }
    }

    private static void handleMultipleExceptions() {
        try {
            String invalidQuery = "SELECT * FROM nonexistent_table";
            Connection connection = DatabaseConnection.initializeDatabase();
            Statement statement = connection.createStatement();
            ResultSet resultSet = statement.executeQuery(invalidQuery);
            resultSet.close();
            statement.close();
        } catch (SQLException e) {
            System.out.println("SQL error encountered during query execution.");
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println("General error occurred.");
            e.printStackTrace();
        }
    }

    private static void simulateErrorHandling() {
        try {
            String invalidConnectionURL = "jdbc:mysql://localhost:3306/nonexistent_database";
            Connection connection = DriverManager.getConnection(invalidConnectionURL, "root", "password");
            System.out.println("Connection successful.");
            connection.close();
        } catch (SQLException e) {
            System.out.println("Error: Database not found.");
            e.printStackTrace();
        }
    }

    private static void mockDatabaseOperations() {
        try {
            Connection connection = DatabaseConnection.initializeDatabase();
            connection.setAutoCommit(false);
            Statement statement = connection.createStatement();

            String createMockTable = "CREATE TABLE IF NOT EXISTS mock_table (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "name VARCHAR(100), " +
                    "status VARCHAR(50))";
            statement.executeUpdate(createMockTable);
            System.out.println("Mock table created or already exists.");

            String insertMockData = "INSERT INTO mock_table (name, status) VALUES ('Mock User', 'Active')";
            statement.executeUpdate(insertMockData);
            System.out.println("Mock data inserted.");

            String selectMockData = "SELECT * FROM mock_table";
            ResultSet resultSet = statement.executeQuery(selectMockData);
            while (resultSet.next()) {
                System.out.println("ID: " + resultSet.getInt("id") + ", Name: " + resultSet.getString("name") + ", Status: " + resultSet.getString("status"));
            }

            resultSet.close();
            statement.close();
            connection.commit();
            connection.close();
            System.out.println("Mock operations completed successfully.");
        } catch (SQLException e) {
            System.out.println("Error in mock database operations.");
            e.printStackTrace();
        }
    }

    private static void logDatabaseConnectionInfo() {
        Connection connection = null;
        try {
            connection = DatabaseConnection.initializeDatabase();
            logger.log(Level.INFO, "Database connected: " + connection.getMetaData().getDatabaseProductName());
            System.out.println("Connection info logged successfully.");
        } catch (SQLException | ClassNotFoundException e) {
            logger.log(Level.SEVERE, "Error during connection", e);
            System.out.println("Failed to log database connection info.");
        } finally {
            if (connection != null) {
                try {
                    connection.close();
                } catch (SQLException e) {
                    logger.log(Level.SEVERE, "Error closing connection", e);
                }
            }
        }
    }
}
