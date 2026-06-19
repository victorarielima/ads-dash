'use client';

import React, { useEffect, useRef } from 'react';

interface ResizableTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Envolve uma <table> renderizada no servidor e adiciona alças de
 * redimensionamento (arrastar) na borda direita de cada cabeçalho de coluna.
 * O usuário pode aumentar/diminuir a largura de qualquer coluna; a tabela
 * cresce e o container faz scroll horizontal quando necessário.
 */
export function ResizableTable({ children, className }: ResizableTableProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const table = wrap.querySelector('table');
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
    const cleanups: Array<() => void> = [];

    ths.forEach((th) => {
      // Garante posicionamento relativo para a alça absoluta
      if (getComputedStyle(th).position === 'static') {
        th.style.position = 'relative';
      }

      const handle = document.createElement('div');
      handle.style.cssText =
        'position:absolute;top:0;right:0;height:100%;width:10px;cursor:col-resize;touch-action:none;z-index:20;user-select:none;';

      let dragging = false;
      let startX = 0;
      let startW = 0;
      const colIdx = ths.indexOf(th);

      const onMove = (e: PointerEvent) => {
        const newW = Math.max(48, startW + (e.clientX - startX));
        const px = `${newW}px`;
        th.style.width = px;
        th.style.minWidth = px;
        th.style.maxWidth = px;
        // Propaga a largura para as células do corpo desta coluna, para que
        // o conteúdo truncado (ex.: nome) acompanhe e revele mais texto.
        if (colIdx >= 0) {
          table.querySelectorAll('tbody tr').forEach((tr) => {
            if (tr.children.length !== ths.length) return; // ignora linhas com colSpan
            const cell = tr.children[colIdx] as HTMLElement | undefined;
            if (cell) {
              cell.style.width = px;
              cell.style.minWidth = px;
              cell.style.maxWidth = px;
            }
          });
        }
      };

      const onUp = () => {
        dragging = false;
        handle.style.background = '';
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        startX = e.clientX;
        startW = th.offsetWidth;
        handle.style.background = 'rgba(255,255,255,0.5)';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };

      const onEnter = () => {
        if (!dragging) handle.style.background = 'rgba(255,255,255,0.3)';
      };
      const onLeave = () => {
        if (!dragging) handle.style.background = '';
      };

      handle.addEventListener('pointerdown', onDown);
      handle.addEventListener('pointerenter', onEnter);
      handle.addEventListener('pointerleave', onLeave);
      th.appendChild(handle);

      cleanups.push(() => {
        handle.removeEventListener('pointerdown', onDown);
        handle.removeEventListener('pointerenter', onEnter);
        handle.removeEventListener('pointerleave', onLeave);
        handle.remove();
      });
    });

    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      {children}
    </div>
  );
}
