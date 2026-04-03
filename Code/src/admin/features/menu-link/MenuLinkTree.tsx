'use client';

import { useState, useCallback, useMemo, useRef } from 'react';

export interface MenuLinkNode {
  id: string;
  title: string | null;
  slug: string | null;
  target: string | null;
  menuId: bigint | null;
  icon: string | null;
  parentId: string | null;
  entityId: bigint | null;
  entityName: string | null;
  nofollow: boolean | null;
  level: number | null;
  sortOrder: number | null;
  createdDate: Date | null;
  lastUpdDate: Date | null;
  _local?: boolean;
  _children?: MenuLinkNode[];
}

const S = {
  row: (isRoot: boolean, depth: number): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '5px 8px',
    paddingLeft: isRoot ? 8 : 8 + depth * 24,
    borderBottom: '1px solid #e0e0e0',
    background: '#fff',
    minHeight: 36,
  }),
  dragOver: (): React.CSSProperties => ({
    outline: '2px dashed #00BCD4',
    background: '#e0f7fa',
  }),
  actionGroup: (): React.CSSProperties => ({
    display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center',
  }),
  btn: (bg: string, color = '#fff'): React.CSSProperties => ({
    width: 22, height: 22, border: 'none', borderRadius: 3,
    background: bg, color, cursor: 'pointer', fontSize: 11,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }),
};

