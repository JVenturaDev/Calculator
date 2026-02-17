package com.calculator.backend.workSpace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.calculator.backend.workSpace.model.WorkspaceCalculation;

import java.util.UUID;
import java.util.List;

@Repository
public interface WorkspaceCalculationRepository extends JpaRepository<WorkspaceCalculation, UUID> {

    void deleteByWorkspaceItem_Id(UUID itemId);

    List<WorkspaceCalculation> findByWorkspaceItem_Id(UUID itemId);
}
