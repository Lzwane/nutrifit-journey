import { Play } from "lucide-react";

export function YouTubePlayer({
  url,
  title = "Exercise Demonstration",
  isShort = false,
}: {
  url?: string;
  title?: string;
  isShort?: boolean;
}) {
  if (!url) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center text-muted-foreground p-6">
        <Play className="h-8 w-8 text-primary opacity-60 mb-2" />
        <span className="text-xs font-bold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground">No video link attached</span>
      </div>
    );
  }

  // Extract 11-character YouTube ID from watch, shorts, or short-links
  const extractYouTubeId = (link: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
        Invalid YouTube URL format.
      </div>
    );
  }

  // Key parameters:
  // - youtube-nocookie.com: Privacy-enhanced mode
  // - playsinline=1: Plays directly on page on iOS without taking over the screen
  // - rel=0: Limits recommended videos after playback
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-border bg-black shadow-sm mx-auto ${
        isShort ? "aspect-[9/16] max-w-xs" : "aspect-video"
      }`}
    >
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}