import type { BuilderTreeNode } from '../../shared/types';

export class PlatformTree extends HTMLElement {
  private _nodes: BuilderTreeNode | null = null;
  private selectedId = '';
  private open = new Set<string>();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set nodes(value: BuilderTreeNode | null) {
    this._nodes = value;
    if (value) this.seedOpen(value);
    this.render();
  }

  get nodes(): BuilderTreeNode | null { return this._nodes; }

  set selected(value: string) {
    this.selectedId = value;
    this.render();
  }

  private seedOpen(node: BuilderTreeNode | undefined): void {
    if (!node) return;
    if (node.kind === 'site' || node.kind === 'folder') this.open.add(node.id);
    node.children?.forEach((child) => this.seedOpen(child));
  }

  private renderNode(node: BuilderTreeNode): string {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = this.open.has(node.id);
    const selected = node.id === this.selectedId;
    const childMarkup = hasChildren && isOpen ? `<ul>${node.children!.map((child) => this.renderNode(child)).join('')}</ul>` : '';
    const status = node.support === 'code-managed' ? '<span class="status" title="Code managed">code</span>' : node.support === 'partial' ? '<span class="status" title="Partially supported">partial</span>' : '';
    return `<li>
      <div class="node ${selected ? 'selected' : ''}">
        ${hasChildren ? `<button class="toggle" type="button" data-toggle="${escapeAttr(node.id)}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${escapeAttr(node.label)}">${isOpen ? '-' : '+'}</button>` : '<span class="toggle-spacer"></span>'}
        <button class="label" type="button" data-select="${escapeAttr(node.id)}" data-source="${escapeAttr(node.source ?? '')}">
          <span class="kind kind-${node.kind}" aria-hidden="true"></span><span class="label-text">${escapeHtml(node.label)}</span>${node.route ? `<span class="route">${escapeHtml(node.route)}</span>` : ''}${status}
        </button>
      </div>${childMarkup}
    </li>`;
  }

  private render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `<style>
      :host { display:block; min-width:0; color:#172033; }
      ul { list-style:none; margin:0; padding:0 0 0 .9rem; }
      :host > ul { padding-left:0; }
      li { margin:0; }
      .node { display:flex; align-items:center; min-height:2.15rem; gap:.25rem; }
      .node.selected { background:#eaf1fb; border-radius:.35rem; }
      button { font:inherit; }
      .toggle { width:1.7rem; height:1.7rem; padding:0; border:0; border-radius:.3rem; color:#40526d; background:transparent; cursor:pointer; }
      .toggle:hover, .toggle:focus-visible { background:#dbe6f5; }
      .toggle-spacer { width:1.7rem; }
      .label { display:flex; align-items:center; gap:.45rem; flex:1; min-width:0; padding:.35rem .45rem; border:0; border-radius:.3rem; text-align:left; background:transparent; cursor:pointer; color:inherit; }
      .label:hover, .label:focus-visible { background:#f0f4f9; }
      .label-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .route { margin-left:auto; color:#68758a; font-size:.75rem; white-space:nowrap; }
      .status { margin-left:auto; color:#8b5a14; font-size:.68rem; text-transform:uppercase; letter-spacing:.04em; }
      .kind { width:.5rem; height:.5rem; border:1px solid #6881a3; border-radius:50%; flex:none; }
      .kind-site, .kind-folder { border-radius:.12rem; background:#dbe6f5; }
      .kind-page { background:#5e8fcb; }
      .kind-component { background:#4d9b82; }
      .kind-element { background:#a6afbd; }
    </style>${this._nodes ? `<ul>${this.renderNode(this._nodes)}</ul>` : '<p class="empty">No tree data.</p>'}`;
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-toggle]').forEach((button) => button.addEventListener('click', () => {
      const id = button.dataset.toggle!;
      if (this.open.has(id)) this.open.delete(id); else this.open.add(id);
      this.render();
    }));
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-select]').forEach((button) => button.addEventListener('click', () => {
      this.selectedId = button.dataset.select!;
      this.render();
      this.dispatchEvent(new CustomEvent('ui-tree-select', { bubbles: true, detail: { id: button.dataset.select, source: button.dataset.source || undefined } }));
    }));
  }
}

function escapeHtml(value: unknown): string { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function escapeAttr(value: unknown): string { return escapeHtml(value).replaceAll("'", '&#39;'); }

if (!customElements.get('ui-platform-tree')) customElements.define('ui-platform-tree', PlatformTree);
