export function TopNav() {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-[#DCE3EC]">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl font-bold tracking-tight text-[#1D2733] font-display whitespace-nowrap shrink-0">
            E2C
          </span>
          <span className="text-sm font-medium text-[#4B5B6B] truncate">
            Video
          </span>
        </div>
      </div>
    </header>
  );
}
