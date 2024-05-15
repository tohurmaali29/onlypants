// Toggle class active untuk hamburger menu
const navbarNav = document.querySelector(".navbar-nav");
// Ketika hamburger menu di klik
document.querySelector("#hamburger-menu").onclick = (e) => {
  navbarNav.classList.toggle("active");
  e.preventDefault();
};

// Toggle class active untuk form
const searchForm = document.querySelector(".search-form");
const searchBox = document.querySelector("#search-box");

document.querySelector("#search-btn").onclick = (e) => {
  searchForm.classList.toggle("active");
  searchBox.focus();
  e.preventDefault();
};

// Toggle class active untuk shopping cart
const shoppingCart = document.querySelector(".shopping-cart");

document.querySelector("#shopping-cart-btn").onclick = (e) => {
  shoppingCart.classList.toggle("active");
  e.preventDefault();
};

// Click di luar elemen
const hamburger = document.querySelector("#hamburger-menu");
const searchbar = document.querySelector("#search-btn");
const shoppingcrt = document.querySelector("#shopping-cart-btn");

document.addEventListener("click", function (e) {
  if (!hamburger.contains(e.target) && !navbarNav.contains(e.target)) {
    navbarNav.classList.remove("active");
  }
  if (!searchbar.contains(e.target) && !searchForm.contains(e.target)) {
    searchForm.classList.remove("active");
  }
  if (!shoppingcrt.contains(e.target) && !shoppingCart.contains(e.target)) {
    shoppingCart.classList.remove("active");
  }
});

// Modal box
const itemDetailModal = document.querySelector("#item-detail-modal");
const itemDetailBtns = document.querySelectorAll(".item-detail-btn");

itemDetailBtns.forEach((btn) => {
  btn.onclick = (e) => {
    itemDetailModal.style.display = "flex";
    e.preventDefault();
  };
});

// Click tombol close modal
document.querySelector(".modal .close-icon").onclick = (e) => {
  itemDetailModal.style.display = "none";
  e.preventDefault();
};

// Click di luar modal
window.onclick = (e) => {
  if (e.target === itemDetailModal) {
    itemDetailModal.style.display = "none";
  }
};

// Function untuk menambahkan produk ke dalam keranjang
function addToCart(title, price, imageSrc) {
  const cartItem = document.createElement("div");
  cartItem.classList.add("cart-item");
  cartItem.innerHTML = `
    <img src="${imageSrc}" alt="${title}">
    <div class="item-detail">
      <h3>${title}</h3>
      <div class="item-price">${price}</div>
    </div>
    <i data-feather="trash-2" class="remove-item"></i>
  `;
  shoppingCart.appendChild(cartItem);
  feather.replace(); // Update feather icons

  // Add event listener to remove button
  cartItem.querySelector(".remove-item").addEventListener("click", function () {
    cartItem.remove();
    updateCartTotal();
  });

  updateCartTotal();
}

// Function untuk memperbarui total harga di keranjang
function updateCartTotal() {
  const cartItems = document.querySelectorAll(".cart-item");
  let total = 0;

  cartItems.forEach((item) => {
    const priceElement = item.querySelector(".item-price");
    let price = parseFloat(priceElement.innerText.replace("IDR ", "").replace("K", "000"));
    total += price;
  });

  const totalElement = document.querySelector(".cart-total");
  totalElement.innerText = "Total: IDR " + total.toLocaleString();
}

// Add event listeners to "add to cart" buttons in menu section
const addToCartButtonsMenu = document.querySelectorAll(".menu-card .menu-icon a:first-child");

addToCartButtonsMenu.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const menuCard = button.closest(".menu-card");
    const title = menuCard.querySelector(".menu-card-tittle").innerText;
    const price = menuCard.querySelector(".menu-card-price").innerText;
    const imageSrc = menuCard.querySelector(".menu-card-img").src;
    addToCart(title, price, imageSrc);
  });
});

// Add event listeners to "add to cart" buttons in best merch section
const addToCartButtonsBestMerch = document.querySelectorAll(".product-card .product-icon a:first-child");

addToCartButtonsBestMerch.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const productCard = button.closest(".product-card");
    const title = productCard.querySelector(".product-content h3").innerText;
    const price = productCard.querySelector(".product-price").innerText;
    const imageSrc = productCard.querySelector(".product-image img").src;
    addToCart(title, price, imageSrc);
  });
});

// Initial setup to handle existing remove buttons in cart
const removeButtons = document.querySelectorAll(".remove-item");

removeButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const cartItem = button.closest(".cart-item");
    cartItem.remove();
    updateCartTotal();
  });
});

// Handle checkout button click
const checkoutButton = document.querySelector("#checkout-btn");
checkoutButton.addEventListener("click", () => {
  alert("Proceeding to checkout...");
  // You can add more logic here for actual payment process
});
