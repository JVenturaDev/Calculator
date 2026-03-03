package com.calculator.backend.auth.controller;

import com.calculator.backend.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  public record AuthRequest(String username, String password) {
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody AuthRequest req) {
    authService.register(req.username(), req.password());
    return ResponseEntity.ok().body("registered");
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody AuthRequest req) {
    String token = authService.login(req.username(), req.password());
    return ResponseEntity.ok(new TokenResponse(token));
  }

  @PostMapping("/guest")
  public ResponseEntity<?> guest() {
    String token = authService.guest();
    return ResponseEntity.ok(new TokenResponse(token));
  }

  public record TokenResponse(String token) {
  }

}
