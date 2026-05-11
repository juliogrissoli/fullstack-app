export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#D4AF37] animate-spin" />
        </div>
        <p className="text-[#D4AF37] text-sm font-medium tracking-widest uppercase animate-pulse">
          Anjoimob
        </p>
      </div>
    </div>
  );
}
