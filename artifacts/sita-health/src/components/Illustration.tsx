import { Flower2, Heart, Leaf, Sparkles } from 'lucide-react';

export function BotanicalMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-9 w-9', md: 'h-14 w-14', lg: 'h-20 w-20' };
  return (
    <div className={`${sizes[size]} relative grid place-items-center rounded-[42%] bg-[#f9dce7] text-[#c96588]`}>
      <Flower2 className={size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'} strokeWidth={1.4} />
      <Leaf className="absolute -right-1 bottom-1 h-4 w-4 rotate-[-18deg] text-[#7eaa8d]" strokeWidth={1.5} />
    </div>
  );
}

export function SitaAvatar({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'h-9 w-9' : 'h-11 w-11'} relative grid place-items-center rounded-full bg-[#eadff5] text-[#826eaa]`}>
      <Sparkles className={small ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.6} />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#8bb292]" />
    </div>
  );
}

export function WellnessIllustration({ type = 'woman' }: { type?: 'woman' | 'pregnancy' | 'postpartum' }) {
  if (type === 'pregnancy') return (
    <div className="relative h-32 w-full overflow-hidden rounded-[1.5rem] bg-[#eee7f8]">
      <div className="absolute right-8 top-5 h-24 w-20 rounded-[55%_45%_48%_52%] bg-[#e9b98d] opacity-75" />
      <div className="absolute right-12 top-9 h-16 w-12 rounded-[52%_48%_55%_45%] border-[5px] border-[#d79575] bg-[#f4ca9e]" />
      <div className="absolute bottom-0 left-0 h-16 w-40 rounded-full bg-[#d5c3eb] opacity-75" />
      <Sparkles className="absolute left-6 top-6 h-5 w-5 text-[#a690c4]" />
      <Heart className="absolute bottom-6 left-16 h-5 w-5 text-[#cd7191]" />
    </div>
  );
  return (
    <div className="relative h-32 w-full overflow-hidden rounded-[1.5rem] bg-[#f9dfe8]">
      <div className="absolute -right-2 -top-8 h-40 w-32 rounded-full bg-[#eec2d4] opacity-80" />
      <div className="absolute left-1/2 top-7 h-16 w-16 -translate-x-1/2 rounded-full bg-[#e6a881]" />
      <div className="absolute left-1/2 top-12 h-24 w-28 -translate-x-1/2 rounded-[45%_45%_25%_25%] bg-[#96678a]" />
      <div className="absolute bottom-1 left-1/2 h-12 w-44 -translate-x-1/2 rounded-[50%_50%_0_0] bg-[#f2a9bd]" />
      <Leaf className="absolute bottom-5 left-6 h-9 w-9 rotate-[-25deg] text-[#81a58b]" strokeWidth={1.4} />
      <Leaf className="absolute bottom-8 right-7 h-8 w-8 rotate-[22deg] text-[#81a58b]" strokeWidth={1.4} />
    </div>
  );
}
