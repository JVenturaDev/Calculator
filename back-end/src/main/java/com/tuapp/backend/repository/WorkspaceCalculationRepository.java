package com.tuapp.backend.repository;

import com.tuapp.backend.model.WorkspaceCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface WorkspaceCalculationRepository extends JpaRepository<WorkspaceCalculation, UUID> {
    List<WorkspaceCalculation> findByWorkspaceItemId(UUID workspaceItemId);
}
