import type {Diagnostic} from '@ui-platform/visual-artifacts';

/** Local presentation only; saved-baseline and draft diagnostics never share groups. */
interface ProblemsInput {
  saved: Diagnostic[]; local: Diagnostic[]; revision?: string;
  targets: Map<string,string>; select: (node: string) => boolean;
}
export function groupEditorProblems(input: Pick<ProblemsInput,'saved'|'local'|'revision'>) {
  const contexts = [
    {name:'Local draft structure',key:'local',revision:'current draft',items:input.local,note:'HTML structure findings only; this is not complete Page validation.'},
    {name:'Saved baseline',key:'saved',revision:input.revision ?? 'revision unavailable',items:input.saved,note:'Findings retained with the saved baseline; they may differ from the current draft.'},
  ];
  return contexts.map(context => {
    const unique = new Map<string,Diagnostic>();
    for (const d of context.items) unique.set(JSON.stringify([context.key,context.revision,d.severity,d.message,d.node ?? null]),d);
    const grouped = new Map<string,Diagnostic[]>();
    for (const d of unique.values()) {const key=JSON.stringify([context.key,context.revision,d.severity,d.message]);const list=grouped.get(key)??[];list.push(d);grouped.set(key,list);}
    return {context,unique:[...unique.values()],grouped};
  });
}
export function renderEditorProblems(host: HTMLElement, input: ProblemsInput): void {
  const wasOpen = host.querySelector<HTMLDetailsElement>(':scope > details')?.open ?? false;
  const expanded = new Set([...host.querySelectorAll<HTMLDetailsElement>('details[data-problem-group]')].filter(n => n.open).map(n => n.dataset.problemGroup));
  const groups = groupEditorProblems(input);
  const all = groups.flatMap(g => g.unique), errors = all.filter(d => d.severity === 'error').length, warnings = all.filter(d => d.severity === 'warning').length;
  const panel = document.createElement('details');panel.setAttribute('aria-label','Editor Problems');panel.open=errors>0||wasOpen;
  const summary = document.createElement('summary');summary.textContent=`Problems — ${errors} ${errors===1?'error':'errors'}, ${warnings} ${warnings===1?'warning':'warnings'}`;summary.title='Counts are unique within each source context; saved and draft findings are counted separately.';panel.append(summary);
  for (const {context,unique,grouped} of groups) {
    const section=document.createElement('section'),title=document.createElement('h4'),note=document.createElement('p');
    title.textContent=context.name;note.className='note';note.textContent=`${context.note} ${context.key==='saved'?'Revision: '+(input.revision?.slice(0,12)??'unavailable'):''}`;if(context.key==='saved')note.title=context.revision;section.append(title,note);
    if (!unique.length) {const empty=document.createElement('p');empty.textContent=context.key==='local'?'No local structure findings.':'No saved-baseline findings supplied.';section.append(empty);}
    for (const [key,items] of grouped) {
      const group=document.createElement('details'),label=document.createElement('summary'),list=document.createElement('ul');
      group.dataset.problemGroup=key;group.open=items[0].severity==='error'||expanded.has(key);
      label.textContent=`${items[0].severity==='error'?'Error':'Warning'} · ${items[0].message} (${items.length} ${items.length===1?'finding':'findings'})`;group.append(label,list);
      if(items[0].severity==='error')label.className='error';
      for(const d of items){
        const row=document.createElement('li'),target=d.node&&input.targets.get(d.node);
        if(target&&d.node){
          const button=document.createElement('button');button.type='button';button.textContent=`Select ${target.trim()}`;button.title=d.node;
          button.onclick=()=>{if(!input.select(d.node!)){let explanation=row.querySelector('[role="status"]');if(!explanation){explanation=document.createElement('span');explanation.setAttribute('role','status');row.append(explanation);}explanation.textContent=' This target is no longer a current managed element. The Page was not changed.';}};row.append(button);
        }else{row.textContent=d.node?`${d.node} — No current managed target; source may be changed, malformed or unmanaged.`:'Artifact-level finding; no element target was supplied.';}
        list.append(row);
      }
    section.append(group);
    }
    panel.append(section);
  }
  host.replaceChildren(panel);
}
