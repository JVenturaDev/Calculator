package com.tuapp.backend.service;

import com.tuapp.backend.model.WorkspaceItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuapp.backend.model.Step;
import com.tuapp.backend.model.WorkspaceCalculation;
import com.tuapp.backend.repository.WorkspaceItemRepository;
import com.tuapp.backend.repository.WorkspaceCalculationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import com.fasterxml.jackson.core.type.TypeReference;
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

    public WorkspaceItem createItem(String title, String type, List<String> tags) {
        WorkspaceItem item = new WorkspaceItem();
        item.setTitle(title);
        item.setType(type);
        item.setTags(tags);
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        return itemRepo.save(item);
    }

    public Optional<WorkspaceItem> getItem(@NonNull UUID id) {
        return itemRepo.findById(id);
    }

    public List<WorkspaceItem> getAllItems() {
        return itemRepo.findAll();
    }

    @Transactional
    public WorkspaceItem updateItemExpression(@NonNull UUID id, String expression) {
        WorkspaceItem item = itemRepo.findById(id).orElseThrow();
        item.setCurrentExpression(expression);
        item.setUpdatedAt(LocalDateTime.now());
        return item;
    }

    @Transactional
    public void deleteItem(@NonNull UUID id) {
        itemRepo.deleteById(id);
    }

    public WorkspaceItem updateItemTags(UUID id, List<String> tags) {
        WorkspaceItem item = getItem(id).orElseThrow(() -> new RuntimeException("Item not found"));
        item.setTags(tags);
        item.setUpdatedAt(LocalDateTime.now());
        itemRepo.save(item);
        return item;
    }

    // ---------------- Workspace Calculations ----------------

    @Transactional
    public WorkspaceCalculation addCalculation(@NonNull UUID itemId, String expression, String result,
            String stepsJson) {

        WorkspaceItem item = itemRepo.findById(itemId).orElseThrow();

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

    public List<WorkspaceCalculation> getCalculationsForItem(UUID itemId) {
        return calcRepo.findByWorkspaceItemId(itemId);
    }
}
