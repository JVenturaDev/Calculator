package com.calculator.backend.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

  private final Key signingKey;
  private final long expirationMs;

  public JwtService(
    @Value("${security.jwt.secret}") String secret,
    @Value("${security.jwt.expiration-minutes:60}") long expirationMinutes
  ) {
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMinutes * 60_000L;
  }

  public String generateToken(UUID userId, String username) {
    Date now = new Date();
    Date exp = new Date(now.getTime() + expirationMs);

    return Jwts.builder()
      .setSubject(userId.toString())      
      .claim("username", username)        
      .setIssuedAt(now)
      .setExpiration(exp)
      .signWith(signingKey, SignatureAlgorithm.HS256)
      .compact();
  }

  public boolean isTokenValid(String token) {
    try {
      parseClaims(token);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public UUID extractUserId(String token) {
    String sub = parseClaims(token).getSubject();
    return UUID.fromString(sub);
  }

  public String extractUsername(String token) {
    Object v = parseClaims(token).get("username");
    return v == null ? null : v.toString();
  }

  private Claims parseClaims(String token) {
    return Jwts.parserBuilder()
      .setSigningKey(signingKey)
      .build()
      .parseClaimsJws(token)
      .getBody();
  }
}
