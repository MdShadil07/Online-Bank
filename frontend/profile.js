// Toggle Mobile Menu
document.getElementById('mobile-menu')?.addEventListener('click', () => {
  const nav = document.querySelector('nav');
  nav.classList.toggle('active'); // Toggle the 'active' class to show/hide the menu
});

// Fetch and Display Profile Data
async function loadProfile() {
  try {
    const response = await fetch('/profileData/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load profile: ${response.statusText}`);
    }

    const profileData = await response.json();

    console.log('Updated Profile Data:', profileData);

    const usernameElement = document.getElementById('username');
    const fullName = document.getElementById('fullName');
    const emailElement = document.getElementById('email');
    const phoneElement = document.getElementById('phone');
    const DOBElement = document.getElementById('DOB');
    const genderElement = document.getElementById('gender');
    const addressElement = document.getElementById('address');
    const accountNumberElement = document.getElementById('accountNumber');
    const ifscCodeElement = document.getElementById('ifscCode');
    const balanceElement = document.getElementById('balance');
    const profileImageElement = document.getElementById('profileImage');

    if (fullName) fullName.textContent = profileData.fullName || 'Shadil';
    if (usernameElement) usernameElement.textContent = profileData.username || 'Unknown';
    if (emailElement) emailElement.textContent = profileData.email || 'No email provided';
    if (phoneElement) phoneElement.textContent = profileData.phone || 'No phone number';
    if (DOBElement) DOBElement.textContent = profileData.DOB || '12/02/2000';
    if (genderElement) genderElement.textContent = profileData.gender || 'Not provided';
    if (addressElement) addressElement.textContent = profileData.address || 'No address provided';
    if (accountNumberElement) accountNumberElement.textContent = profileData.accountNumber || 'N/A';
    if (ifscCodeElement) ifscCodeElement.textContent = profileData.ifscCode || 'Not provided';
    if (balanceElement) balanceElement.textContent = `₹${profileData.balance || 0}`;
    if (profileImageElement) profileImageElement.src = profileData.profileImage || 'assets/default-profile.PNG';
  } catch (error) {
    console.error('Error loading profile data:', error);
    const profileCard = document.getElementById('profileCard');
    if (profileCard) {
      profileCard.textContent = 'Failed to load profile information.';
    }
  }
}

// Periodically Fetch Updated Profile Data
setInterval(loadProfile, 2000); // Fetch and update profile data every 2 seconds

// On Page Load
window.onload = function () {
  loadProfile();
};

// Edit Profile Button Functionality
document.getElementById('editProfileBtn')?.addEventListener('click', () => {
  alert("Edit Profile functionality is under construction.");
});

// Logout Button Functionality
document.getElementById('logout')?.addEventListener('click', (event) => {
  event.preventDefault();
  fetch('/logout', { method: 'POST' })
      .then((response) => {
          if (response.ok) {
              window.location.href = '/login';
          } else {
              alert('Logout failed. Please try again.');
          }
      })
      .catch((error) => {
          console.error('Error:', error);
          alert('Logout failed. Please try again.');
      });
});

// Toggle Profile Card Visibility
document.getElementById("toggleProfileBtn")?.addEventListener("click", function () {
  const profileCard = document.getElementById("profileCard");
  profileCard.classList.toggle("open"); // Toggle the 'open' class to show/hide profile card
});

// Close Profile Card
document.getElementById("closeProfileBtn")?.addEventListener("click", function () {
  const profileCard = document.getElementById("profileCard");
  profileCard.classList.remove("open"); // Ensure the profile card is closed
});

// Periodically Fetch Updated Profile Data
setInterval(loadProfile, 2000); // Fetch and update profile data every 2 seconds

// On Page Load
window.onload = function() {
  loadProfile(); // Load profile data on page load
};
