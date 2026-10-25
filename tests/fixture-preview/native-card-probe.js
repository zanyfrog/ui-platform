// Test-only prelude in the same hash-pinned script, before native registration.
(() => {
  const metrics={registrations:[],cards:0,activeObservers:0,disconnects:0};window.__nativeMetrics=metrics;
  const create=document.createElement.bind(document);
  document.createElement=function(name,...args){if(name==='uib-card')metrics.cards++;return create(name,...args);};
  const define=customElements.define.bind(customElements);
  customElements.define=function(name,...args){metrics.registrations.push(name);return define(name,...args);};
  const Native=MutationObserver;
  window.MutationObserver=class extends Native {
    active=false;
    observe(...args){if(!this.active){metrics.activeObservers++;this.active=true;}return super.observe(...args);}
    disconnect(){if(this.active){metrics.activeObservers--;metrics.disconnects++;this.active=false;}return super.disconnect();}
  };
})();
