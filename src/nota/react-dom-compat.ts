// MUI v4 + React 19 compatibility shims.
// Must use default import (not namespace) so we get the mutable module.exports object.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOM = require('react-dom');

// MUI v4 internally accesses element.ref (e.g. in Dialog, Transition, Popover) which
// React 19 deprecated. Suppress the specific warning — does not affect runtime behaviour.
if (typeof console !== 'undefined') {
  const _origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Accessing element.ref')) return;
    _origError(...args);
  };
}

if (typeof ReactDOM.findDOMNode !== 'function') {
  ReactDOM.findDOMNode = function findDOMNode(inst: any): Element | Text | null {
    if (inst == null) return null;
    if (typeof inst.nodeType === 'number') return inst as Element | Text;
    const fiber: any = inst._reactInternals;
    if (!fiber) return null;
    let node: any = fiber;
    while (node) {
      if (node.stateNode && typeof node.stateNode.nodeType === 'number') {
        return node.stateNode as Element | Text;
      }
      node = node.child;
    }
    return null;
  };
}
