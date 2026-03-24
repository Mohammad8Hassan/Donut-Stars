-- =========================================================
-- DONUT SHOP DATABASE SCHEMA
-- =========================================================
-- Important design rules for agents:
--
-- 1) All menu items (donuts, drinks, boxes) are stored in `products`.
-- 2) Boxes are identified by products.capacity != NULL.
-- 3) Donuts and drinks have capacity = NULL.
-- 4) order_items always reference products.id.
-- 5) If the ordered product is a box, its selected donuts are stored
--    in order_item_box_contents.
--
-- Example:
-- products
-- id | name           | capacity
-- 1  | Chocolate Donut| NULL
-- 2  | Regular Coffee | NULL
-- 3  | 6-Donut Box    | 6
--
-- order_items
-- id | order_id | product_id
-- 5  | 10       | 3   <-- 6-donut box
--
-- order_item_box_contents
-- order_item_id | donut_product_id | quantity
-- 5             | 1                | 2
-- 5             | 4                | 4
--
-- This means the customer selected 6 donuts inside that box.
-- =========================================================


DROP TABLE IF EXISTS users;


-- =========================================================
-- ROLES
-- =========================================================
-- User roles such as: admin, customer
-- Referenced by users.role_id
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;



-- =========================================================
-- USERS
-- =========================================================
-- Registered accounts.
-- role_id determines permissions.
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  role_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  phone VARCHAR(30),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Soft delete timestamp. If not NULL the user is considered deleted.
  deleted_at TIMESTAMP NULL,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;



-- =========================================================
-- ADDRESSES
-- =========================================================
-- Users may store multiple delivery addresses.
CREATE TABLE addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  user_id BIGINT UNSIGNED NOT NULL,

  label VARCHAR(50),
  line1 VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  country VARCHAR(100) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;



-- =========================================================
-- PRODUCT CATEGORIES
-- =========================================================
-- Typical rows:
-- 1 = Donuts
-- 2 = Drinks
-- 3 = Boxes
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;



-- =========================================================
-- PRODUCTS
-- =========================================================
-- Central catalog table.
-- Stores ALL menu items:
--   donuts
--   drinks
--   boxes
--
-- How to detect product type:
--
-- Donut:
--   category = Donuts
--   capacity = NULL
--
-- Drink:
--   category = Drinks
--   capacity = NULL
--
-- Box product:
--   category = Boxes
--   capacity = 3 / 6 / 12
--
-- Boxes themselves contain no predefined donuts.
-- Their chosen donuts are stored per order in order_item_box_contents.
CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  category_id INT UNSIGNED NOT NULL,

  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,

  price DECIMAL(10,2) NOT NULL,

  image VARCHAR(255),

  -- If FALSE the product is hidden from the menu but
  -- still exists for historical order records.
  is_active BOOLEAN DEFAULT TRUE,

  -- Optional UI color used by the frontend.
  tint VARCHAR(20) DEFAULT NULL,

  -- NULL = normal product
  -- 3 / 6 / 12 = donut box capacity
  capacity INT DEFAULT NULL,

  KEY idx_products_category (category_id),

  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- ORDERS
-- =========================================================
-- Represents a purchase.
-- user_id may be NULL for guest checkout.
--
-- Address fields are stored as a snapshot on the order itself,
-- so old orders remain accurate even if the user later edits or
-- deletes saved addresses.
--
-- Payment fields store safe operational details only.
-- Do NOT store full card number, expiry, or CVV.
-- payment_meta may store gateway/provider-specific extra data.
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  user_id BIGINT UNSIGNED NULL,

  status ENUM('pending','paid','shipped','completed','cancelled')
    DEFAULT 'pending',

  payment_status ENUM('pending','paid','failed','refunded')
    DEFAULT 'pending',
  payment_method VARCHAR(50) NULL,
  payment_provider VARCHAR(50) NULL,
  payment_reference VARCHAR(255) NULL,
  payment_last4 VARCHAR(4) NULL,
  payment_meta JSON NULL,

  shipping_name VARCHAR(100) NOT NULL,
  shipping_phone VARCHAR(30) NULL,
  shipping_line1 VARCHAR(255) NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NULL,
  shipping_country VARCHAR(100) NOT NULL,

  customer_note TEXT NULL,

  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,

  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- ORDER ITEMS
