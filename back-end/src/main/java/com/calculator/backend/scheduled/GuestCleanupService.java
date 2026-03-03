package com.calculator.backend.scheduled;

import com.calculator.backend.auth.repository.UserRepository;
import com.calculator.backend.workSpace.repository.WorkspaceItemRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class GuestCleanupService {

    private final UserRepository userRepository;
    private final WorkspaceItemRepository workspaceItemRepository;

    public GuestCleanupService(UserRepository userRepository, WorkspaceItemRepository workspaceItemRepository) {
        this.userRepository = userRepository;
        this.workspaceItemRepository = workspaceItemRepository;
    }

    @Scheduled(cron = "0 0 * * * *") 
    @Transactional
    public void deleteExpiredGuests() {
        var expired = userRepository.findAllByGuestTrueAndGuestExpiresAtBefore(LocalDateTime.now());

        for (var guest : expired) {
            workspaceItemRepository.deleteAllByUser_Id(guest.getId()); 
            userRepository.delete(guest); 
        }
    }
}