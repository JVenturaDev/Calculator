package com.calculator.backend.workSpace.repository;

import com.calculator.backend.workSpace.model.WorkspaceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceItemRepository extends JpaRepository<WorkspaceItem, UUID> {

  List<WorkspaceItem> findAllByUser_Id(UUID userId);

  Optional<WorkspaceItem> findByIdAndUser_Id(UUID id, UUID userId);

  boolean existsByIdAndUser_Id(UUID id, UUID userId);
}
