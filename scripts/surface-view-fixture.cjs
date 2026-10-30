'use strict';

/** Minimal DOM stand-in for a host carrying the JSXGraph SVG surface view, for unit tests of the in-page evidence code. */
function fakeSurfaceHost({attrs = {}, view = 'board2d', size = {width: 420, height: 260}, shapes = [{points: '1,2 30,4 20.5,60 1,2'}], hasSvg = true} = {}) {
    const nodes = shapes.map(shape => ({getAttribute: name => (name === 'points' ? shape.points : name === 'display' ? shape.display ?? null : null)}));
    const svg = {getBoundingClientRect: () => size, querySelectorAll: () => nodes};
    const viewElement = view === null ? null : {getAttribute: name => (name === 'data-jsx-surface-view' ? view : null), querySelector: selector => (selector === 'svg' && hasSvg ? svg : null)};
    return {getAttribute: name => attrs[name] ?? null, querySelector: selector => (selector === '[data-jsx-surface-view]' ? viewElement : null)};
}

module.exports = {fakeSurfaceHost};
