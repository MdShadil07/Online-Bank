document.addEventListener('DOMContentLoaded', () => {
  const transactionHistory = document.getElementById('transactionHistory');
  const pagination = document.getElementById('pagination');

  // Sample data for demonstration
  const transactions = [
    { id: 1, type: 'credit', amount: 5000, date: '2024-12-01 14:30', description: 'Salary Credit' },
    { id: 2, type: 'debit', amount: 2000, date: '2024-12-02 10:00', description: 'Bill Payment' },
    { id: 3, type: 'credit', amount: 1000, date: '2024-12-03 09:15', description: 'Refund' },
  ];

  // Populate transaction history
  function populateTransactions(page = 1) {
    transactionHistory.innerHTML = '';
    const itemsPerPage = 5;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedTransactions = transactions.slice(start, end);

    paginatedTransactions.forEach((txn) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${txn.id}</td>
        <td class="${txn.type === 'credit' ? 'transaction-credit' : 'transaction-debit'}">${txn.type.toUpperCase()}</td>
        <td>₹${txn.amount.toFixed(2)}</td>
        <td>${txn.date}</td>
        <td>${txn.description}</td>
      `;
      transactionHistory.appendChild(row);
    });

    // Render pagination
    renderPagination(Math.ceil(transactions.length / itemsPerPage), page);
  }

  // Render pagination
  function renderPagination(totalPages, currentPage) {
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => {
        e.preventDefault();
        populateTransactions(i);
      });
      pagination.appendChild(li);
    }
  }

  // Initialize
  populateTransactions();
});
