import type { EditableArtifact, ValidationDiagnostic } from "../types.js";

export interface EntryPoints {
  routes: string[];
  global?: string[];
  /** IDs supplied by the central Trigger Registry adapter, not filesystem enumeration. */
  activeTriggers?: string[];
  registrations?: { artifactId: string; enabled: boolean }[];
}
export interface DependencyEdge {
  from: string;
  to: string;
  buildOrder: boolean;
}
export class ApplicationGraph {
  readonly nodes = new Map<string, EditableArtifact>();
  readonly reachable = new Set<string>();
  readonly diagnostics: ValidationDiagnostic[] = [];
  readonly edges: DependencyEdge[] = [];
  readonly roots: string[];
  constructor(
    artifacts: EditableArtifact[],
    entries: EntryPoints,
    extraEdges: DependencyEdge[] = [],
  ) {
    this.roots = [
      ...new Set([
        ...entries.routes,
        ...(entries.global ?? []),
        ...(entries.activeTriggers ?? []),
        ...(entries.registrations ?? [])
          .filter((r) => r.enabled)
          .map((r) => r.artifactId),
      ]),
    ].sort();
    for (const artifact of artifacts) {
      const id = artifact.manifest?.artifactId;
      this.diagnostics.push(
        ...artifact.validation.diagnostics.map((d) => ({
          ...d,
          artifactId: d.artifactId ?? id ?? `path:${artifact.bundlePath}`,
          file: d.file ?? artifact.bundlePath,
        })),
      );
      if (!id) continue;
      if (this.nodes.has(id))
        this.issue(
          "application.duplicate-id",
          id,
          `Duplicate artifact identity: ${id}`,
        );
      this.nodes.set(id, artifact);
      for (const ref of artifact.references.outgoing)
        this.edges.push({ from: id, to: ref.artifactId, buildOrder: true });
    }
    this.edges.push(...extraEdges);
    for (const [id, artifact] of this.nodes)
      for (const reference of artifact.references.outgoing) {
        const target = this.nodes.get(reference.artifactId);
        if (
          target &&
          reference.expectedType &&
          reference.expectedType !== target.manifest?.artifactType
        )
          this.issue(
            "reference.type",
            id,
            `${id} requires ${reference.artifactId} to be ${reference.expectedType}.`,
          );
      }
    const follow = (id: string, chain: string[]) => {
      if (this.reachable.has(id)) return;
      this.reachable.add(id);
      const artifact = this.nodes.get(id);
      const route = [...chain, id].join(" -> ");
      if (!artifact) {
        this.issue(
          "application.missing-dependency",
          chain.at(-1) ?? id,
          `Missing dependency: ${route}`,
        );
        return;
      }
      if (
        artifact.manifest?.artifactType === "trigger" &&
        (artifact.manifest.config?.active !== true ||
          !entries.activeTriggers?.includes(id))
      )
        this.issue(
          "application.inactive-dependency",
          id,
          `Trigger is inactive or absent from the central registry: ${route}`,
        );
      for (const edge of this.edges.filter((e) => e.from === id))
        follow(edge.to, [...chain, id]);
    };
    this.roots.forEach((id) => follow(id, []));
    const done = new Set<string>();
    const walk = (id: string, stack: string[]) => {
      if (stack.includes(id)) {
        this.issue(
          "application.build-cycle",
          id,
          `Build-order cycle: ${[...stack, id].join(" -> ")}`,
        );
        return;
      }
      if (done.has(id)) return;
      done.add(id);
      this.dependencies(id).forEach((dep) => walk(dep, [...stack, id]));
    };
    this.reachable.forEach((id) => walk(id, []));
  }
  issue(code: string, artifactId: string, message: string) {
    this.diagnostics.push({ severity: "error", code, artifactId, message });
  }
  dependencies(id: string) {
    return [
      ...new Set(
        this.edges
          .filter((e) => e.from === id && e.buildOrder)
          .map((e) => e.to),
      ),
    ].sort();
  }
  dependents(id: string) {
    return [
      ...new Set(this.edges.filter((e) => e.to === id).map((e) => e.from)),
    ];
  }
  get blockers() {
    return this.diagnostics.filter(
      (d) =>
        d.severity === "error" &&
        (!d.artifactId || this.reachable.has(d.artifactId)),
    );
  }
}
