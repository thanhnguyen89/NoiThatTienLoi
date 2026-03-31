'use client';

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
  row: (isRoot: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 8px',
    paddingLeft: isRoot ? 8 : 32,
    borderBottom: '1px solid #e8e8e8',
    background: isRoot ? '#fff' : '#f5f5f5',
    minHeight: 38,
  }),
  btn: (bg: string, color = '#fff'): React.CSSProperties => ({
    width: 26, height: 26, border: 'none', borderRadius: 3,
    background: bg, color, cursor: 'pointer', fontSize: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }),
};

interface TreeNodeProps {
  node: MenuLinkNode;
  siblings: MenuLinkNode[];
  siblingIndex: number;
  menuLinks: MenuLinkNode[];
  onEdit: (node: MenuLinkNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (node: MenuLinkNode) => void;
  onMoveUp: (node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => void;
  onMoveDown: (node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) => void;
  onPromote: (node: MenuLinkNode) => void;
}

function TreeNode({ node, siblings, siblingIndex, menuLinks, onEdit, onAddChild, onDelete, onMoveUp, onMoveDown, onPromote }: TreeNodeProps) {
  const children = menuLinks.filter((n) => n.parentId === node.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const hasChildren = children.length > 0;
  const isRoot = node.parentId === null;
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblings.length - 1;

  return (
    <>
      <div style={S.row(isRoot)}>
        {/* + button: chỉ root, đổi thành - nếu có children */}
        {isRoot ? (
          <button type="button" title="Thêm liên kết con"
            style={S.btn(hasChildren ? '#f44336' : '#4caf50')}
            onClick={() => onAddChild(node.id)}>
            <i className={`bi ${hasChildren ? 'bi-dash' : 'bi-plus'}`} style={{ fontSize: 14 }}></i>
          </button>
        ) : (
          <span style={{ width: 26, flexShrink: 0 }} />
        )}

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: isRoot ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title ?? '—'}
          {node._local && (
            <span style={{ marginLeft: 6, fontSize: 10, background: '#e3f2fd', color: '#1565c0', borderRadius: 3, padding: '1px 5px' }}>Mới</span>
          )}
        </span>

        {/* ↑ move up */}
        {!isFirst && (
          <button type="button" title="Lên" style={S.btn('#9e9e9e')}
            onClick={() => onMoveUp(node, siblings, siblingIndex)}>
            <i className="bi bi-chevron-up" style={{ fontSize: 11 }}></i>
          </button>
        )}

        {/* ↓ move down */}
        {!isLast && (
          <button type="button" title="Xuống" style={S.btn('#9e9e9e')}
            onClick={() => onMoveDown(node, siblings, siblingIndex)}>
            <i className="bi bi-chevron-down" style={{ fontSize: 11 }}></i>
          </button>
        )}

        {/* ↑ promote (child only) */}
        {!isRoot && (
          <button type="button" title="Đưa lên cấp cha" style={S.btn('#9e9e9e')}
            onClick={() => onPromote(node)}>
            <i className="bi bi-arrow-up" style={{ fontSize: 11 }}></i>
          </button>
        )}

        {/* Sort order */}
        <span style={{ fontSize: 12, color: '#888', minWidth: 18, textAlign: 'center' }}>{node.sortOrder ?? 0}</span>

        {/* Edit */}
        <button type="button" title="Sửa" style={S.btn('#2196f3')}
          onClick={() => onEdit(node)}>
          <i className="bi bi-pencil-fill" style={{ fontSize: 11 }}></i>
        </button>

        {/* Delete */}
        <button type="button" title="Xóa" style={S.btn('#f44336')}
          onClick={() => onDelete(node)}>
          <i className="bi bi-trash-fill" style={{ fontSize: 11 }}></i>
        </button>
      </div>

      {/* Children */}
      {children.map((child, idx) => (
        <TreeNode key={child.id} node={child} siblings={children} siblingIndex={idx}
          menuLinks={menuLinks} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete}
          onMoveUp={onMoveUp} onMoveDown={onMoveDown} onPromote={onPromote} />
      ))}
    </>
  );
}

interface Props {
  menuLinks: MenuLinkNode[];
  onLinksChange: (links: MenuLinkNode[]) => void;
  onEdit: (item: MenuLinkNode) => void;
}

export function MenuLinkTree({ menuLinks, onLinksChange, onEdit }: Props) {
  const rootItems = menuLinks.filter((n) => n.parentId === null).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  function deleteNode(node: MenuLinkNode) {
    function getDescendantIds(id: string): string[] {
      return [id, ...menuLinks.filter((n) => n.parentId === id).flatMap((c) => getDescendantIds(c.id))];
    }
    const descendants = menuLinks.filter((n) => n.parentId === node.id);
    const msg = descendants.length > 0
      ? `Xóa "${node.title}" và tất cả liên kết con?`
      : `Xóa liên kết "${node.title}"?`;
    if (!confirm(msg)) return;
    const idsToRemove = new Set(getDescendantIds(node.id));
    onLinksChange(menuLinks.filter((n) => !idsToRemove.has(n.id)));
  }

  function addChild(parentId: string) {
    window.dispatchEvent(new CustomEvent('menuLinkAddChild', { detail: { parentId } }));
  }

  function moveUp(node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) {
    if (idx === 0) return;
    const swap = siblings[idx - 1];
    onLinksChange(menuLinks.map((n) =>
      n.id === node.id ? { ...n, sortOrder: swap.sortOrder ?? 0 }
      : n.id === swap.id ? { ...n, sortOrder: node.sortOrder ?? 0 }
      : n
    ));
  }

  function moveDown(node: MenuLinkNode, siblings: MenuLinkNode[], idx: number) {
    if (idx >= siblings.length - 1) return;
    const swap = siblings[idx + 1];
    onLinksChange(menuLinks.map((n) =>
      n.id === node.id ? { ...n, sortOrder: swap.sortOrder ?? 0 }
      : n.id === swap.id ? { ...n, sortOrder: node.sortOrder ?? 0 }
      : n
    ));
  }

  function promoteNode(node: MenuLinkNode) {
    if (!node.parentId) return;
    const grandparent = menuLinks.find((n) => n.id === node.parentId);
    const newParentId = grandparent?.parentId ?? null;
    onLinksChange(menuLinks.map((n) =>
      n.id === node.id ? { ...n, parentId: newParentId, level: newParentId === null ? 0 : 1 } : n
    ));
  }

  if (rootItems.length === 0) {
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
        <TreeNode key={node.id} node={node} siblings={rootItems} siblingIndex={idx}
          menuLinks={menuLinks} onEdit={onEdit} onAddChild={addChild} onDelete={deleteNode}
          onMoveUp={moveUp} onMoveDown={moveDown} onPromote={promoteNode} />
      ))}
    </div>
  );
}
