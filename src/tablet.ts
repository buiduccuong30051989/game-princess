// Chơi trên máy tính bảng: chặn mọi cử chỉ trình duyệt làm bé "rơi" khỏi game (phóng to 2 ngón / chạm đúp, kéo trang,
// kéo để tải lại, giữ lâu hiện menu / chọn chữ). CSS (index.html) lo phần còn lại: touch-action, user-select, overscroll.
export function installTabletGuards(): void {
  const stop = (e: Event) => { if (e.cancelable) e.preventDefault(); };
  const scrollable = (t: EventTarget | null) => t instanceof Element && !!t.closest('#debug');
  // Safari iPad: pinch zoom vẫn chạy dù có user-scalable=no → chặn gesture*
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
  // kéo trang / kéo để tải lại / bật nảy (overscroll)
  document.addEventListener('touchmove', (e) => { if (!scrollable(e.target)) stop(e); }, { passive: false });
  // 2 ngón trở lên = phóng to → chặn
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) stop(e); }, { passive: false });
  // chạm đúp phóng to (Safari cũ bỏ qua touch-action trên vài phần tử)
  document.addEventListener('dblclick', stop, { passive: false });
  // giữ lâu: menu ngữ cảnh / kính lúp chọn chữ / kéo ảnh
  document.addEventListener('contextmenu', stop);
  document.addEventListener('selectstart', (e) => { if (!scrollable(e.target)) stop(e); });
  document.addEventListener('dragstart', stop);
}
