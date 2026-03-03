package com.calculator.backend.auth.security;

import com.calculator.backend.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class JwtFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserRepository userRepository;

  public JwtFilter(JwtService jwtService, UserRepository userRepository) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {

    String auth = request.getHeader("Authorization");

    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7);

      if (jwtService.isTokenValid(token) && SecurityContextHolder.getContext().getAuthentication() == null) {

        UUID userId = jwtService.extractUserId(token);

        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
          filterChain.doFilter(request, response);
          return;
        }

        var user = userOpt.get();

        if (user.isGuest()
            && user.getGuestExpiresAt() != null
            && user.getGuestExpiresAt().isBefore(LocalDateTime.now())) {
          filterChain.doFilter(request, response);
          return;
        }

        var authentication = new UsernamePasswordAuthenticationToken(
            userId,     
            null,
            List.of()
        );

        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }
    }

    filterChain.doFilter(request, response);
  }
}