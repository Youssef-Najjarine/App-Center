import React, { useRef, useEffect } from "react";
import "./ApplicationModalCarousel.css";

const SPEED_PX_PER_SEC = 90;
const GAP_PX = 10;

const ApplicationModalCarousel = ({ items = [], selectedItem, onItemClick, loading }) => {
  const viewportRef       = useRef(null);
  const rafRef            = useRef(null);
  const poolRef           = useRef([]);
  const runningRef        = useRef(false);
  const selectedFileIdRef = useRef(null);
  const itemsRef          = useRef(items);
  const onClickRef        = useRef(onItemClick);
  const itemsSigRef       = useRef("");
  const roRef             = useRef(null);

  useEffect(() => { itemsRef.current = items; },         [items]);
  useEffect(() => { onClickRef.current = onItemClick; }, [onItemClick]);

  useEffect(() => {
    selectedFileIdRef.current = selectedItem?.fileId ?? null;
    for (const node of poolRef.current) {
      const item = itemsRef.current[node.itemIndex];
      node.el.classList.toggle(
        "carousel-img--selected",
        item?.fileId === selectedFileIdRef.current
      );
    }
  }, [selectedItem]);

  const buildRef = useRef(null);
  buildRef.current = () => {
    const viewport = viewportRef.current;
    const its      = itemsRef.current;
    if (!viewport) return;

    runningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    viewport.innerHTML = "";
    poolRef.current    = [];

    if (loading) {
      viewport.className = "carousel-viewport carousel-viewport--static";
      const track = document.createElement("div");
      track.className = "carousel-track";
      for (let i = 0; i < 4; i++) {
        const s = document.createElement("div");
        s.className = "carousel-img carousel-skeleton";
        track.appendChild(s);
      }
      viewport.appendChild(track);
      return;
    }

    if (its.length <= 1) {
      viewport.className = "carousel-viewport carousel-viewport--static";
      const g = document.createElement("div");
      g.className = "carousel-solo-gradient";
      viewport.appendChild(g);
      return;
    }

    viewport.className = "carousel-viewport carousel-viewport--live";

    const vpW = viewport.offsetWidth;
    const vpH = viewport.offsetHeight;

    if (vpW === 0 && vpH === 0) return;

    const isVert = window.innerWidth >= 768 && window.innerWidth < 1440;
    const itemW  = isVert ? vpW                 : Math.floor(vpW * 0.33);
    const itemH  = isVert ? Math.floor(vpH / 3) : vpH;
    const stride = (isVert ? itemH : itemW) + GAP_PX;
    const vpSize = isVert ? vpH : vpW;
    const needed = Math.ceil(vpSize / stride) + 4;
    const radius = isVert ? "10.5px" : window.innerWidth >= 1440 ? "12px" : "7.256px";

    if (needed <= 0 || itemW <= 0 || itemH <= 0) return;

    for (let i = 0; i < needed; i++) {
      const itemIndex = i % its.length;
      const item      = its[itemIndex];
      const pos       = i * stride;

      const el = document.createElement("img");
      el.src   = item.src;
      el.alt   = `media-${item.orderIndex}`;
      el.className = "carousel-img" +
        (item.fileId === selectedFileIdRef.current ? " carousel-img--selected" : "");
      el.style.cssText =
        `position:absolute;` +
        (isVert ? `top:${pos}px;left:0;` : `left:${pos}px;top:0;`) +
        `width:${itemW}px;height:${itemH}px;` +
        `object-fit:cover;object-position:center;` +
        `border-radius:${radius};box-sizing:border-box;cursor:pointer;`;
      el.dataset.itemIndex = String(itemIndex);

      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.itemIndex, 10);
        const it  = itemsRef.current[idx];
        if (it) onClickRef.current(it);
      });

      viewport.appendChild(el);
      poolRef.current.push({ el, pos, itemIndex });
    }

    let lastTs = null;
    runningRef.current = true;

    const tick = (ts) => {
      if (!runningRef.current) return;
      if (lastTs === null) lastTs = ts;
      const dt      = Math.min(ts - lastTs, 50);
      lastTs        = ts;

      const isV     = window.innerWidth >= 768 && window.innerWidth < 1440;
      const vpSz    = isV ? viewport.offsetHeight : viewport.offsetWidth;
      const advance = (SPEED_PX_PER_SEC * dt) / 1000;
      const pool    = poolRef.current;
      const prop    = isV ? "top" : "left";
      const iSize   = isV
        ? parseFloat(pool[0]?.el.style.height ?? "0")
        : parseFloat(pool[0]?.el.style.width  ?? "0");
      const iStride = iSize + GAP_PX;

      for (const node of pool) {
        node.pos += advance;
        node.el.style[prop] = `${node.pos}px`;
      }

      const last = pool[pool.length - 1];
      if (last.pos > vpSz) {
        const node     = pool.pop();
        node.itemIndex = ((pool[0].itemIndex - 1) + itemsRef.current.length) % itemsRef.current.length;
        node.pos       = pool[0].pos - iStride;
        const it       = itemsRef.current[node.itemIndex];
        node.el.src    = it.src;
        node.el.alt    = `media-${it.orderIndex}`;
        node.el.dataset.itemIndex = String(node.itemIndex);
        node.el.style[prop] = `${node.pos}px`;
        node.el.classList.toggle("carousel-img--selected", it.fileId === selectedFileIdRef.current);
        pool.unshift(node);
      }

      const first = pool[0];
      if (first.pos + iSize < 0) {
        const node     = pool.shift();
        node.itemIndex = (pool[pool.length - 1].itemIndex + 1) % itemsRef.current.length;
        node.pos       = pool[pool.length - 1].pos + iStride;
        const it       = itemsRef.current[node.itemIndex];
        node.el.src    = it.src;
        node.el.alt    = `media-${it.orderIndex}`;
        node.el.dataset.itemIndex = String(node.itemIndex);
        node.el.style[prop] = `${node.pos}px`;
        node.el.classList.toggle("carousel-img--selected", it.fileId === selectedFileIdRef.current);
        pool.push(node);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    buildRef.current();

    roRef.current = new ResizeObserver(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const hasSize = vp.offsetWidth > 0 || vp.offsetHeight > 0;
      if (!hasSize) return;
      if (itemsRef.current.length >= 2 && !loading) {
        buildRef.current();
      }
    });

    roRef.current.observe(viewport);

    return () => {
      roRef.current?.disconnect();
      runningRef.current = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const sig = items.map(it => it.fileId).join(",");
    if (sig === itemsSigRef.current) return;
    itemsSigRef.current = sig;
    buildRef.current();
  }, [items]);

  useEffect(() => {
    buildRef.current();
  }, [loading]);

  useEffect(() => {
    const handler = () => buildRef.current();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <section className="carousel-section">
      <div ref={viewportRef} className="carousel-viewport carousel-viewport--static" />
    </section>
  );
};

export default ApplicationModalCarousel;