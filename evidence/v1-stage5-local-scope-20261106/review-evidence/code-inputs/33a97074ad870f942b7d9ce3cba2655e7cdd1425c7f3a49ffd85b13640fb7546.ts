// Appended only to the copied WP3 test during review; shares the existing fixture.
describe('WP3 cleanup outcome review',()=>{
 it('reports a committed activation truthfully when the binding cleanup throws',async()=>{
  const f=templateFixture(),c=f.change(f.record()),authority=(f.administration as any).config.templateAuthority;
  const assert=authority.assertCurrent;authority.assertCurrent=(...args:any[])=>{const lease=assert(...args);return lease&&typeof lease==='object'?{release(){lease.release();throw Error('REVIEW_CLEANUP_FAULT');}}:lease;};
  const result=await f.activate(c,f.tokens.alice);
  observations.push({review:'cleanup-after-commit',result,revision:f.store.revision(),auditCount:f.store.adminAudit().length,candidate:f.store.candidate(c.id)?.result});
  expect(f.store.revision()).toBe(2);expect(f.store.adminAudit()).toHaveLength(1);expect(result.status).toBe('activated');
 });
});
