package com.calculator.backend.auth.service;

import com.calculator.backend.auth.security.JwtService;

import com.calculator.backend.auth.model.User;
import com.calculator.backend.auth.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;

  }

  public void register(String username, String password) {
    if (userRepository.existsByUsername(username)) {
      throw new IllegalArgumentException("Username not available");
    }

    User user = new User();
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(password));

    userRepository.save(user);
  }

  public String login(String username, String password) {
    User user = userRepository.findByUsername(username)
        .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw new IllegalArgumentException("Invalid credentials");
    }

    return jwtService.generateToken(user.getId(), user.getUsername());
  }

  public String guest() {
    User user = new User();

    user.setUsername("guest_" + java.util.UUID.randomUUID());
    user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));

    user.setGuest(true);
    user.setGuestExpiresAt(java.time.LocalDateTime.now().plusHours(24));

    user = userRepository.save(user);

    return jwtService.generateToken(user.getId(), user.getUsername());
  }

}