interface TreeNodeProps {
  node: MenuLinkNode;
  siblings: MenuLinkNode[];
  siblingIndex: number;
  menuLinks: MenuLinkNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (node: MenuLinkNode) => void;
  onDelete: (node: MenuLinkNode) => void;
  onMoveUp: (node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => void;
  onMoveDown: (node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => void;
  onMoveIntoNearestFolder: (node: MenuLinkNode) => void;
  onMoveOutOfCurrentFolder: (node: MenuLinkNode) => void;
  onDrop: (nodeId: string, targetId: string, position: 'before' | 'after' | 'into') => void;
  depth: number;
}

function TreeNode({
  node, siblings, siblingIndex, menuLinks,
  expandedIds, onToggleExpand,
  onEdit, onDelete, onMoveUp, onMoveDown,
  onMoveIntoNearestFolder, onMoveOutOfCurrentFolder,
  onDrop,
  depth,
}: TreeNodeProps) {
  const isRoot = node.parentId === null;
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblings.length - 1;

  // Item has children if there are any links whose parentId matches this node's id
  const children = menuLinks.filter((n) => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === node.id) return;

    // Determine position based on mouse Y relative to midpoint of row
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: 'before' | 'after' | 'into' =
      e.clientY < midY ? 'before' : isExpanded && hasChildren && e.clientY < rect.top + rect.height * 0.7 ? 'before' : 'after';
    onDrop(draggedId, node.id, position);
  }

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === node.id) return;
    onDrop(draggedId, node.id, 'into');
  }

  return (
    <>
      <div
        style={{ ...S.row(isRoot, depth), ...(isDragOver ? S.dragOver() : {}) }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/collapse toggle — only for items with children */}
        <div style={{ width: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasChildren ? (
            <button type="button"
              title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              style={{ ...S.btn('transparent', '#9e9e9e'), width: 16, height: 16, border: 'none', background: 'transparent' }}
              onClick={() => onToggleExpand(node.id)}>
              <i className={isExpanded ? 'bi bi-dash' : 'bi bi-plus'} style={{ fontSize: 10 }}></i>
            </button>
          ) : (
            <span style={{ width: 16 }}></span>
          )}
        </div>

        {/* + green marker — only for child items */}
        {!isRoot && !hasChildren && (
          <div style={{ width: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-plus" style={{ fontSize: 11, color: '#4caf50' }}></i>
          </div>
        )}
        {isRoot && <div style={{ width: 18 }}></div>}

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: isRoot ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title ?? '—'}
        </span>

        {/* Action group */}
        <div style={S.actionGroup()}>
          {/* [▲] Move up */}
          {!isFirst
            ? <button type="button" title="Lên" style={S.btn('#9e9e9e')} onClick={() => onMoveUp(node, siblings, siblingIndex)}>
                <i className="bi bi-chevron-up" style={{ fontSize: 10 }}></i>
              </button>
            : null
          }

          {/* [▼] Move down */}
          {!isLast
            ? <button type="button" title="Xuống" style={S.btn('#9e9e9e')} onClick={() => onMoveDown(node, siblings, siblingIndex)}>
                <i className="bi bi-chevron-down" style={{ fontSize: 10 }}></i>
              </button>
            : null
          }

          {/* [→] Chuyển vào nhóm con */}
          {(isRoot ? !isFirst : !isLast)
            ? <button type="button" title="Chuyển vào nhóm con" style={S.btn('#9e9e9e')} onClick={() => onMoveIntoNearestFolder(node)}>
                <i className="bi bi-arrow-return-right" style={{ fontSize: 10 }}></i>
              </button>
            : null
          }

          {/* [←] Chuyển ra khỏi nhóm: chỉ hiện với item con */}
          {!isRoot
            ? <button type="button" title="Chuyển ra khỏi nhóm" style={S.btn('#9e9e9e')} onClick={() => onMoveOutOfCurrentFolder(node)}>
                <i className="bi bi-arrow-return-left" style={{ fontSize: 10 }}></i>
              </button>
            : null
          }

          {/* [✏] Edit */}
          <button type="button" title="Sửa" style={S.btn('#2196f3')} onClick={() => onEdit(node)}>
            <i className="bi bi-pencil-fill" style={{ fontSize: 10 }}></i>
          </button>

          {/* [🗑] Delete */}
          <button type="button" title="Xóa" style={S.btn('#f44336')} onClick={() => onDelete(node)}>
            <i className="bi bi-trash-fill" style={{ fontSize: 10 }}></i>
          </button>
        </div>
      </div>

      {/* Drop zone for children (visible when expanded) */}
      {hasChildren && isExpanded && (
        children
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((child, idx) => (
            <TreeNode
              key={child.id}
              node={child}
              siblings={children}
              siblingIndex={idx}
              menuLinks={menuLinks}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onMoveIntoNearestFolder={onMoveIntoNearestFolder}
              onMoveOutOfCurrentFolder={onMoveOutOfCurrentFolder}
              onDrop={onDrop}
              depth={depth + 1}
            />
          ))
      )}

      {/* Drop zone at end of children list */}
      {hasChildren && isExpanded && (
        <div
          style={{ height: 4, cursor: 'default' }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropZone}
        />
      )}
    </>
  );
}

interface Props {
  menuLinks: MenuLinkNode[];
  onLinksChange: (links: MenuLinkNode[]) => void;
  onEdit: (item: MenuLinkNode) => void;
}

export function MenuLinkTree({ menuLinks, onLinksChange, onEdit }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Keep a ref so callbacks never capture stale menuLinks
  const menuLinksRef = useRef(menuLinks);
  menuLinksRef.current = menuLinks;

  // Normalize sortOrder within each parent group (sequential integers starting from 0)
  const normalizeSortOrders = useCallback((links: MenuLinkNode[]): MenuLinkNode[] => {
    const groups = new Map<string | null, MenuLinkNode[]>();
    for (const link of links) {
      const key = link.parentId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(link);
    }
    const result: MenuLinkNode[] = [];
    for (const [, group] of groups) {
      group.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      group.forEach((item, idx) => {
        result.push({ ...item, sortOrder: idx });
      });
    }
    return result;
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getDescendantIds = useCallback((id: string): string[] => {
    return [id, ...menuLinksRef.current.filter((n) => n.parentId === id).flatMap((c) => getDescendantIds(c.id))];
  }, []);

  const deleteNode = useCallback((node: MenuLinkNode) => {
    const links = menuLinksRef.current;
    const descendants = links.filter((n) => n.parentId === node.id);
    const msg = descendants.length > 0
      ? `Xóa "${node.title || '—'}" và tất cả liên kết con?`
      : `Xóa liên kết "${node.title || '—'}"?`;
    if (!confirm(msg)) return;
    const idsToRemove = new Set(getDescendantIds(node.id));
    onLinksChange(links.filter((n) => !idsToRemove.has(n.id)));
  }, [getDescendantIds, onLinksChange]);

  const moveUp = useCallback((node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => {
    if (idx === 0) return;
    const swap = siblings[idx - 1];
    const links = menuLinksRef.current;
    const updated = links.map((n) =>
      n.id === node.id ? { ...n, sortOrder: (swap.sortOrder ?? 0) - 0.5 }
      : n
    );
    onLinksChange(normalizeSortOrders(updated));
  }, [normalizeSortOrders, onLinksChange]);

  const moveDown = useCallback((node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => {
    if (idx >= siblings.length - 1) return;
    const swap = siblings[idx + 1];
    const links = menuLinksRef.current;
    const updated = links.map((n) =>
      n.id === node.id ? { ...n, sortOrder: (swap.sortOrder ?? 0) + 0.5 }
      : n
    );
    onLinksChange(normalizeSortOrders(updated));
  }, [normalizeSortOrders, onLinksChange]);

  // level-up: move item INTO a sibling folder
  // - Root item: move into PREVIOUS sibling (item trước đó)
  // - Child item: move into NEXT sibling (item tiếp theo)
  const moveIntoNearestFolder = useCallback((node: MenuLinkNode) => {
    const links = menuLinksRef.current;
    const allSiblings = links
      .filter((n) => n.parentId === node.parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const nodeIdx = allSiblings.findIndex((n) => n.id === node.id);

    const isRoot = node.parentId === null;
    let targetParent: MenuLinkNode | undefined;

    if (isRoot) {
      // Root: chuyển vào previous sibling
      if (nodeIdx <= 0) return;
      targetParent = allSiblings[nodeIdx - 1];
    } else {
      // Child: chuyển vào next sibling
      if (nodeIdx >= allSiblings.length - 1) return;
      targetParent = allSiblings[nodeIdx + 1];
    }

    if (!targetParent) return;

    const folderChildren = links.filter((n) => n.parentId === targetParent!.id);
    const newSortOrder = folderChildren.length;

    const updated = links.map((n) =>
      n.id === node.id
        ? { ...n, parentId: targetParent!.id, sortOrder: newSortOrder, level: (targetParent!.level ?? 0) + 1 }
        : n
    );

    onLinksChange(normalizeSortOrders(updated));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(targetParent!.id);
      return next;
    });
  }, [normalizeSortOrders, onLinksChange]);

  // level-down: move item OUT of current folder → become sibling of its parent (move up in hierarchy)
  const moveOutOfCurrentFolder = useCallback((node: MenuLinkNode) => {
    console.log('[level-down handler] START, node:', node.title, 'parentId:', node.parentId, 'id:', node.id);
    if (node.parentId === null) { console.log('[level-down handler] early return - already root'); return; }
    const links = menuLinksRef.current;
    const parent = links.find((n) => n.id === node.parentId);
    console.log('[level-down handler] parent:', parent?.title, 'parent.parentId:', parent?.parentId);
    if (!parent) { console.log('[level-down handler] early return - parent not found'); return; }

    const grandParentId = parent.parentId;
    const siblingsOfParent = links
      .filter((n) => n.parentId === grandParentId && n.id !== parent.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const parentIdx = siblingsOfParent.findIndex((n) => n.id === parent.id);
    const insertIdx = parentIdx >= 0 ? parentIdx + 1 : siblingsOfParent.length;

    const updated = links.map((n) => {
      if (n.id === node.id) {
        console.log('[level-down] move node:', n.title, '→ new parentId:', grandParentId, 'new level:', parent.level ?? 0);
        return { ...n, parentId: grandParentId, sortOrder: insertIdx, level: parent.level ?? 0 };
      }
      const idx = siblingsOfParent.findIndex((s) => s.id === n.id);
      if (idx >= insertIdx) {
        return { ...n, sortOrder: idx + 1 };
      }
      return n;
    });

    const result = normalizeSortOrders(updated);
    const movedNode = result.find((n) => n.id === node.id);
    console.log('[level-down handler] after normalize, movedNode.parentId:', movedNode?.parentId, 'level:', movedNode?.level);
    onLinksChange(result);
  }, [normalizeSortOrders, onLinksChange]);

  // Drag & drop
  const handleDrop = useCallback((nodeId: string, targetId: string, position: 'before' | 'after' | 'into') => {
    const links = menuLinksRef.current;
    const dragged = links.find((n) => n.id === nodeId);
    const target = links.find((n) => n.id === targetId);
    if (!dragged || !target || dragged.id === target.id) return;

    if (position === 'into') {
      const childrenOfTarget = links.filter((n) => n.parentId === target.id);
      const newSortOrder = Math.max(0, ...childrenOfTarget.map((c) => c.sortOrder ?? 0)) + 1;
      const updated = links.map((n) =>
        n.id === dragged.id
          ? { ...n, parentId: target.id, sortOrder: newSortOrder, level: (target.level ?? 0) + 1 }
          : n
      );
      onLinksChange(normalizeSortOrders(updated));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
      return;
    }

    const newParentId = target.parentId;
    const siblings = links
      .filter((n) => n.parentId === newParentId && n.id !== dragged.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const targetIdx = siblings.findIndex((n) => n.id === target.id);
    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
    siblings.splice(insertIdx, 0, dragged);

    const updated = links.map((n) => {
      if (n.id === dragged.id) {
        return { ...n, parentId: newParentId, sortOrder: insertIdx };
      }
      const idx = siblings.findIndex((s) => s.id === n.id);
      if (idx !== -1) {
        return { ...n, sortOrder: idx };
      }
      return n;
    });

    onLinksChange(normalizeSortOrders(updated));
  }, [normalizeSortOrders, onLinksChange]);

  const rootItems = useMemo(() =>
    menuLinks
      .filter((n) => n.parentId === null)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [menuLinks]
  );

  if (menuLinks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
        <i className="bi bi-link-45deg" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}></i>
        Chưa có liên kết nào. Chọn nguồn link bên trái để thêm.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
      {rootItems.map((node, idx) => (
        <TreeNode
          key={node.id}
          node={node}
          siblings={rootItems}
          siblingIndex={idx}
          menuLinks={menuLinks}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          onEdit={onEdit}
          onDelete={deleteNode}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onMoveIntoNearestFolder={moveIntoNearestFolder}
          onMoveOutOfCurrentFolder={moveOutOfCurrentFolder}
          onDrop={handleDrop}
          depth={0}
        />
      ))}
    </div>
  );
}
