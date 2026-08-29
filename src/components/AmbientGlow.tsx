// Ambient background. Solid colour + heavy blur + low opacity, drifting on a
// long loop — the technique the reference design uses, and one composited
// layer instead of the requestAnimationFrame particle canvas this replaces.
// No JS runs at all: the browser animates transforms off the main thread.

export default function AmbientGlow() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Top violet wash — the hero sits inside it */}
      <div
        className="glow animate-drift"
        style={{
          top: '-28vh',
          left: '50%',
          marginLeft: '-45vw',
          width: '90vw',
          height: '70vh',
          background: '#8f69e0',
          filter: 'blur(120px)',
          opacity: 0.22,
        }}
      />
      {/* Lilac counterweight, low and to the right */}
      <div
        className="glow animate-drift-slow"
        style={{
          bottom: '-20vh',
          right: '-30vw',
          width: '80vw',
          height: '60vh',
          background: '#edc5fc',
          filter: 'blur(160px)',
          opacity: 0.1,
        }}
      />
      {/* Deep violet anchor, keeps the middle of long pages from going flat */}
      <div
        className="glow animate-drift"
        style={{
          top: '38vh',
          left: '-35vw',
          width: '70vw',
          height: '50vh',
          background: '#6535bd',
          filter: 'blur(150px)',
          opacity: 0.16,
          animationDelay: '-14s',
        }}
      />
    </div>
  );
}
