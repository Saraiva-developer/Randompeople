CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  account_type ENUM('professional','common') NOT NULL DEFAULT 'professional',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(50) NOT NULL,
  data_json LONGTEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_user (user_id),
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  profile_ref VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved_user_profile (user_id, profile_ref),
  INDEX idx_saved_user (user_id),
  CONSTRAINT fk_saved_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_settings (
  user_id INT PRIMARY KEY,
  receive_mode ENUM('all','approved','off') NOT NULL DEFAULT 'approved',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recommendation_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  target_user_id INT NOT NULL,
  status ENUM('pending','approved','blocked','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recommendation_permissions_pair (user_id, target_user_id),
  INDEX idx_recommendation_permissions_target (target_user_id, status),
  CONSTRAINT fk_recommendation_permissions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recommendation_permissions_target
    FOREIGN KEY (target_user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_user_id INT NOT NULL,
  receiver_user_id INT NOT NULL,
  profile_id INT NULL,
  profile_slug VARCHAR(190) NULL,
  source_profile_name VARCHAR(160) NULL,
  content_type ENUM('profile','photo','video','reel') NOT NULL DEFAULT 'profile',
  content_uri TEXT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendations_receiver (receiver_user_id, expires_at, created_at),
  INDEX idx_recommendations_sender (sender_user_id, created_at),
  CONSTRAINT fk_recommendations_sender
    FOREIGN KEY (sender_user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recommendations_receiver
    FOREIGN KEY (receiver_user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recommendations_profile
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendation_reactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recommendation_id BIGINT NOT NULL,
  user_id INT NOT NULL,
  reaction ENUM('like','fire','wow','love') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recommendation_reactions_pair (recommendation_id, user_id),
  INDEX idx_recommendation_reactions_user (user_id),
  CONSTRAINT fk_recommendation_reactions_recommendation
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recommendation_reactions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