-- =========================================================
-- One row per product purchased.
--
-- product_id ALWAYS references products.id.
--
-- If the product is a donut or drink:
--   nothing special is needed.
--
-- If the product is a box (capacity != NULL):
--   its selected donuts will appear in
--   order_item_box_contents.
CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  order_id BIGINT UNSIGNED NOT NULL,

  product_id BIGINT UNSIGNED NOT NULL,

  quantity INT NOT NULL DEFAULT 1,

  -- Price snapshot at time of purchase
  unit_price DECIMAL(10,2) NOT NULL,

  PRIMARY KEY (id),

  KEY idx_items_order (order_id),
  KEY idx_items_product (product_id),

  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_items_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- ORDER ITEM BOX CONTENTS
-- =========================================================
-- Stores which donuts were selected inside a purchased box.
--
-- Each row belongs to ONE order item.
-- order_item_id must reference a box product.
--
-- donut_product_id must reference a donut product.
--
-- Example:
--
-- order_items
-- id | product_id
-- 7  | (6-donut box)
--
-- order_item_box_contents
-- order_item_id | donut_product_id | quantity
-- 7             | chocolate donut  | 2
-- 7             | strawberry donut | 4
CREATE TABLE order_item_box_contents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  order_item_id BIGINT UNSIGNED NOT NULL,

  donut_product_id BIGINT UNSIGNED NOT NULL,

  quantity INT NOT NULL DEFAULT 1,

  PRIMARY KEY (id),

  KEY idx_oibc_item (order_item_id),
  KEY idx_oibc_donut (donut_product_id),

  CONSTRAINT fk_oibc_item
    FOREIGN KEY (order_item_id)
    REFERENCES order_items(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_oibc_donut
    FOREIGN KEY (donut_product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- SESSIONS
-- =========================================================
-- Optional server-side session store.
CREATE TABLE sessions (
  id VARCHAR(255) NOT NULL,

  user_id BIGINT UNSIGNED NOT NULL,

  expires_at DATETIME NOT NULL,

  data JSON DEFAULT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_sessions_user (user_id),

  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- PASSWORD RESETS
-- =========================================================
-- Password recovery tokens.
CREATE TABLE password_resets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,

  user_id BIGINT UNSIGNED NOT NULL,

  token VARCHAR(255) NOT NULL,

  expires_at DATETIME NOT NULL,

  used TINYINT(1) NOT NULL DEFAULT 0,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_pr_user (user_id),

  CONSTRAINT fk_pr_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TAGS
-- =========================================================
-- Reusable product badges / labels.
-- Examples:
--   fruit
--   bestseller
--   seasonal
--   new
--
-- These are NOT product categories.
-- Categories answer "what kind of product is this?"
-- Tags answer "what extra label/attribute does it have?"
CREATE TABLE tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =========================================================
-- PRODUCT_TAGS
-- =========================================================
-- Junction table between products and tags.
--
-- One product can have many tags.
-- One tag can belong to many products.
--
-- Example:
-- products: Mango Donut
-- tags: fruit, bestseller
-- product_tags:
--   (product_id = Mango Donut, tag_id = fruit)
--   (product_id = Mango Donut, tag_id = bestseller)
--
-- ON DELETE CASCADE means:
-- - if a product is deleted, its product_tags links are deleted too
-- - if a tag is deleted, its product_tags links are deleted too
CREATE TABLE product_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,

  PRIMARY KEY (id),

  KEY idx_product_tags_product (product_id),
  KEY idx_product_tags_tag (tag_id),

  UNIQUE KEY uk_product_tag (product_id, tag_id),

  CONSTRAINT fk_product_tags_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_product_tags_tag
    FOREIGN KEY (tag_id)
    REFERENCES tags(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;