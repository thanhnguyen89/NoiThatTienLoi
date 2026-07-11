import { useEffect } from 'react';

interface KeyboardShortcuts {
  onAdd?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onRefresh?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  onHelp?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow ESC even in inputs
        if (e.key === 'Escape' && shortcuts.onEscape) {
          shortcuts.onEscape();
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + N: Add new website
      if (modifier && e.key === 'n' && shortcuts.onAdd) {
        e.preventDefault();
        shortcuts.onAdd();
      }

      // Ctrl/Cmd + K: Focus search
      if (modifier && e.key === 'k' && shortcuts.onSearch) {
        e.preventDefault();
        shortcuts.onSearch();
      }

      // Ctrl/Cmd + E: Export
      if (modifier && e.key === 'e' && shortcuts.onExport) {
        e.preventDefault();
        shortcuts.onExport();
      }

      // Ctrl/Cmd + I: Import
      if (modifier && e.key === 'i' && shortcuts.onImport) {
        e.preventDefault();
        shortcuts.onImport();
      }

      // Ctrl/Cmd + R: Refresh
      if (modifier && e.key === 'r' && shortcuts.onRefresh) {
        e.preventDefault();
        shortcuts.onRefresh();
      }

      // Ctrl/Cmd + A: Select all
      if (modifier && e.key === 'a' && shortcuts.onSelectAll) {
        e.preventDefault();
        shortcuts.onSelectAll();
      }

      // ESC: Close modal/deselect
      if (e.key === 'Escape' && shortcuts.onEscape) {
        shortcuts.onEscape();
      }

      // ?: Show help
      if (e.key === '?' && shortcuts.onHelp) {
        e.preventDefault();
        shortcuts.onHelp();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

