"use client";

import { AppHeader } from "./app-header";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <AppHeader
      appName="Roofing Report"
      onMenuClick={onMenuClick}
    />
  );
}
