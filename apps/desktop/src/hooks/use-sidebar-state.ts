import { useState } from "react";
import type { ConnectionConfig } from "@/shared/types/connection";

export function useSidebarState() {
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<
    ConnectionConfig | undefined
  >(undefined);

  function handleOpenCreate() {
    setEditingConnection(undefined);
    setFormOpen(true);
  }

  function handleEdit(connection: ConnectionConfig) {
    setEditingConnection(connection);
    setFormOpen(true);
  }

  function handleOpenSettings() {
    setSettingsOpen(true);
  }

  return {
    formOpen,
    setFormOpen,
    settingsOpen,
    setSettingsOpen,
    editingConnection,
    handleOpenCreate,
    handleEdit,
    handleOpenSettings,
  };
}
