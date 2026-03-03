package com.calculator.backend.auth.repository;

import com.calculator.backend.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.List;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByUsername(String username);

  boolean existsByUsername(String username);

  List<User> findAllByGuestTrueAndGuestExpiresAtBefore(LocalDateTime now);

}
