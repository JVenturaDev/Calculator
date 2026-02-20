package com.calculator.backend.workSpace.service;

import com.calculator.backend.auth.model.User;
import com.calculator.backend.workSpace.model.Step;
import com.calculator.backend.workSpace.model.WorkspaceCalculation;
import com.calculator.backend.workSpace.model.WorkspaceItem;
import com.calculator.backend.workSpace.repository.WorkspaceCalculationRepository;
import com.calculator.backend.workSpace.repository.WorkspaceItemRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WorkspaceService {

    private final WorkspaceItemRepository itemRepo;
    private final WorkspaceCalculationRepository calcRepo;

    public WorkspaceService(WorkspaceItemRepository itemRepo, WorkspaceCalculationRepository calcRepo) {
        this.itemRepo = itemRepo;
        this.calcRepo = calcRepo;
    }

    // ---------------- Workspace Items ----------------

    public WorkspaceItem createItem(UUID userId, String title, String type, List<String> tags) {
        WorkspaceItem item = new WorkspaceItem();
        item.setTitle(title);
        item.setType(type);
        item.setTags(tags);
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());

        User u = new User();
        u.setId(userId);
        item.setUser(u);

        return itemRepo.save(item);
    }

    public Optional<WorkspaceItem> getItem(UUID userId, @NonNull UUID id) {
        return itemRepo.findByIdAndUser_Id(id, userId);
    }

    public List<WorkspaceItem> getAllItems(UUID userId) {
        return itemRepo.findAllByUser_Id(userId);
    }

    @Transactional
    public WorkspaceItem updateItemExpression(UUID userId, @NonNull UUID id, String expression) {
        WorkspaceItem item = itemRepo.findByIdAndUser_Id(id, userId).orElseThrow();
        item.setCurrentExpression(expression);
        item.setUpdatedAt(LocalDateTime.now());
        return item;
    }

    public WorkspaceItem updateItemTags(UUID userId, @NonNull UUID id, List<String> tags) {
        WorkspaceItem item = itemRepo.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        item.setTags(tags);
        item.setUpdatedAt(LocalDateTime.now());
        itemRepo.save(item);
        return item;
    }

    @Transactional
    public void deleteItem(UUID userId, @NonNull UUID id) {
        WorkspaceItem item = itemRepo.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        calcRepo.deleteByWorkspaceItem_Id(item.getId());
        itemRepo.deleteById(item.getId());
    }

    // ---------------- Workspace Calculations ----------------

    @Transactional
    public WorkspaceCalculation addCalculation(
            UUID userId,
            @NonNull UUID itemId,
            String expression,
            String result,
            String stepsJson) {
        WorkspaceItem item = itemRepo.findByIdAndUser_Id(itemId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        WorkspaceCalculation calc = new WorkspaceCalculation();
        calc.setWorkspaceItem(item);
        calc.setExpression(expression);
        calc.setResult(result);

        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Step> stepsList = mapper.readValue(stepsJson, new TypeReference<List<Step>>() {
            });
            calc.setSteps(stepsList);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse steps JSON", e);
        }

        calc.setTimestamp(LocalDateTime.now());
        return calcRepo.save(calc);
    }

    public List<WorkspaceCalculation> getCalculationsForItem(UUID userId, UUID itemId) {
        boolean ownsItem = itemRepo.existsByIdAndUser_Id(itemId, userId);
        if (!ownsItem) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return calcRepo.findByWorkspaceItem_Id(itemId);
    }

}
